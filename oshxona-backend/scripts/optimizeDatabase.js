// scripts/optimizeDatabase.js
require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const BranchProduct = require('../models/BranchProduct');
const Branch = require('../models/Branch');
const Category = require('../models/Category');

async function optimizeDatabase() {
  try {
    console.log('🔧 Database optimization boshlandi...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database ga ulanish muvaffaqiyatli');

    await createOptimizedIndexes();
    await analyzePerformance();
    
    console.log('🎉 Database optimization tugallandi!');
    
  } catch (error) {
    console.error('❌ Database optimization xatosi:', error);
  } finally {
    await mongoose.disconnect();
  }
}

async function createOptimizedIndexes() {
  console.log('📝 Optimized indexes yaratilmoqda...');
  
  // User indexes
  await createIndexSafely(User, { telegramId: 1 }, 'telegramId_1');
  await createIndexSafely(User, { phone: 1 }, 'phone_1');
  await createIndexSafely(User, { role: 1, branch: 1 }, 'role_branch_compound');
  await createIndexSafely(User, { role: 1, 'courierInfo.isOnline': 1 }, 'courier_online');
  
  // Order indexes - eng muhim performance uchun
  await createIndexSafely(Order, { branch: 1, status: 1 }, 'branch_status_compound');
  await createIndexSafely(Order, { branch: 1, createdAt: -1 }, 'branch_date_compound');
  await createIndexSafely(Order, { user: 1, createdAt: -1 }, 'user_date_compound');
  await createIndexSafely(Order, { 'deliveryInfo.courier': 1, status: 1 }, 'courier_status');
  await createIndexSafely(Order, { status: 1, createdAt: -1 }, 'status_date_compound');
  
  // Product indexes
  await createIndexSafely(Product, { branch: 1, categoryId: 1, isActive: 1 }, 'product_filter_compound');
  await createIndexSafely(Product, { name: 'text' }, 'product_text_search');
  
  // BranchProduct indexes
  await createIndexSafely(BranchProduct, { product: 1, branch: 1 }, 'product_branch_unique');
  await createIndexSafely(BranchProduct, { branch: 1, isAvailable: 1 }, 'branch_available');
  await createIndexSafely(BranchProduct, { isPromoActive: 1, promoEnd: 1 }, 'promo_expiry');
  
  console.log('✅ Barcha indexlar yaratildi!');
}

async function createIndexSafely(model, index, name) {
  try {
    await model.collection.createIndex(index, { name });
    console.log(`✅ ${model.modelName}: ${name}`);
  } catch (error) {
    if (error.code !== 85) { // Index already exists
      console.log(`⚠️  ${model.modelName}: ${name} - ${error.message}`);
    }
  }
}

async function analyzePerformance() {
  console.log('\n📊 Performance tahlili...');
  
  const collections = ['users', 'orders', 'products', 'branchproducts'];
  
  for (const collectionName of collections) {
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      const stats = await collection.stats();
      
      console.log(`\n📈 ${collectionName.toUpperCase()}:`);
      console.log(`  - Documents: ${stats.count?.toLocaleString() || 0}`);
      console.log(`  - Size: ${((stats.size || 0) / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  - Indexes: ${stats.nindexes || 0}`);
      console.log(`  - Index Size: ${((stats.totalIndexSize || 0) / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.log(`  - ${collectionName}: Collection bo'sh yoki mavjud emas`);
    }
  }
}

if (require.main === module) {
  optimizeDatabase();
}

module.exports = { optimizeDatabase };