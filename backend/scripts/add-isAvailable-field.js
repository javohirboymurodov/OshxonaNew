const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oshxona', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Product = require('../models/Product');

async function addIsAvailableField() {
  try {
    console.log('🔄 Adding isAvailable field to all products...');
    
    // Update all products to have isAvailable: true by default
    const result = await Product.updateMany(
      { isAvailable: { $exists: false } }, // Only update products without isAvailable field
      { $set: { isAvailable: true } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} products`);
    
    // Check total count
    const totalProducts = await Product.countDocuments();
    const availableProducts = await Product.countDocuments({ isAvailable: true });
    
    console.log(`📊 Total products: ${totalProducts}`);
    console.log(`📊 Available products: ${availableProducts}`);
    
    mongoose.connection.close();
    console.log('✅ Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

addIsAvailableField();