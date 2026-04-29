const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.warn('Development mode: Server will run without database connection.');
    console.warn('To fix: Add your IP to MongoDB Atlas whitelist at https://cloud.mongodb.com/');
  }
};

module.exports = connectDB;
