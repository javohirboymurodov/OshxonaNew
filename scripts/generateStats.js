const mongoose = require('mongoose');
const { Order, User, Product } = require('../models');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class StatsGenerator {
  static async run() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      console.log('📊 Statistika yaratish boshlandi...');
      
      const stats = await this.generateStats();
      
      // JSON faylga saqlash
      const statsDir = path.join(__dirname, '../stats');
      if (!fs.existsSync(statsDir)) {
        fs.mkdirSync(statsDir, { recursive: true });
      }
      
      const filename = `stats_${moment().format('YYYY-MM-DD_HH-mm-ss')}.json`;
      const filepath = path.join(statsDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(stats, null, 2));
      
      console.log('✅ Statistika yaratildi!');
      console.log(`📁 Fayl: ${filepath}`);
      
      // Konsolga chiqarish
      this.printStats(stats);
      
    } catch (error) {
      console.error('❌ Statistika yaratishda xatolik:', error);
    } finally {
      await mongoose.disconnect();
    }
  }
  
  static async generateStats() {
    const today = moment().startOf('day');
    const weekAgo = moment().subtract(7, 'days').startOf('day');
    const monthAgo = moment().subtract(30, 'days').startOf('day');
    
    const stats = {
      generatedAt: moment().toISOString(),
      users: await this.getUserStats(),
      orders: await this.getOrderStats(today, weekAgo, monthAgo),
      products: await this.getProductStats(),
      revenue: await this.getRevenueStats(today, weekAgo, monthAgo)
    };
    
    return stats;
  }
  
  static async getUserStats() {
    const total = await User.countDocuments();
    const active = await User.countDocuments({ 
      lastActivity: { $gte: moment().subtract(7, 'days').toDate() }
    });
    const newThisWeek = await User.countDocuments({
      createdAt: { $gte: moment().subtract(7, 'days').toDate() }
    });
    
    return {
      total,
      active,
      newThisWeek,
      activityRate: total > 0 ? Math.round((active / total) * 100) : 0
    };
  }
  
  static async getOrderStats(today, weekAgo, monthAgo) {
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today.toDate() }
    });
    
    const weekOrders = await Order.countDocuments({
      createdAt: { $gte: weekAgo.toDate() }
    });
    
    const monthOrders = await Order.countDocuments({
      createdAt: { $gte: monthAgo.toDate() }
    });
    
    const totalOrders = await Order.countDocuments();
    
    // Status bo'yicha
    const statusStats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statusMap = {};
    statusStats.forEach(stat => {
      statusMap[stat._id] = stat.count;
    });
    
    return {
      today: todayOrders,
      thisWeek: weekOrders,
      thisMonth: monthOrders,
      total: totalOrders,
      byStatus: statusMap
    };
  }
  
  static async getProductStats() {
    const total = await Product.countDocuments();
    const active = await Product.countDocuments({ isActive: true, isAvailable: true });
    const popular = await Product.countDocuments({ isPopular: true });
    
    // Eng ko'p buyurtma qilingan mahsulotlar
    const topProducts = await Product.find()
      .sort({ 'stats.orderCount': -1 })
      .limit(10)
      .select('name stats.orderCount');
    
    return {
      total,
      active,
      popular,
      topProducts: topProducts.map(p => ({
        name: p.name,
        orderCount: p.stats.orderCount
      }))
    };
  }
  
  static async getRevenueStats(today, weekAgo, monthAgo) {
    const todayRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today.toDate() },
          status: { $in: ['delivered', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);
    
    const weekRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: weekAgo.toDate() },
          status: { $in: ['delivered', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);
    
    const monthRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: monthAgo.toDate() },
          status: { $in: ['delivered', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);
    
    return {
      today: todayRevenue[0]?.total || 0,
      thisWeek: weekRevenue[0]?.total || 0,
      thisMonth: monthRevenue[0]?.total || 0
    };
  }
  
  static printStats(stats) {
    console.log('\n📊 STATISTIKA HISOBOTI');
    console.log('='.repeat(50));
    
    console.log('\n👥 FOYDALANUVCHILAR:');
    console.log(`   Jami: ${stats.users.total}`);
    console.log(`   Faol (7 kun): ${stats.users.active}`);
    console.log(`   Yangi (7 kun): ${stats.users.newThisWeek}`);
    console.log(`   Faollik darajasi: ${stats.users.activityRate}%`);
    
    console.log('\n📦 BUYURTMALAR:');
    console.log(`   Bugun: ${stats.orders.today}`);
    console.log(`   Bu hafta: ${stats.orders.thisWeek}`);
    console.log(`   Bu oy: ${stats.orders.thisMonth}`);
    console.log(`   Jami: ${stats.orders.total}`);
    
    console.log('\n💰 DAROMAD:');
    console.log(`   Bugun: ${stats.revenue.today.toLocaleString()} so'm`);
    console.log(`   Bu hafta: ${stats.revenue.thisWeek.toLocaleString()} so'm`);
    console.log(`   Bu oy: ${stats.revenue.thisMonth.toLocaleString()} so'm`);
    
    console.log('\n🍽️ MAHSULOTLAR:');
    console.log(`   Jami: ${stats.products.total}`);
    console.log(`   Faol: ${stats.products.active}`);
    console.log(`   Mashhur: ${stats.products.popular}`);
    
    if (stats.products.topProducts.length > 0) {
      console.log('\n🏆 TOP MAHSULOTLAR:');
      stats.products.topProducts.slice(0, 5).forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} (${product.orderCount} buyurtma)`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

// Script ishga tushirish
StatsGenerator.run();