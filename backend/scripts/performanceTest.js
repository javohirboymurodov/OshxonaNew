/**
 * Performance Test Script
 * Bot va API performance muammolarini aniqlash
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function testPerformance() {
  console.log('🚀 Performance test boshlandi...\n');

  try {
    // Database connection test
    const dbStart = Date.now();
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oshxona');
    const dbTime = Date.now() - dbStart;
    console.log(`📊 Database connection: ${dbTime}ms`);

    const { User, Order, Product } = require('../models');

    // Test queries that are used frequently
    console.log('\n🔍 Testing frequent queries...');

    // 1. User lookup by telegramId (bot har update da)
    const userStart = Date.now();
    await User.findOne({ telegramId: 123456789 }).lean();
    const userTime = Date.now() - userStart;
    console.log(`👤 User lookup: ${userTime}ms`);

    // 2. Orders list query (admin panel)
    const ordersStart = Date.now();
    await Order.find({ status: 'pending' })
      .populate('user', 'firstName lastName phone')
      .populate('deliveryInfo.courier', 'firstName lastName phone')
      .lean()
      .limit(15)
      .sort({ createdAt: -1 });
    const ordersTime = Date.now() - ordersStart;
    console.log(`📦 Orders query: ${ordersTime}ms`);

    // 3. Products query (bot catalog)
    const productsStart = Date.now();
    await Product.find({ isActive: true })
      .populate('categoryId', 'name')
      .lean()
      .limit(20);
    const productsTime = Date.now() - productsStart;
    console.log(`🍽️ Products query: ${productsTime}ms`);

    // Check indexes
    console.log('\n📋 Checking indexes...');
    const userIndexes = await User.collection.getIndexes();
    const orderIndexes = await Order.collection.getIndexes();
    const productIndexes = await Product.collection.getIndexes();

    console.log(`👥 User indexes: ${Object.keys(userIndexes).length}`);
    console.log(`📦 Order indexes: ${Object.keys(orderIndexes).length}`);
    console.log(`🍽️ Product indexes: ${Object.keys(productIndexes).length}`);

    // Performance recommendations
    console.log('\n💡 Performance Analysis:');
    
    if (dbTime > 1000) {
      console.log('⚠️  Database connection slow (>1s)');
    } else {
      console.log('✅ Database connection good');
    }

    if (userTime > 50) {
      console.log('⚠️  User lookup slow (>50ms) - Check telegramId index');
    } else {
      console.log('✅ User lookup good');
    }

    if (ordersTime > 200) {
      console.log('⚠️  Orders query slow (>200ms) - Check compound indexes');
    } else {
      console.log('✅ Orders query good');
    }

    if (productsTime > 100) {
      console.log('⚠️  Products query slow (>100ms) - Check category index');
    } else {
      console.log('✅ Products query good');
    }

    console.log('\n🎯 Recommendations:');
    console.log('1. Use .lean() for read-only queries');
    console.log('2. Limit populate fields');
    console.log('3. Add compound indexes for common filters');
    console.log('4. Cache frequently accessed data');
    console.log('5. Reduce debug logging in production');

  } catch (error) {
    console.error('❌ Performance test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Performance test completed');
    process.exit(0);
  }
}

// Run test
testPerformance();