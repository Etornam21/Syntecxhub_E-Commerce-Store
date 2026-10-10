require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const { PORT = 5000, MONGO_URI, JWT_SECRET } = process.env;
if (!MONGO_URI || !JWT_SECRET) {
  console.error('MONGO_URI and JWT_SECRET must be set. Copy .env.example to .env.');
  process.exit(1);
}

connectDB(MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`API listening on port ${PORT}`)))
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
