// User management handlers - admin side
const { User, Order } = require('../../models');
const AdminKeyboards = require('../../keyboards/adminKeyboards');
const moment = require('moment');

class UserHandlers {
  // Foydalanuvchilar boshqaruvi asosiy menyu
  static async showUserManagement(ctx) {
    return this.userManagementHandler(ctx);
  }

  static async userManagementHandler(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const stats = await this.getUserStats();
      
      const message = `
👥 **Foydalanuvchilar boshqaruvi**

📊 **Statistika:**
• Jami foydalanuvchilar: ${stats.totalUsers}
• Faol foydalanuvchilar: ${stats.activeUsers}
• Bugun ro'yxatdan o'tganlar: ${stats.todayRegistrations}
• Eng ko'p buyurtma berganlar: ${stats.topCustomers}

🕐 **So'nggi faollik:**
• Bugun: ${stats.todayActive}
• Bu hafta: ${stats.weekActive}
• Bu oy: ${stats.monthActive}
      `;
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: AdminKeyboards.userManagement().reply_markup
      });
      
    } catch (error) {
      console.error('User management error:', error);
      await ctx.answerCbQuery('Foydalanuvchilar boshqaruvida xatolik!');
    }
  }

  // Foydalanuvchilarni qidirish
  static async searchUsers(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      await ctx.editMessageText(
        '🔍 **Foydalanuvchini qidirish**\n\nTelefon raqam, ism yoki username kiriting:',
        {
          parse_mode: 'Markdown',
          reply_markup: AdminKeyboards.backToAdmin().reply_markup
        }
      );
      
      // Search mode state set
      ctx.session.searchMode = 'user';
      
    } catch (error) {
      console.error('Search users error:', error);
      await ctx.answerCbQuery('Qidirishda xatolik!');
    }
  }

  // Qidiruv natijalarini ko'rsatish
  static async handleUserSearch(ctx, searchText) {
    try {
      const searchRegex = new RegExp(searchText.trim(), 'i');
      
      const users = await User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { phone: searchRegex },
          { username: searchRegex }
        ]
      }).limit(10);
      
      if (users.length === 0) {
        return await ctx.reply('❌ Foydalanuvchi topilmadi!');
      }
      
      let message = `🔍 **Qidiruv natijalari** (${users.length})\n\n`;
      
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const orderCount = await Order.countDocuments({ user: user._id });
        
        message += `${i + 1}. **${user.firstName} ${user.lastName || ''}**\n`;
        message += `📱 ${user.phone || 'Telefon yo\'q'}\n`;
        message += `🆔 ${user.username ? '@' + user.username : 'Username yo\'q'}\n`;
        message += `📦 ${orderCount} buyurtma\n`;
        message += `📅 ${moment(user.createdAt).format('DD.MM.YYYY')}\n\n`;
      }
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '👀 Tafsilot', callback_data: `user_details_${users[0]._id}` },
            { text: '🔒 Bloklash', callback_data: `block_user_${users[0]._id}` }
          ],
          [
            { text: '🔙 Ortga', callback_data: 'admin_users' }
          ]
        ]
      };
      
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      
      ctx.session.searchMode = null;
      
    } catch (error) {
      console.error('Handle user search error:', error);
      await ctx.reply('Qidirishda xatolik yuz berdi!');
    }
  }

  // Foydalanuvchi tafsilotlari
  static async viewUserDetails(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const userId = ctx.callbackQuery.data.split('_')[2];
      
      const user = await User.findById(userId);
      if (!user) {
        return await ctx.answerCbQuery('Foydalanuvchi topilmadi!');
      }
      
      const orderStats = await this.getUserOrderStats(userId);
      
      let message = `
👤 **Foydalanuvchi tafsilotlari**

**Shaxsiy ma'lumotlar:**
• Ism: ${user.firstName} ${user.lastName || ''}
• Telefon: ${user.phone || 'Yo\'q'}
• Username: ${user.username ? '@' + user.username : 'Yo\'q'}
• Til: ${user.language || 'Tanlanmagan'}

**Statistika:**
• Jami buyurtmalar: ${orderStats.totalOrders}
• Jami sarflagan: ${orderStats.totalSpent.toLocaleString()} so'm
• O'rtacha buyurtma: ${orderStats.avgOrderValue.toLocaleString()} so'm
• So'nggi buyurtma: ${orderStats.lastOrderDate || 'Yo\'q'}

**Holat:**
• Ro'yxatdan o'tgan: ${moment(user.createdAt).format('DD.MM.YYYY HH:mm')}
• So'nggi faollik: ${user.lastActivity ? moment(user.lastActivity).format('DD.MM.YYYY HH:mm') : 'Noma\'lum'}
• Holat: ${user.isBlocked ? '🔒 Bloklangan' : '✅ Faol'}
      `;
      
      const keyboard = AdminKeyboards.userDetails(user);
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup
      });
      
    } catch (error) {
      console.error('View user details error:', error);
      await ctx.answerCbQuery('Foydalanuvchi tafsilotlarini ko\'rsatishda xatolik!');
    }
  }

  // Foydalanuvchini bloklash/blokdan chiqarish
  static async toggleUserBlock(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const userId = ctx.callbackQuery.data.split('_')[2];
      
      const user = await User.findById(userId);
      if (!user) {
        return await ctx.answerCbQuery('Foydalanuvchi topilmadi!');
      }
      
      // Admin o'zini bloklay olmaydi
      if (this.isAdmin({ from: { id: user.telegramId } })) {
        return await ctx.answerCbQuery('Admin o\'zini bloklay olmaydi!');
      }
      
      user.isBlocked = !user.isBlocked;
      await user.save();
      
      const action = user.isBlocked ? 'bloklandi' : 'blokdan chiqarildi';
      await ctx.answerCbQuery(`✅ Foydalanuvchi ${action}!`);
      
      // Tafsilotlarni qayta ko'rsatish
      return await this.viewUserDetails(ctx);
      
    } catch (error) {
      console.error('Toggle user block error:', error);
      await ctx.answerCbQuery('Blok holatini o\'zgartirishda xatolik!');
    }
  }

  // Aktiv foydalanuvchilarni ko'rsatish
  static async showActiveUsers(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const users = await User.find({
        lastActivity: { $gte: moment().subtract(24, 'hours').toDate() },
        isBlocked: { $ne: true }
      })
      .sort({ lastActivity: -1 })
      .limit(20);
      
      if (users.length === 0) {
        return await ctx.editMessageText('📭 Faol foydalanuvchilar yo\'q!', {
          reply_markup: AdminKeyboards.backToAdmin().reply_markup
        });
      }
      
      let message = `👥 **Faol foydalanuvchilar** (${users.length})\n\n`;
      
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        message += `${i + 1}. **${user.firstName} ${user.lastName || ''}**\n`;
        message += `📱 ${user.phone || 'Telefon yo\'q'}\n`;
        message += `🕐 ${moment(user.lastActivity).fromNow()}\n\n`;
      }
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Yangilash', callback_data: 'users_active' },
            { text: '🔙 Ortga', callback_data: 'admin_users' }
          ]
        ]
      };
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      
    } catch (error) {
      console.error('Show active users error:', error);
      await ctx.answerCbQuery('Faol foydalanuvchilarni ko\'rsatishda xatolik!');
    }
  }

  // Broadcast xabar yuborish
  static async showBroadcast(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      await ctx.editMessageText(
        '📢 **Hammaga xabar yuborish**\n\nYubormoqchi bo\'lgan xabaringizni kiriting:',
        {
          parse_mode: 'Markdown',
          reply_markup: AdminKeyboards.backToAdmin().reply_markup
        }
      );
      
      ctx.session.broadcastMode = true;
      
    } catch (error) {
      console.error('Show broadcast error:', error);
      await ctx.answerCbQuery('Broadcast rejimini ochishda xatolik!');
    }
  }

  // Broadcast xabarni yuborish
  static async sendBroadcast(ctx, message) {
    try {
      const users = await User.find({ 
        isBlocked: { $ne: true },
        telegramId: { $exists: true }
      });
      
      let successCount = 0;
      let failCount = 0;
      
      const statusMessage = await ctx.reply(
        `📤 Xabar yuborilmoqda...\nJami: ${users.length} foydalanuvchi`
      );
      
      for (const user of users) {
        try {
          await ctx.telegram.sendMessage(user.telegramId, message);
          successCount++;
          
          // Har 50 ta yuborilgandan keyin status yangilanadi
          if (successCount % 50 === 0) {
            await ctx.telegram.editMessageText(
              statusMessage.chat.id,
              statusMessage.message_id,
              null,
              `📤 Yuborilmoqda...\n✅ Yuborildi: ${successCount}\n❌ Xatolik: ${failCount}\nQoldi: ${users.length - successCount - failCount}`
            );
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          console.error(`Broadcast error for user ${user.telegramId}:`, error);
          failCount++;
        }
      }
      
      await ctx.telegram.editMessageText(
        statusMessage.chat.id,
        statusMessage.message_id,
        null,
        `✅ **Broadcast yakunlandi!**\n\n📊 Natijalar:\n• Yuborildi: ${successCount}\n• Xatolik: ${failCount}\n• Jami: ${users.length}`
      );
      
      ctx.session.broadcastMode = false;
      
    } catch (error) {
      console.error('Send broadcast error:', error);
      await ctx.reply('Broadcast yuborishda xatolik yuz berdi!');
    }
  }

  // Helper methods
  static async getUserStats() {
    try {
      const today = moment().startOf('day');
      const weekAgo = moment().subtract(7, 'days');
      const monthAgo = moment().subtract(30, 'days');
      
      const [totalUsers, todayRegistrations, todayActive, weekActive, monthActive] = await Promise.all([
        User.countDocuments({ isBlocked: { $ne: true } }),
        User.countDocuments({ 
          createdAt: { $gte: today.toDate() },
          isBlocked: { $ne: true }
        }),
        User.countDocuments({ 
          lastActivity: { $gte: today.toDate() },
          isBlocked: { $ne: true }
        }),
        User.countDocuments({ 
          lastActivity: { $gte: weekAgo.toDate() },
          isBlocked: { $ne: true }
        }),
        User.countDocuments({ 
          lastActivity: { $gte: monthAgo.toDate() },
          isBlocked: { $ne: true }
        })
      ]);
      
      const topCustomers = await Order.aggregate([
        { $group: { _id: '$user', totalOrders: { $sum: 1 } } },
        { $sort: { totalOrders: -1 } },
        { $limit: 1 }
      ]);
      
      return {
        totalUsers,
        activeUsers: monthActive,
        todayRegistrations,
        todayActive,
        weekActive,
        monthActive,
        topCustomers: topCustomers.length > 0 ? topCustomers[0].totalOrders : 0
      };
    } catch (error) {
      console.error('Get user stats error:', error);
      return {
        totalUsers: 0, activeUsers: 0, todayRegistrations: 0,
        todayActive: 0, weekActive: 0, monthActive: 0, topCustomers: 0
      };
    }
  }

  static async getUserOrderStats(userId) {
    try {
      const orders = await Order.find({ user: userId, status: { $ne: 'cancelled' } });
      
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
      const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
      const lastOrder = orders.sort((a, b) => b.createdAt - a.createdAt)[0];
      const lastOrderDate = lastOrder ? moment(lastOrder.createdAt).format('DD.MM.YYYY') : null;
      
      return {
        totalOrders,
        totalSpent,
        avgOrderValue,
        lastOrderDate
      };
    } catch (error) {
      console.error('Get user order stats error:', error);
      return {
        totalOrders: 0,
        totalSpent: 0,
        avgOrderValue: 0,
        lastOrderDate: null
      };
    }
  }

  static isAdmin(ctx) {
    const adminIds = process.env.ADMIN_ID ? 
      process.env.ADMIN_ID.split(',').map(id => parseInt(id.toString().trim())) : 
      [];
    return adminIds.includes(ctx.from.id);
  }
}

module.exports = UserHandlers;
