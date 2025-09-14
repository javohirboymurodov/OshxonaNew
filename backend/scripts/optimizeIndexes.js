/**
 * Database Index Optimization
 * MongoDB index'larini optimizatsiya qilish
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Models import
const { User, Product, Order, Cart, Branch, Category } = require('../models');

/**
 * Index'larni yaratish va optimizatsiya qilish
 */
async function optimizeIndexes() {
  try {
    console.log('🚀 Database index optimization started...\n');

    // MongoDB connection
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ===============================
    // USER INDEXES
    // ===============================
    console.log('📊 Optimizing User indexes...');
    
    await User.collection.createIndex({ telegramId: 1 }, { unique: true });
    console.log('✅ User.telegramId index created');
    
    await User.collection.createIndex({ role: 1 });
    console.log('✅ User.role index created');
    
    await User.collection.createIndex({ branch: 1 });
    console.log('✅ User.branch index created');
    
    await User.collection.createIndex({ isActive: 1 });
    console.log('✅ User.isActive index created');
    
    await User.collection.createIndex({ 
      role: 1, 
      'courierInfo.isOnline': 1, 
      'courierInfo.isAvailable': 1 
    });
    console.log('✅ User.courier status compound index created');
    
    await User.collection.createIndex({ 
      'courierInfo.currentLocation': '2dsphere' 
    });
    console.log('✅ User.location geospatial index created');

    // ===============================
    // PRODUCT INDEXES
    // ===============================
    console.log('\n📊 Optimizing Product indexes...');
    
    await Product.collection.createIndex({ isActive: 1 });
    console.log('✅ Product.isActive index created');
    
    await Product.collection.createIndex({ categoryId: 1 });
    console.log('✅ Product.categoryId index created');
    
    await Product.collection.createIndex({ 
      isActive: 1, 
      categoryId: 1 
    });
    console.log('✅ Product.active category compound index created');
    
    await Product.collection.createIndex({ 
      name: 'text', 
      description: 'text' 
    });
    console.log('✅ Product.text search index created');
    
    await Product.collection.createIndex({ price: 1 });
    console.log('✅ Product.price index created');

    // ===============================
    // ORDER INDEXES
    // ===============================
    console.log('\n📊 Optimizing Order indexes...');
    
    await Order.collection.createIndex({ orderId: 1 }, { unique: true });
    console.log('✅ Order.orderId unique index created');
    
    await Order.collection.createIndex({ user: 1 });
    console.log('✅ Order.user index created');
    
    await Order.collection.createIndex({ branch: 1 });
    console.log('✅ Order.branch index created');
    
    await Order.collection.createIndex({ status: 1 });
    console.log('✅ Order.status index created');
    
    await Order.collection.createIndex({ createdAt: -1 });
    console.log('✅ Order.createdAt index created');
    
    await Order.collection.createIndex({ 
      branch: 1, 
      status: 1, 
      createdAt: -1 
    });
    console.log('✅ Order.branch status compound index created');
    
    await Order.collection.createIndex({ 
      'deliveryInfo.courier': 1 
    });
    console.log('✅ Order.courier index created');
    
    await Order.collection.createIndex({ 
      'deliveryInfo.location': '2dsphere' 
    });
    console.log('✅ Order.delivery location geospatial index created');

    // ===============================
    // CART INDEXES
    // ===============================
    console.log('\n📊 Optimizing Cart indexes...');
    
    await Cart.collection.createIndex({ user: 1, isActive: 1 });
    console.log('✅ Cart.user active compound index created');
    
    await Cart.collection.createIndex({ createdAt: -1 });
    console.log('✅ Cart.createdAt index created');

    // ===============================
    // BRANCH INDEXES
    // ===============================
    console.log('\n📊 Optimizing Branch indexes...');
    
    await Branch.collection.createIndex({ isActive: 1 });
    console.log('✅ Branch.isActive index created');
    
    await Branch.collection.createIndex({ 
      'address.coordinates': '2dsphere' 
    });
    console.log('✅ Branch.coordinates geospatial index created');

    // ===============================
    // CATEGORY INDEXES
    // ===============================
    console.log('\n📊 Optimizing Category indexes...');
    
    await Category.collection.createIndex({ branch: 1, isActive: 1 });
    console.log('✅ Category.branch active compound index created');
    
    await Category.collection.createIndex({ name: 1 });
    console.log('✅ Category.name index created');

    // ===============================
    // INDEX STATISTICS
    // ===============================
    console.log('\n📊 Index Statistics:');
    
    const collections = ['users', 'products', 'orders', 'carts', 'branches', 'categories'];
    
    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        const indexes = await collection.indexes();
        console.log(`✅ ${collectionName}: ${indexes.length} indexes`);
      } catch (error) {
        console.log(`❌ ${collectionName}: Error getting indexes`);
      }
    }

    // ===============================
    // PERFORMANCE RECOMMENDATIONS
    // ===============================
    console.log('\n💡 Performance Recommendations:');
    console.log('1. ✅ All critical indexes created');
    console.log('2. ✅ Geospatial indexes for location queries');
    console.log('3. ✅ Text search indexes for product search');
    console.log('4. ✅ Compound indexes for complex queries');
    console.log('5. ✅ Unique indexes for data integrity');
    
    console.log('\n🚀 Database optimization completed successfully!');

  } catch (error) {
    console.error('❌ Database optimization error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
  }
}

// Run optimization
if (require.main === module) {
  optimizeIndexes().catch(console.error);
}

module.exports = { optimizeIndexes };