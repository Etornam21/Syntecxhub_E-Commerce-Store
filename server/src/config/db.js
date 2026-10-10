const dns = require('dns');
const mongoose = require('mongoose');

// Some networks block SRV lookups from Node's default resolver (querySrv ECONNREFUSED).
// Using public DNS for the lookup works around that.
dns.setServers(['8.8.8.8', '1.1.1.1']);

module.exports = async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};