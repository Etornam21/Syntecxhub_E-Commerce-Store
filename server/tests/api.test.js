// Integration tests. They need a running MongoDB (see README) and use a throwaway database.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');

const URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/syntecxhub_store_test';
let server, base, adminToken, userToken, userToken2, product, scarce;

const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};
const ship = { fullName: 'Ama Mensah', phone: '0244000000', address: '12 Ring Road', city: 'Accra' };

before(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
  await User.create({ name: 'Admin', email: 'admin@test.com', password: 'Admin@12345', role: 'admin' });
  adminToken = (await call('POST', '/auth/login', { body: { email: 'admin@test.com', password: 'Admin@12345' } })).data.token;
});
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

test('register ignores role escalation and validates input', async () => {
  const bad = await call('POST', '/auth/register', { body: { name: 'X', email: 'nope', password: 'short' } });
  assert.equal(bad.status, 422);
  const ok = await call('POST', '/auth/register', { body: { name: 'Ama', email: 'ama@test.com', password: 'Password1', role: 'admin' } });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.user.role, 'user');
  assert.equal(ok.data.user.password, undefined);
  userToken = ok.data.token;
  userToken2 = (await call('POST', '/auth/register', { body: { name: 'Kofi', email: 'kofi@test.com', password: 'Password1' } })).data.token;
  const dup = await call('POST', '/auth/register', { body: { name: 'Ama', email: 'ama@test.com', password: 'Password1' } });
  assert.equal(dup.status, 409);
});

test('login rejects wrong password; protected routes need a token', async () => {
  assert.equal((await call('POST', '/auth/login', { body: { email: 'ama@test.com', password: 'wrongpass1' } })).status, 401);
  assert.equal((await call('GET', '/auth/me')).status, 401);
  assert.equal((await call('GET', '/auth/me', { token: userToken })).data.user.email, 'ama@test.com');
});

test('only admins can manage products', async () => {
  const body = { name: 'Test Mug', price: 40, category: 'Home', stock: 5 };
  assert.equal((await call('POST', '/products', { body })).status, 401);
  assert.equal((await call('POST', '/products', { token: userToken, body })).status, 403);
  const created = await call('POST', '/products', { token: adminToken, body });
  assert.equal(created.status, 201);
  product = created.data.product;
  scarce = (await call('POST', '/products', { token: adminToken, body: { name: 'Last One', price: 10, category: 'Home', stock: 1 } })).data.product;
  assert.equal((await call('POST', '/products', { token: adminToken, body: { ...body, price: -1 } })).status, 422);
  const upd = await call('PUT', `/products/${product._id}`, { token: adminToken, body: { price: 50 } });
  assert.equal(upd.data.product.price, 50);
});

test('product list supports search, filter, sort and pagination', async () => {
  const r = await call('GET', '/products?q=mug&category=Home&sort=price_asc&limit=5');
  assert.equal(r.status, 200);
  assert.equal(r.data.items.length, 1);
  assert.equal((await call('GET', '/products?limit=1')).data.pages, 2);
  assert.equal((await call('GET', '/products/categories')).data.categories[0], 'Home');
});

test('cart enforces stock and uses server-side prices', async () => {
  assert.equal((await call('GET', '/cart')).status, 401);
  const add = await call('POST', '/cart/items', { token: userToken, body: { productId: product._id, quantity: 2 } });
  assert.equal(add.status, 201);
  assert.equal(add.data.subtotal, 100);
  assert.equal((await call('POST', '/cart/items', { token: userToken, body: { productId: product._id, quantity: 4 } })).status, 409);
  const upd = await call('PATCH', `/cart/items/${product._id}`, { token: userToken, body: { quantity: 3 } });
  assert.equal(upd.data.count, 3);
  const rm = await call('PATCH', `/cart/items/${product._id}`, { token: userToken, body: { quantity: 0 } });
  assert.equal(rm.data.items.length, 0);
  await call('POST', '/cart/items', { token: userToken, body: { productId: product._id, quantity: 2 } });
});

