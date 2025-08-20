// Database optimization script - Indexes va performance yaxshilash
require('dotenv').config();
const mongoose = require('mongoose');
const Database = require('../config/database');

// Models
const { User, Product, Order, Category, Cart, Branch, DeliveryZone, Review, Table } = require('../models');

/**
 * Database indexlarini yaratish va optimizatsiya qilish
 */
async function optimizeDatabase() {
  try {
    console.log('🚀 Database optimizatsiyasi boshlanmoqda...\n');

    // Connect to database
    await Database.connect();

    // ========================================
    // 👥 USER COLLECTION INDEXES
    // ========================================
    console.log('📊 User collection optimizatsiya...');
    
    await User.collection.createIndex({ telegramId: 1 }, { unique: true });
    await User.collection.createIndex({ email: 1 }, { sparse: true });
    await User.collection.createIndex({ phone: 1 }, { sparse: true });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ branch: 1 });
    await User.collection.createIndex({ role: 1, branch: 1 });
    await User.collection.createIndex({ isActive: 1 });
    await User.collection.createIndex({ 'courierInfo.isOnline': 1 });
    await User.collection.createIndex({ 'courierInfo.isAvailable': 1 });
    await User.collection.createIndex({ createdAt: -1 });
    
    console.log('✅ User indexes yaratildi');

    // ========================================
    // 🍽️ PRODUCT COLLECTION INDEXES
    // ========================================
    console.log('📊 Product collection optimizatsiya...');
    
    await Product.collection.createIndex({ branch: 1 });
    await Product.collection.createIndex({ category: 1 });
    await Product.collection.createIndex({ branch: 1, category: 1 });
    await Product.collection.createIndex({ branch: 1, isActive: 1 });
    await Product.collection.createIndex({ isActive: 1 });
    await Product.collection.createIndex({ price: 1 });
    await Product.collection.createIndex({ name: 'text', description: 'text' });
    await Product.collection.createIndex({ createdAt: -1 });
    await Product.collection.createIndex({ updatedAt: -1 });
    
    console.log('✅ Product indexes yaratildi');

    // ========================================
    // 📦 ORDER COLLECTION INDEXES
    // ========================================
    console.log('📊 Order collection optimizatsiya...');
    
    await Order.collection.createIndex({ orderId: 1 }, { unique: true });
    await Order.collection.createIndex({ user: 1 });
    await Order.collection.createIndex({ branch: 1 });
    await Order.collection.createIndex({ status: 1 });
    await Order.collection.createIndex({ orderType: 1 });
    await Order.collection.createIndex({ branch: 1, status: 1 });
    await Order.collection.createIndex({ branch: 1, createdAt: -1 });
    await Order.collection.createIndex({ status: 1, createdAt: -1 });
    await Order.collection.createIndex({ user: 1, createdAt: -1 });
    await Order.collection.createIndex({ courier: 1 });
    await Order.collection.createIndex({ courier: 1, status: 1 });
    await Order.collection.createIndex({ createdAt: -1 });
    await Order.collection.createIndex({ updatedAt: -1 });
    
    console.log('✅ Order indexes yaratildi');

    // ========================================
    // 📂 CATEGORY COLLECTION INDEXES  
    // ========================================
    console.log('📊 Category collection optimizatsiya...');
    
    await Category.collection.createIndex({ isActive: 1 });
    await Category.collection.createIndex({ isVisible: 1 });
    await Category.collection.createIndex({ isActive: 1, isVisible: 1 });
    await Category.collection.createIndex({ sortOrder: 1 });
    await Category.collection.createIndex({ name: 'text' });
    
    console.log('✅ Category indexes yaratildi');

    // ========================================
    // 🛒 CART COLLECTION INDEXES
    // ========================================
    console.log('📊 Cart collection optimizatsiya...');
    
    await Cart.collection.createIndex({ user: 1 });
    await Cart.collection.createIndex({ user: 1, isActive: 1 });
    await Cart.collection.createIndex({ isActive: 1 });
    await Cart.collection.createIndex({ updatedAt: -1 });
    
    console.log('✅ Cart indexes yaratildi');

    // ========================================
    // 🏢 BRANCH COLLECTION INDEXES
    // ========================================
    console.log('📊 Branch collection optimizatsiya...');
    
    await Branch.collection.createIndex({ isActive: 1 });
    await Branch.collection.createIndex({ 'address.coordinates.latitude': 1, 'address.coordinates.longitude': 1 });
    await Branch.collection.createIndex({ name: 'text', title: 'text' });
    
    console.log('✅ Branch indexes yaratildi');

    // ========================================
    // 📍 DELIVERY ZONE COLLECTION INDEXES
    // ========================================
    console.log('📊 DeliveryZone collection optimizatsiya...');
    
    await DeliveryZone.collection.createIndex({ branch: 1 });
    await DeliveryZone.collection.createIndex({ isActive: 1 });
    await DeliveryZone.collection.createIndex({ branch: 1, isActive: 1 });
    
    console.log('✅ DeliveryZone indexes yaratildi');

    // ========================================
    // ⭐ REVIEW COLLECTION INDEXES
    // ========================================
    console.log('📊 Review collection optimizatsiya...');
    
    await Review.collection.createIndex({ user: 1 });
    await Review.collection.createIndex({ product: 1 });
    await Review.collection.createIndex({ order: 1 });
    await Review.collection.createIndex({ user: 1, product: 1 });
    await Review.collection.createIndex({ rating: -1 });
    await Review.collection.createIndex({ status: 1 });
    await Review.collection.createIndex({ createdAt: -1 });
    
    console.log('✅ Review indexes yaratildi');

    // ========================================
    // 🪑 TABLE COLLECTION INDEXES
    // ========================================
    console.log('📊 Table collection optimizatsiya...');
    
    await Table.collection.createIndex({ branch: 1 });
    await Table.collection.createIndex({ tableNumber: 1 });
    await Table.collection.createIndex({ branch: 1, tableNumber: 1 }, { unique: true });
    await Table.collection.createIndex({ qrCode: 1 }, { unique: true, sparse: true });
    await Table.collection.createIndex({ isActive: 1 });
    
    console.log('✅ Table indexes yaratildi');

    // ========================================
    // 📊 DATABASE STATISTICS
    // ========================================
    console.log('\n📊 Database statistikalari:');
    
    const collections = [
      { model: User, name: 'Users' },
      { model: Product, name: 'Products' },
      { model: Order, name: 'Orders' },
      { model: Category, name: 'Categories' },
      { model: Cart, name: 'Carts' },
      { model: Branch, name: 'Branches' },
      { model: DeliveryZone, name: 'DeliveryZones' },
      { model: Review, name: 'Reviews' },
      { model: Table, name: 'Tables' }
    ];

    for (const { model, name } of collections) {
      const count = await model.countDocuments();
      console.log(`📋 ${name}: ${count.toLocaleString()} ta hujjat`);
    }

    // ========================================
    // 🧹 CLEANUP OLD DATA (optional)
    // ========================================
    console.log('\n🧹 Eski ma\'lumotlarni tozalash...');
    
    // 30 kundan eski nofaol cartlarni o'chirish
    const oldCarts = await Cart.deleteMany({
      isActive: false,
      updatedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    console.log(`🗑️ ${oldCarts.deletedCount} ta eski cart o'chirildi`);

    // 90 kundan eski bekor qilingan buyurtmalarni arxivlash
    const cancelledOrders = await Order.updateMany(
      {
        status: 'cancelled',
        createdAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      },
      { isArchived: true }
    );
    console.log(`📦 ${cancelledOrders.modifiedCount} ta buyurtma arxivlandi`);

    console.log('\n✅ Database optimizatsiyasi yakunlandi!');
    console.log('🚀 Performance yaxshilandi va indexlar yaratildi');

  } catch (error) {
    console.error('❌ Database optimizatsiyasida xatolik:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('📤 Database ulanishi yopildi');
  }
}

/**
 * Index larni tekshirish va haqida ma'lumot berish
 */
async function checkIndexes() {
  try {
    console.log('🔍 Mavjud indexlarni tekshirish...\n');

    const collections = ['users', 'products', 'orders', 'categories', 'carts', 'branches', 'deliveryzones', 'reviews', 'tables'];
    
    for (const collectionName of collections) {
      console.log(`📊 ${collectionName.toUpperCase()} Collection indexlari:`);
      
      try {
        const indexes = await mongoose.connection.db.collection(collectionName).listIndexes().toArray();
        
        indexes.forEach(index => {
          const keyFields = Object.keys(index.key).join(', ');
          const indexType = index.unique ? '(unique)' : index.sparse ? '(sparse)' : '';
          console.log(`  ✅ ${index.name}: {${keyFields}} ${indexType}`);
        });
        
        console.log(`  📈 Jami: ${indexes.length} ta index\n`);
      } catch (error) {
        console.log(`  ❌ Collection mavjud emas yoki xatolik: ${error.message}\n`);
      }
    }

  } catch (error) {
    console.error('❌ Index tekshirishda xatolik:', error);
  }
}

// CLI arguments
const args = process.argv.slice(2);

if (args.includes('--check') || args.includes('-c')) {
  // Faqat indexlarni tekshirish
  Database.connect().then(() => {
    checkIndexes().then(() => {
      mongoose.connection.close();
      process.exit(0);
    });
  });
} else {
  // To'liq optimizatsiya
  optimizeDatabase();
}

module.exports = { optimizeDatabase, checkIndexes };
