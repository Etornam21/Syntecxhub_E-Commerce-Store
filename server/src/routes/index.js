const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, restrictTo } = require('../middleware/auth');
const auth = require('../controllers/authController');
const products = require('../controllers/productController');
const cart = require('../controllers/cartController');
const orders = require('../controllers/orderController');

const mongoId = (name) => param(name).isMongoId().withMessage('Invalid id.');
const admin = [protect, restrictTo('admin')];

// ---- auth ----
router.post(
  '/auth/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 80 }),
    body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  ],
  validate,
  auth.register
);
router.post(
  '/auth/login',
  [body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(), body('password').notEmpty().withMessage('Password is required.')],
  validate,
  auth.login
);
router.get('/auth/me', protect, auth.me);

// ---- products ----
const productRules = (optional = false) => {
  const rule = (chain) => (optional ? chain.optional() : chain);
  return [
    rule(body('name').trim().notEmpty().withMessage('Product name is required.')),
    rule(body('price').isFloat({ min: 0 }).withMessage('Price must be 0 or more.')),
    rule(body('category').trim().notEmpty().withMessage('Category is required.')),
    rule(body('stock').isInt({ min: 0 }).withMessage('Stock must be a whole number, 0 or more.')),
    body('image').optional({ values: 'falsy' }).isURL({ require_tld: false }).withMessage('Image must be a valid URL.'),
  ];
};
router.get('/products', products.list);
router.get('/products/categories', products.categories);
router.get('/products/admin/all', admin, products.listAdmin);
router.get('/products/:id', [mongoId('id')], validate, products.get);
router.post('/products', admin, productRules(), validate, products.create);
router.put('/products/:id', admin, [mongoId('id'), ...productRules(true)], validate, products.update);
router.delete('/products/:id', admin, [mongoId('id')], validate, products.remove);

// ---- cart ----
router.use('/cart', protect);
router.get('/cart', cart.get);
router.post(
  '/cart/items',
  [body('productId').isMongoId().withMessage('Invalid product.'), body('quantity').optional().isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99.')],
  validate,
  cart.add
);
router.patch('/cart/items/:productId', [mongoId('productId'), body('quantity').isInt({ min: 0, max: 99 }).withMessage('Quantity must be between 0 and 99.')], validate, cart.update);
router.delete('/cart/items/:productId', [mongoId('productId')], validate, cart.remove);
router.delete('/cart', cart.clear);

// ---- orders ----
router.post(
  '/orders',
  protect,
  [
    body('shippingAddress.fullName').trim().notEmpty().withMessage('Full name is required.'),
    body('shippingAddress.phone').trim().matches(/^[+\d][\d\s-]{6,17}$/).withMessage('Enter a valid phone number.'),
    body('shippingAddress.address').trim().notEmpty().withMessage('Delivery address is required.'),
    body('shippingAddress.city').trim().notEmpty().withMessage('City is required.'),
    body('shippingAddress.region').optional().trim(),
    body('paymentMethod').isIn(['card', 'momo', 'cod']).withMessage('Choose a payment method.'),
  ],
  validate,
  orders.checkout
);
router.get('/orders/mine', protect, orders.mine);
router.get('/orders/admin/stats', admin, orders.stats);
router.get('/orders/admin/all', admin, orders.listAll);
router.patch('/orders/:id/status', admin, [mongoId('id'), body('status').isIn(['paid', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status.')], validate, orders.updateStatus);
router.get('/orders/:id', protect, [mongoId('id')], validate, orders.get);
router.post('/orders/:id/pay', protect, [mongoId('id')], validate, orders.pay);
router.post('/orders/:id/cancel', protect, [mongoId('id')], validate, orders.cancel);

module.exports = router;