test('checkout snapshots prices, decrements stock, empties cart', async () => {
  assert.equal((await call('POST', '/orders', { token: userToken, body: { shippingAddress: { ...ship, phone: 'abc' }, paymentMethod: 'card' } })).status, 422);
  const r = await call('POST', '/orders', { token: userToken, body: { shippingAddress: ship, paymentMethod: 'card' } });
  assert.equal(r.status, 201);
  const o = r.data.order;
  assert.equal(o.itemsTotal, 100);
  assert.equal(o.shippingFee, 20);
  assert.equal(o.total, 120);
  assert.equal(o.status, 'pending');
  assert.equal((await call('GET', `/products/${product._id}`)).data.product.stock, 3);
  assert.equal((await call('GET', '/cart', { token: userToken })).data.items.length, 0);
  // a price change must not touch the existing order
  await call('PUT', `/products/${product._id}`, { token: adminToken, body: { price: 999 } });
  assert.equal((await call('GET', `/orders/${o._id}`, { token: userToken })).data.order.items[0].price, 50);
  await call('PUT', `/products/${product._id}`, { token: adminToken, body: { price: 50 } });
  product.orderId = o._id;
  assert.equal((await call('GET', `/orders/${o._id}`, { token: userToken2 })).status, 404, 'other users cannot read it');
  assert.equal((await call('GET', `/orders/${o._id}`, { token: adminToken })).status, 200);
});

test('two buyers cannot both take the last item', async () => {
  await call('POST', '/cart/items', { token: userToken, body: { productId: scarce._id, quantity: 1 } });
  await call('POST', '/cart/items', { token: userToken2, body: { productId: scarce._id, quantity: 1 } });
  const [a, b] = await Promise.all([
    call('POST', '/orders', { token: userToken, body: { shippingAddress: ship, paymentMethod: 'cod' } }),
    call('POST', '/orders', { token: userToken2, body: { shippingAddress: ship, paymentMethod: 'cod' } }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  assert.equal((await call('GET', `/products/${scarce._id}`)).data.product.stock, 0);
});

test('pay, cancel, and admin status flow', async () => {
  const id = product.orderId;
  assert.equal((await call('POST', `/orders/${id}/pay`, { token: userToken2 })).status, 404);
  const paid = await call('POST', `/orders/${id}/pay`, { token: userToken });
  assert.equal(paid.data.order.status, 'paid');
  assert.equal((await call('POST', `/orders/${id}/cancel`, { token: userToken })).status, 400);
  assert.equal((await call('PATCH', `/orders/${id}/status`, { token: userToken, body: { status: 'shipped' } })).status, 403);
  assert.equal((await call('PATCH', `/orders/${id}/status`, { token: adminToken, body: { status: 'delivered' } })).status, 400, 'cannot skip shipped');
  assert.equal((await call('PATCH', `/orders/${id}/status`, { token: adminToken, body: { status: 'shipped' } })).data.order.status, 'shipped');
  assert.equal((await call('PATCH', `/orders/${id}/status`, { token: adminToken, body: { status: 'delivered' } })).data.order.status, 'delivered');
});

test('cancelling a pending order restocks it; stats work', async () => {
  await call('POST', '/cart/items', { token: userToken, body: { productId: product._id, quantity: 1 } });
  const o = (await call('POST', '/orders', { token: userToken, body: { shippingAddress: ship, paymentMethod: 'momo' } })).data.order;
  assert.equal((await call('GET', `/products/${product._id}`)).data.product.stock, 2);
  assert.equal((await call('POST', `/orders/${o._id}/cancel`, { token: userToken })).data.order.status, 'cancelled');
  assert.equal((await call('GET', `/products/${product._id}`)).data.product.stock, 3);
  const stats = await call('GET', '/orders/admin/stats', { token: adminToken });
  assert.equal(stats.status, 200);
  assert.equal(stats.data.revenue, 120);
  assert.equal(stats.data.customers, 2);
  assert.equal((await call('GET', '/orders/admin/stats', { token: userToken })).status, 403);
});

test('deleting a product removes it from carts and keeps old orders', async () => {
  await call('POST', '/cart/items', { token: userToken2, body: { productId: product._id, quantity: 1 } });
  assert.equal((await call('DELETE', `/products/${product._id}`, { token: adminToken })).status, 200);
  assert.equal((await call('GET', '/cart', { token: userToken2 })).data.items.length, 0);
  assert.equal((await call('GET', `/orders/${product.orderId}`, { token: userToken })).data.order.items[0].name, 'Test Mug');
});
