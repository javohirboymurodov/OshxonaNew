/**
 * Database Indexes Creation Script
 * Performance optimization uchun kerakli indexlarni yaratish
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function createDatabaseIndexes() {
  try {
    console.log('🗄️ Database indexlarini yaratish boshlandi...\n');

    // MongoDB ga ulanish
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI environment variable kiritilmagan!');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulanish muvaffaqiyatli\n');

    const db = mongoose.connection.db;

    // 1. USERS Collection Indexes
    console.log('👥 Users collection indexlari...');
    await db.collection('users').createIndex(
      { telegramId: 1 }, 
      { unique: true, background: true }
    );
    console.log('   ✅ telegramId unique index');

    await db.collection('users').createIndex(
      { phone: 1 }, 
      { sparse: true, background: true }
    );
    console.log('   ✅ phone sparse index');

    await db.collection('users').createIndex(
      { role: 1, isActive: 1 }, 
      { background: true }
    );
    console.log('   ✅ role + isActive compound index');

    await db.collection('users').createIndex(
      { branch: 1, role: 1 }, 
      { background: true }
    );
    console.log('   ✅ branch + role compound index');

    await db.collection('users').createIndex(
      { loyaltyLevel: 1, loyaltyPoints: -1 }, 
      { background: true }
    );
    console.log('   ✅ loyalty level + points index');

    // 2. ORDERS Collection Indexes
    console.log('\n📦 Orders collection indexlari...');
    await db.collection('orders').createIndex(
      { user: 1, createdAt: -1 }, 
      { background: true }
    );
    console.log('   ✅ user + createdAt compound index');

    await db.collection('orders').createIndex(
      { status: 1, createdAt: -1 }, 
      { background: true }
    );
    console.log('   ✅ status + createdAt compound index');

    await db.collection('orders').createIndex(
      { branch: 1, status: 1, createdAt: -1 }, 
      { background: true }
    );
    console.log('   ✅ branch + status + createdAt compound index');

    await db.collection('orders').createIndex(
      { orderType: 1, status: 1 }, 
      { background: true }
    );
    console.log('   ✅ orderType + status compound index');

    await db.collection('orders').createIndex(
      { orderId: 1 }, 
      { unique: true, background: true }
    );
    console.log('   ✅ orderId unique index');

    await db.collection('orders').createIndex(
      { courier: 1, status: 1 }, 
      { background: true }
    );
    console.log('   ✅ courier + status compound index');

    await db.collection('orders').createIndex(
      { createdAt: -1 }, 
      { background: true, expireAfterSeconds: 31536000 } // 1 yil
    );
    console.log('   ✅ createdAt TTL index (1 year)');

    // 3. PRODUCTS Collection Indexes
    console.log('\n🍽️ Products collection indexlari...');
    await db.collection('products').createIndex(
      { categoryId: 1, isActive: 1, isAvailable: 1 }, 
      { background: true }
    );
    console.log('   ✅ category + active + available compound index');

    await db.collection('products').createIndex(
      { name: 'text', description: 'text' }, 
      { background: true }
    );
    console.log('   ✅ text search index');

    await db.collection('products').createIndex(
      { branch: 1, isActive: 1 }, 
      { background: true }
    );
    console.log('   ✅ branch + active compound index');

    await db.collection('products').createIndex(
      { price: 1 }, 
      { background: true }
    );
    console.log('   ✅ price index');

    await db.collection('products').createIndex(
      { updatedAt: -1 }, 
      { background: true }
    );
    console.log('   ✅ updatedAt index');

    // 4. CATEGORIES Collection Indexes
    console.log('\n📂 Categories collection indexlari...');
    await db.collection('categories').createIndex(
      { isActive: 1, order: 1 }, 
      { background: true }
    );
    console.log('   ✅ active + order compound index');

    await db.collection('categories').createIndex(
      { branch: 1, isActive: 1 }, 
      { background: true }
    );
    console.log('   ✅ branch + active compound index');

    // 5. BRANCHES Collection Indexes
    console.log('\n🏪 Branches collection indexlari...');
    await db.collection('branches').createIndex(
      { isActive: 1 }, 
      { background: true }
    );
    console.log('   ✅ isActive index');

    await db.collection('branches').createIndex(
      { 'address.coordinates': '2dsphere' }, 
      { background: true }
    );
    console.log('   ✅ geospatial index');

    // 6. TABLES Collection Indexes
    console.log('\n🪑 Tables collection indexlari...');
    await db.collection('tables').createIndex(
      { branch: 1, isActive: 1 }, 
      { background: true }
    );
    console.log('   ✅ branch + active compound index');

    await db.collection('tables').createIndex(
      { qrCode: 1 }, 
      { unique: true, background: true }
    );
    console.log('   ✅ qrCode unique index');

    await db.collection('tables').createIndex(
      { tableNumber: 1, branch: 1 }, 
      { unique: true, background: true }
    );
    console.log('   ✅ tableNumber + branch unique compound index');

    // 7. PROMO Collection Indexes
    console.log('\n🎉 Promotions collection indexlari...');
    await db.collection('promotions').createIndex(
      { isActive: 1, startDate: 1, endDate: 1 }, 
      { background: true }
    );
    console.log('   ✅ active + date range compound index');

    await db.collection('promotions').createIndex(
      { branch: 1, isActive: 1 }, 
      { background: true }
    );
    console.log('   ✅ branch + active compound index');

    // 8. DELIVERY ZONES Collection Indexes
    console.log('\n🚚 Delivery Zones collection indexlari...');
    await db.collection('deliveryzones').createIndex(
      { isActive: 1, priority: -1 }, 
      { background: true }
    );
    console.log('   ✅ active + priority compound index');

    await db.collection('deliveryzones').createIndex(
      { branch: 1, isActive: 1 }, 
      { background: true }
    );
    console.log('   ✅ branch + active compound index');

    // Index stats
    console.log('\n📊 Index statistikasi:');
    const collections = ['users', 'orders', 'products', 'categories', 'branches', 'tables', 'promotions', 'deliveryzones'];
    
    for (const collectionName of collections) {
      try {
        const indexes = await db.collection(collectionName).indexes();
        console.log(`   ${collectionName}: ${indexes.length} ta index`);
      } catch (error) {
        console.log(`   ${collectionName}: collection mavjud emas`);
      }
    }

    console.log('\n🎉 Barcha indexlar muvaffaqiyatli yaratildi!');
    console.log('⚡ Database performance sezilarli darajada yaxshilandi!');

  } catch (error) {
    console.error('❌ Index yaratishda xatolik:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection yopildi');
  }
}

// Script ni ishga tushirish
if (require.main === module) {
  createDatabaseIndexes().then(() => {
    console.log('\n🚀 Database optimization completed!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { createDatabaseIndexes };