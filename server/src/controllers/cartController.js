const Cart = require('../models/Cart');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { SHIPPING_FEE, FREE_SHIPPING_FROM } = require('../config/shop');

// Builds the cart the client sees. Prices always come from the database, never from the client.
async function present(userId) {
  const cart = await Cart.findOne({ user: userId }).populate('items.product');
  const items = [];
  let dirty = false;

  for (const line of cart?.items || []) {
    const p = line.product;
    if (!p || !p.active || p.stock < 1) {
      dirty = true; // product was removed, hidden, or sold out
      continue;
    }
    const quantity = Math.min(line.quantity, p.stock);
    if (quantity !== line.quantity) {
      line.quantity = quantity;
      dirty = true;
    }
    items.push({ product: p, quantity, lineTotal: +(p.price * quantity).toFixed(2) });
  }
  if (cart && dirty) {
    cart.items = items.map((i) => ({ product: i.product._id, quantity: i.quantity }));
    await cart.save();
  }
  const subtotal = +items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const shippingFee = !items.length || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  return { items, subtotal, count, shippingFee, total: +(subtotal + shippingFee).toFixed(2), freeShippingFrom: FREE_SHIPPING_FROM };
}
exports.present = present;

exports.get = asyncHandler(async (req, res) => res.json(await present(req.user._id)));

exports.add = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const quantity = Number(req.body.quantity) || 1;
  const product = await Product.findById(productId);
  if (!product || !product.active) throw new AppError('Product not found.', 404);

  const cart = (await Cart.findOne({ user: req.user._id })) || new Cart({ user: req.user._id, items: [] });
  const line = cart.items.find((i) => String(i.product) === String(product._id));
  const wanted = (line?.quantity || 0) + quantity;
  if (wanted > product.stock) {
    throw new AppError(product.stock ? `Only ${product.stock} left in stock.` : 'This item is sold out.', 409);
  }
  if (line) line.quantity = wanted;
  else cart.items.push({ product: product._id, quantity });
  await cart.save();
  res.status(201).json(await present(req.user._id));
});

exports.update = asyncHandler(async (req, res) => {
  const quantity = Number(req.body.quantity);
  const cart = await Cart.findOne({ user: req.user._id });
  const line = cart?.items.find((i) => String(i.product) === req.params.productId);
  if (!line) throw new AppError('That item is not in your cart.', 404);

  if (quantity < 1) {
    cart.items = cart.items.filter((i) => i !== line);
  } else {
    const product = await Product.findById(req.params.productId);
    if (!product || quantity > product.stock) {
      throw new AppError(`Only ${product?.stock || 0} left in stock.`, 409);
    }
    line.quantity = quantity;
  }
  await cart.save();
  res.json(await present(req.user._id));
});

exports.remove = asyncHandler(async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $pull: { items: { product: req.params.productId } } });
  res.json(await present(req.user._id));
});

exports.clear = asyncHandler(async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
  res.json(await present(req.user._id));
});
