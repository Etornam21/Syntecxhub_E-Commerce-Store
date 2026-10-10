const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { present } = require('./cartController');

const { SHIPPING_FEE, FREE_SHIPPING_FROM } = require('../config/shop');

// What an admin may move an order to next.
const TRANSITIONS = {
  pending: ['paid', 'shipped', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const restock = (order) =>
  Promise.all(order.items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity } })));

exports.checkout = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod } = req.body;
  const rawCart = await Cart.findOne({ user: req.user._id });
  const cart = await present(req.user._id);
  if (!cart.items.length) {
    if (rawCart?.items.length) throw new AppError('The items in your cart just sold out or were removed.', 409);
    throw new AppError('Your cart is empty.', 400);
  }
  if (cart.items.length < (rawCart?.items.length || 0)) {
    throw new AppError('Some items in your cart sold out and were removed. Review your cart and try again.', 409);
  }

  // Reserve stock with a conditional update so two buyers can never take the same last item.
  const reserved = [];
  try {
    for (const { product, quantity } of cart.items) {
      const result = await Product.updateOne({ _id: product._id, active: true, stock: { $gte: quantity } }, { $inc: { stock: -quantity } });
      if (result.modifiedCount !== 1) throw new AppError(`Sorry, "${product.name}" just ran low on stock. Update your cart and try again.`, 409);
      reserved.push({ id: product._id, quantity });
    }
  } catch (err) {
    await Promise.all(reserved.map((r) => Product.updateOne({ _id: r.id }, { $inc: { stock: r.quantity } })));
    throw err;
  }

  const shippingFee = cart.subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  const order = await Order.create({
    user: req.user._id,
    items: cart.items.map(({ product, quantity }) => ({
      product: product._id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity,
    })),
    shippingAddress,
    paymentMethod,
    itemsTotal: cart.subtotal,
    shippingFee,
    total: +(cart.subtotal + shippingFee).toFixed(2),
  });
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
  res.status(201).json({ order });
});

exports.mine = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ orders });
});

exports.get = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  const ownerId = order && String(order.user._id || order.user);
  if (!order || (ownerId !== String(req.user._id) && req.user.role !== 'admin')) {
    throw new AppError('Order not found.', 404);
  }
  res.json({ order });
});

// Demo payment. Swap this body for a Paystack/Stripe verification call in production
// (verify the transaction reference with the provider, then mark the order paid).
exports.pay = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new AppError('Order not found.', 404);
  if (order.paymentMethod === 'cod') throw new AppError('This order is paid on delivery.', 400);
  if (order.status !== 'pending') throw new AppError('This order can no longer be paid.', 400);
  order.isPaid = true;
  order.paidAt = new Date();
  order.status = 'paid';
  await order.save();
  res.json({ order });
});

exports.cancel = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new AppError('Order not found.', 404);
  if (order.status !== 'pending') throw new AppError('Only orders that have not been paid or shipped can be cancelled.', 400);
  order.status = 'cancelled';
  await order.save();
  await restock(order);
  res.json({ order });
});

// ---- admin ----
exports.listAll = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const filter = req.query.status ? { status: String(req.query.status) } : {};
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name email'),
    Order.countDocuments(filter),
  ]);
  res.json({ orders, page, total, pages: Math.ceil(total / limit) });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) throw new AppError('Order not found.', 404);
  if (!TRANSITIONS[order.status].includes(status)) {
    throw new AppError(`An order that is ${order.status} cannot be changed to ${status}.`, 400);
  }
  if (status === 'paid' && order.paymentMethod === 'cod') throw new AppError('Cash-on-delivery orders are paid on delivery.', 400);
  if (status === 'shipped' && order.status === 'pending' && order.paymentMethod !== 'cod') {
    throw new AppError('Only cash-on-delivery orders can ship before payment.', 400);
  }

  if (status === 'paid' || (status === 'delivered' && !order.isPaid)) {
    order.isPaid = true;
    order.paidAt = new Date();
  }
  if (status === 'cancelled') await restock(order);
  order.status = status;
  await order.save();
  res.json({ order });
});

exports.stats = asyncHandler(async (_req, res) => {
  const [byStatus, revenueAgg, products, customers, lowStock, recent] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { isPaid: true } }, { $group: { _id: null, revenue: { $sum: '$total' } } }]),
    Product.countDocuments(),
    User.countDocuments({ role: 'user' }),
    Product.find({ stock: { $lte: 5 } }).sort({ stock: 1 }).limit(8),
    Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name'),
  ]);
  const statusCounts = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  res.json({
    revenue: revenueAgg[0]?.revenue || 0,
    orders: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    statusCounts,
    products,
    customers,
    lowStock,
    recent,
  });
});
