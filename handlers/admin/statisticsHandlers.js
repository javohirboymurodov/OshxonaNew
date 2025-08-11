// Statistics handlers - admin side
const { Order, User, Product, Category } = require('../../models');
const AdminKeyboards = require('../../keyboards/adminKeyboards');
const moment = require('moment');

class StatisticsHandlers {
  // Statistika asosiy menyu
  static async showStatistics(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const stats = await this.getTodayStats();
      
      const message = `
📊 **Statistika**

📅 **Bugungi ko'rsatkichlar:**
• Yangi buyurtmalar: ${stats.todayOrders}
• Jami tushum: ${stats.todayRevenue.toLocaleString()} so'm
• Yangi mijozlar: ${stats.newCustomers}
• Faol mahsulotlar: ${stats.activeProducts}

📈 **Haftalik o'sish:**
• Buyurtmalar: ${stats.weeklyOrderGrowth > 0 ? '+' : ''}${stats.weeklyOrderGrowth}%
• Tushum: ${stats.weeklyRevenueGrowth > 0 ? '+' : ''}${stats.weeklyRevenueGrowth}%
      `;
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: AdminKeyboards.statisticsMenu().reply_markup
      });
      
    } catch (error) {
      console.error('Statistics error:', error);
      await ctx.answerCbQuery('Statistikani ko\'rsatishda xatolik!');
    }
  }

  // Bugungi statistika
  static async showTodayStats(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const stats = await this.getTodayStats();
      
      let message = `
📅 **Bugungi statistika** (${moment().format('DD.MM.YYYY')})

💰 **Moliyaviy ko'rsatkichlar:**
• Jami tushum: ${stats.todayRevenue.toLocaleString()} so'm
• O'rtacha buyurtma: ${stats.avgOrderValue.toLocaleString()} so'm
• Eng katta buyurtma: ${stats.maxOrderValue.toLocaleString()} so'm

📦 **Buyurtmalar:**
• Jami: ${stats.todayOrders}
• Yakunlangan: ${stats.completedOrders}
• Jarayonda: ${stats.processingOrders}
• Bekor qilingan: ${stats.cancelledOrders}

👥 **Mijozlar:**
• Yangi ro'yxatdan o'tganlar: ${stats.newCustomers}
• Faol mijozlar: ${stats.activeCustomers}
• Takroriy buyurtma berganlar: ${stats.returningCustomers}

🍽️ **Eng ommabop mahsulotlar:**
`;
      
      const topProducts = await this.getTopProducts('today');
      topProducts.forEach((product, index) => {
        message += `${index + 1}. ${product.name} - ${product.orderCount} buyurtma\n`;
      });
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: AdminKeyboards.backToAdmin().reply_markup
      });
      
    } catch (error) {
      console.error('Today stats error:', error);
      await ctx.answerCbQuery('Bugungi statistikani ko\'rsatishda xatolik!');
    }
  }

  // Haftalik statistika
  static async showWeekStats(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const stats = await this.getWeekStats();
      
      let message = `
📅 **Haftalik statistika** (${moment().startOf('week').format('DD.MM')} - ${moment().format('DD.MM.YYYY')})

💰 **Moliyaviy ko'rsatkichlar:**
• Jami tushum: ${stats.weekRevenue.toLocaleString()} so'm
• Kunlik o'rtacha: ${Math.round(stats.weekRevenue / 7).toLocaleString()} so'm
• O'rtacha buyurtma: ${stats.avgOrderValue.toLocaleString()} so'm

📦 **Buyurtmalar:**
• Jami: ${stats.weekOrders}
• Kunlik o'rtacha: ${Math.round(stats.weekOrders / 7)}
• Yakunlangan: ${stats.completedOrders}
• Bekor qilingan: ${stats.cancelledOrders}

👥 **Mijozlar:**
• Yangi ro'yxatdan o'tganlar: ${stats.newCustomers}
• Faol mijozlar: ${stats.activeCustomers}
• Eng faol kun: ${stats.busiestDay}

🍽️ **Eng ommabop mahsulotlar:**
`;
      
      const topProducts = await this.getTopProducts('week');
      topProducts.forEach((product, index) => {
        message += `${index + 1}. ${product.name} - ${product.orderCount} buyurtma\n`;
      });
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: AdminKeyboards.backToAdmin().reply_markup
      });
      
    } catch (error) {
      console.error('Week stats error:', error);
      await ctx.answerCbQuery('Haftalik statistikani ko\'rsatishda xatolik!');
    }
  }

  // Oylik statistika
  static async showMonthStats(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const stats = await this.getMonthStats();
      
      let message = `
📅 **Oylik statistika** (${moment().format('MMMM YYYY')})

💰 **Moliyaviy ko'rsatkichlar:**
• Jami tushum: ${stats.monthRevenue.toLocaleString()} so'm
• Kunlik o'rtacha: ${Math.round(stats.monthRevenue / moment().date()).toLocaleString()} so'm
• O'rtacha buyurtma: ${stats.avgOrderValue.toLocaleString()} so'm
• O'sish: ${stats.growthRate > 0 ? '+' : ''}${stats.growthRate}% (o'tgan oyga nisbatan)

📦 **Buyurtmalar:**
• Jami: ${stats.monthOrders}
• Kunlik o'rtacha: ${Math.round(stats.monthOrders / moment().date())}
• Yakunlangan: ${stats.completedOrders}
• Bekor qilingan: ${stats.cancelledOrders}

👥 **Mijozlar:**
• Yangi ro'yxatdan o'tganlar: ${stats.newCustomers}
• Faol mijozlar: ${stats.activeCustomers}
• Takroriy mijozlar: ${stats.returningCustomers}

🍽️ **Eng ommabop mahsulotlar:**
`;
      
      const topProducts = await this.getTopProducts('month');
      topProducts.forEach((product, index) => {
        message += `${index + 1}. ${product.name} - ${product.orderCount} buyurtma\n`;
      });
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: AdminKeyboards.backToAdmin().reply_markup
      });
      
    } catch (error) {
      console.error('Month stats error:', error);
      await ctx.answerCbQuery('Oylik statistikani ko\'rsatishda xatolik!');
    }
  }

  // Yillik statistika
  static async showYearStats(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const stats = await this.getYearStats();
      
      let message = `
📅 **Yillik statistika** (${moment().format('YYYY')})

💰 **Moliyaviy ko'rsatkichlar:**
• Jami tushum: ${stats.yearRevenue.toLocaleString()} so'm
• Oylik o'rtacha: ${Math.round(stats.yearRevenue / moment().month()).toLocaleString()} so'm
• O'rtacha buyurtma: ${stats.avgOrderValue.toLocaleString()} so'm
• Eng yuqori oy: ${stats.bestMonth}

📦 **Buyurtmalar:**
• Jami: ${stats.yearOrders}
• Oylik o'rtacha: ${Math.round(stats.yearOrders / (moment().month() + 1))}
• Yakunlangan: ${stats.completedOrders}
• Bekor qilingan: ${stats.cancelledOrders}

👥 **Mijozlar:**
• Jami ro'yxatdan o'tganlar: ${stats.totalCustomers}
• Faol mijozlar: ${stats.activeCustomers}
• Eng faol oy: ${stats.busiestMonth}

📈 **O'sish dinamikasi:**
• Tushum o'sishi: ${stats.revenueGrowth > 0 ? '+' : ''}${stats.revenueGrowth}%
• Buyurtmalar o'sishi: ${stats.orderGrowth > 0 ? '+' : ''}${stats.orderGrowth}%
• Mijozlar o'sishi: ${stats.customerGrowth > 0 ? '+' : ''}${stats.customerGrowth}%
`;
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: AdminKeyboards.backToAdmin().reply_markup
      });
      
    } catch (error) {
      console.error('Year stats error:', error);
      await ctx.answerCbQuery('Yillik statistikani ko\'rsatishda xatolik!');
    }
  }

  // Helper methods
  static async getTodayStats() {
    try {
      const today = moment().startOf('day');
      const tomorrow = moment().endOf('day');
      
      const [orders, revenue, customers, products] = await Promise.all([
        Order.find({ 
          createdAt: { $gte: today.toDate(), $lte: tomorrow.toDate() }
        }),
        Order.aggregate([
          { 
            $match: { 
              createdAt: { $gte: today.toDate(), $lte: tomorrow.toDate() },
              status: { $in: ['delivered', 'completed'] }
            } 
          },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        User.countDocuments({ 
          createdAt: { $gte: today.toDate(), $lte: tomorrow.toDate() }
        }),
        Product.countDocuments({ isActive: true })
      ]);
      
      const todayRevenue = revenue[0] ? revenue[0].total : 0;
      const completedOrders = orders.filter(o => ['delivered', 'completed'].includes(o.status));
      
      return {
        todayOrders: orders.length,
        todayRevenue,
        newCustomers: customers,
        activeProducts: products,
        completedOrders: completedOrders.length,
        processingOrders: orders.filter(o => !['delivered', 'completed', 'cancelled'].includes(o.status)).length,
        cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
        avgOrderValue: completedOrders.length > 0 ? Math.round(todayRevenue / completedOrders.length) : 0,
        maxOrderValue: completedOrders.length > 0 ? Math.max(...completedOrders.map(o => o.total)) : 0,
        activeCustomers: new Set(orders.map(o => o.user.toString())).size,
        returningCustomers: 0, // To be calculated
        weeklyOrderGrowth: 0, // To be calculated
        weeklyRevenueGrowth: 0 // To be calculated
      };
    } catch (error) {
      console.error('Get today stats error:', error);
      return this.getEmptyStats();
    }
  }

  static async getWeekStats() {
    try {
      const weekStart = moment().startOf('week');
      const weekEnd = moment().endOf('week');
      
      const [orders, revenue, customers] = await Promise.all([
        Order.find({ 
          createdAt: { $gte: weekStart.toDate(), $lte: weekEnd.toDate() }
        }),
        Order.aggregate([
          { 
            $match: { 
              createdAt: { $gte: weekStart.toDate(), $lte: weekEnd.toDate() },
              status: { $in: ['delivered', 'completed'] }
            } 
          },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        User.countDocuments({ 
          createdAt: { $gte: weekStart.toDate(), $lte: weekEnd.toDate() }
        })
      ]);
      
      const weekRevenue = revenue[0] ? revenue[0].total : 0;
      const completedOrders = orders.filter(o => ['delivered', 'completed'].includes(o.status));
      
      return {
        weekOrders: orders.length,
        weekRevenue,
        newCustomers: customers,
        completedOrders: completedOrders.length,
        cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
        avgOrderValue: completedOrders.length > 0 ? Math.round(weekRevenue / completedOrders.length) : 0,
        activeCustomers: new Set(orders.map(o => o.user.toString())).size,
        busiestDay: 'Dushanba' // Simplified
      };
    } catch (error) {
      console.error('Get week stats error:', error);
      return this.getEmptyStats();
    }
  }

  static async getMonthStats() {
    try {
      const monthStart = moment().startOf('month');
      const monthEnd = moment().endOf('month');
      
      const [orders, revenue, customers] = await Promise.all([
        Order.find({ 
          createdAt: { $gte: monthStart.toDate(), $lte: monthEnd.toDate() }
        }),
        Order.aggregate([
          { 
            $match: { 
              createdAt: { $gte: monthStart.toDate(), $lte: monthEnd.toDate() },
              status: { $in: ['delivered', 'completed'] }
            } 
          },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        User.countDocuments({ 
          createdAt: { $gte: monthStart.toDate(), $lte: monthEnd.toDate() }
        })
      ]);
      
      const monthRevenue = revenue[0] ? revenue[0].total : 0;
      const completedOrders = orders.filter(o => ['delivered', 'completed'].includes(o.status));
      
      return {
        monthOrders: orders.length,
        monthRevenue,
        newCustomers: customers,
        completedOrders: completedOrders.length,
        cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
        avgOrderValue: completedOrders.length > 0 ? Math.round(monthRevenue / completedOrders.length) : 0,
        activeCustomers: new Set(orders.map(o => o.user.toString())).size,
        returningCustomers: 0, // To be calculated
        growthRate: 0 // To be calculated
      };
    } catch (error) {
      console.error('Get month stats error:', error);
      return this.getEmptyStats();
    }
  }

  static async getYearStats() {
    try {
      const yearStart = moment().startOf('year');
      const yearEnd = moment().endOf('year');
      
      const [orders, revenue, customers] = await Promise.all([
        Order.find({ 
          createdAt: { $gte: yearStart.toDate(), $lte: yearEnd.toDate() }
        }),
        Order.aggregate([
          { 
            $match: { 
              createdAt: { $gte: yearStart.toDate(), $lte: yearEnd.toDate() },
              status: { $in: ['delivered', 'completed'] }
            } 
          },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        User.countDocuments({ 
          createdAt: { $gte: yearStart.toDate(), $lte: yearEnd.toDate() }
        })
      ]);
      
      const yearRevenue = revenue[0] ? revenue[0].total : 0;
      const completedOrders = orders.filter(o => ['delivered', 'completed'].includes(o.status));
      
      return {
        yearOrders: orders.length,
        yearRevenue,
        totalCustomers: customers,
        completedOrders: completedOrders.length,
        cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
        avgOrderValue: completedOrders.length > 0 ? Math.round(yearRevenue / completedOrders.length) : 0,
        activeCustomers: new Set(orders.map(o => o.user.toString())).size,
        bestMonth: 'Yanvar', // Simplified
        busiestMonth: 'Yanvar', // Simplified
        revenueGrowth: 0, // To be calculated
        orderGrowth: 0, // To be calculated
        customerGrowth: 0 // To be calculated
      };
    } catch (error) {
      console.error('Get year stats error:', error);
      return this.getEmptyStats();
    }
  }

  static async getTopProducts(period) {
    try {
      let dateFilter;
      
      switch (period) {
        case 'today':
          dateFilter = { $gte: moment().startOf('day').toDate(), $lte: moment().endOf('day').toDate() };
          break;
        case 'week':
          dateFilter = { $gte: moment().startOf('week').toDate(), $lte: moment().endOf('week').toDate() };
          break;
        case 'month':
          dateFilter = { $gte: moment().startOf('month').toDate(), $lte: moment().endOf('month').toDate() };
          break;
        default:
          dateFilter = { $gte: moment().startOf('day').toDate(), $lte: moment().endOf('day').toDate() };
      }
      
      const topProducts = await Order.aggregate([
        { $match: { createdAt: dateFilter, status: { $in: ['delivered', 'completed'] } } },
        { $unwind: '$items' },
        { 
          $group: { 
            _id: '$items.productName', 
            orderCount: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
          } 
        },
        { $sort: { orderCount: -1 } },
        { $limit: 5 },
        { 
          $project: { 
            name: '$_id', 
            orderCount: 1, 
            revenue: 1,
            _id: 0 
          } 
        }
      ]);
      
      return topProducts;
    } catch (error) {
      console.error('Get top products error:', error);
      return [];
    }
  }

  static getEmptyStats() {
    return {
      todayOrders: 0, todayRevenue: 0, newCustomers: 0, activeProducts: 0,
      completedOrders: 0, processingOrders: 0, cancelledOrders: 0,
      avgOrderValue: 0, maxOrderValue: 0, activeCustomers: 0,
      returningCustomers: 0, weeklyOrderGrowth: 0, weeklyRevenueGrowth: 0
    };
  }

  static isAdmin(ctx) {
    const adminIds = process.env.ADMIN_ID ? 
      process.env.ADMIN_ID.split(',').map(id => parseInt(id.toString().trim())) : 
      [];
    return adminIds.includes(ctx.from.id);
  }
}

module.exports = StatisticsHandlers;
