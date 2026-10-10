const Product = require('../models/Product');
const Cart = require('../models/Cart');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  name: { name: 1 },
};
const FIELDS = ['name', 'description', 'price', 'category', 'image', 'stock', 'featured', 'active'];
const pick = (body) => Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

const buildList = (adminView) =>
  asyncHandler(async (req, res) => {
    const { q, category, minPrice, maxPrice, featured, sort = 'newest' } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 100);

    const filter = adminView ? {} : { active: true };
    if (q) {
      const rx = new RegExp(escapeRegex(String(q).slice(0, 60)), 'i');
      filter.$or = [{ name: rx }, { description: rx }];
    }
    if (category) filter.category = String(category);
    if (featured === 'true') filter.featured = true;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort(SORTS[sort] || SORTS.newest)
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
  });

exports.list = buildList(false);
exports.listAdmin = buildList(true);

exports.categories = asyncHandler(async (_req, res) => {
  const categories = await Product.distinct('category', { active: true });
  res.json({ categories: categories.sort() });
});

exports.get = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product || (!product.active && req.user?.role !== 'admin')) throw new AppError('Product not found.', 404);
  res.json({ product });
});

exports.create = asyncHandler(async (req, res) => {
  const product = await Product.create(pick(req.body));
  res.status(201).json({ product });
});

exports.update = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, pick(req.body), {
    new: true,
    runValidators: true,
  });
  if (!product) throw new AppError('Product not found.', 404);
  res.json({ product });
});

exports.remove = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);
  // Old orders keep their own snapshot, so only live carts need cleaning.
  await Cart.updateMany({}, { $pull: { items: { product: product._id } } });
  res.json({ message: 'Product deleted.' });
});
