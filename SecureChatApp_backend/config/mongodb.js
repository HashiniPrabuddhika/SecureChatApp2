const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('📡 Attempting to connect to MongoDB...');
    // console.log('🔐 Using connection string:', process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:');
    console.error('📛 Error Message:', err.message);
    console.error('📄 Full Error Stack:', err.stack);

    process.exit(1); // Stop the server if DB fails to connect
  }
};

module.exports = connectDB;
