require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');

const products = [
  // Fashion
  { name: 'Kente-trim Tote Bag', category: 'Fashion', price: 145, stock: 24, featured: true, description: 'Heavy canvas tote with a hand-woven kente strip along the pocket. Fits a 15-inch laptop and a market run.' },
  { name: 'Ankara Print Shirt', category: 'Fashion', price: 210, stock: 15, featured: true, description: 'Short-sleeve, button-up shirt in a bold wax print. Cut slim, 100% cotton, made by tailors in Accra.' },
  { name: 'Leather Slides', category: 'Fashion', price: 180, stock: 20, description: 'Vegetable-tanned leather with a cushioned insole. Breaks in fast and lasts for years.' },
  { name: 'Beaded Waist Beads Set', category: 'Fashion', price: 65, stock: 40, description: 'Three strands of glass beads on durable cord, adjustable length.' },
  // Home
  { name: 'Bolga Market Basket', category: 'Home', price: 120, stock: 30, featured: true, description: 'Hand-woven elephant grass basket from the Bolgatanga region, with leather handles.' },
  { name: 'Adinkra Print Cushion Cover', category: 'Home', price: 85, stock: 3, description: 'Cotton cushion cover stamped with the Gye Nyame symbol. 45 x 45 cm. Insert not included.' },
  { name: 'Hand-turned Wooden Bowl', category: 'Home', price: 95, stock: 12, description: 'Carved from a single piece of sustainably sourced wood. Food-safe finish.' },
  { name: 'Soy Candle, Lemongrass', category: 'Home', price: 70, stock: 50, description: 'Slow-burning 220 g soy candle in a reusable jar. About 40 hours of burn time.' },
  // Beauty
  { name: 'Raw Shea Butter, 500 g', category: 'Beauty', price: 75, stock: 60, featured: true, description: 'Unrefined shea butter from northern Ghana. For skin, hair and lips.' },
  { name: 'African Black Soap, 3-pack', category: 'Beauty', price: 45, stock: 80, description: 'Traditional black soap made with plantain skin, cocoa pod and palm oil. Gentle daily cleanser.' },
  { name: 'Coconut & Moringa Hair Oil', category: 'Beauty', price: 58, stock: 35, description: 'Cold-pressed coconut oil infused with moringa. 250 ml.' },
  // Tech
  { name: 'Braided USB-C Cable, 2 m', category: 'Tech', price: 55, stock: 100, description: 'Fast-charge cable rated to 100 W with a braided jacket.' },
  { name: '20,000 mAh Power Bank', category: 'Tech', price: 320, stock: 18, featured: true, description: 'Two USB-C and one USB-A port. Keeps a phone alive through a long dumsor night.' },
  { name: 'Laptop Sleeve, 14"', category: 'Tech', price: 130, stock: 0, description: 'Water-resistant sleeve with a soft lining and a front pocket.' },
  // Food & Drink
  { name: 'Ghanaian Cocoa Powder, 400 g', category: 'Food & Drink', price: 52, stock: 45, description: 'Unsweetened, single-origin cocoa powder for baking and hot chocolate.' },
  { name: 'Hibiscus (Sobolo) Mix', category: 'Food & Drink', price: 38, stock: 70, description: 'Dried hibiscus with ginger and cloves. Steep, sweeten, chill.' },
];

(async () => {
  await connectDB(process.env.MONGO_URI);

  const email = process.env.ADMIN_EMAIL || 'admin@sankofa.test';
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
  if (!(await User.findOne({ email }))) {
    await User.create({ name: 'Store Admin', email, password, role: 'admin' });
    console.log(`Created admin: ${email}`);
  } else {
    console.log(`Admin already exists: ${email}`);
  }

  if ((await Product.countDocuments()) === 0 || process.argv.includes('--reset')) {
    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log(`Inserted ${products.length} products`);
  } else {
    console.log('Products already exist. Use `npm run seed -- --reset` to replace them.');
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
