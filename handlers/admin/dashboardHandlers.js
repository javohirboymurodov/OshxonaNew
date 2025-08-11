const { User, Order, Product, Category } = require('../../models');
const AdminKeyboards = require('../../keyboards/adminKeyboards');
const moment = require('moment');

class DashboardHandlers {
  // Admin panel asosiy menyu
  static async showAdminPanel(ctx) {
    return this.adminPanelHandler(ctx);
  }

  static async adminPanelHandler(ctx) {
    try {
      // Admin tekshiruvi
      if (!this.isAdmin(ctx)) {
        if (ctx.callbackQuery) {
          return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
        } else {
          return await ctx.reply('❌ Sizda admin huquqi yo\'q!');
        }
      }
      
      const message = `
👨‍💼 **Admin Panel**

Xush kelibsiz, admin! Boshqaruv panelidan foydalaning:

📊 **Tezkor ma'lumotlar:**
• Bugungi buyurtmalar: ${await this.getTodayOrdersCount()}
• Faol foydalanuvchilar: ${await this.getActiveUsersCount()}
• Kutilayotgan buyurtmalar: ${await this.getPendingOrdersCount()}
• Jami mahsulotlar: ${await this.getTotalProductsCount()}
• Jami kategoriyalar: ${await this.getTotalCategoriesCount()}
      `;
      
      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: AdminKeyboards.adminPanel().reply_markup
        });
      } else {
        await ctx.replyWithMarkdown(message, AdminKeyboards.adminPanel());
      }
      
    } catch (error) {
      console.error('Admin panel error:', error);
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('Admin panelni yuklashda xatolik!');
      } else {
        await ctx.reply('❌ Admin panelni yuklashda xatolik!');
      }
    }
  }

  // Helper metodlar
  static async getTodayOrdersCount() {
    try {
      const today = moment().startOf('day');
      const tomorrow = moment().endOf('day');
      
      return await Order.countDocuments({
        createdAt: { $gte: today.toDate(), $lte: tomorrow.toDate() }
      });
    } catch (error) {
      console.error('Get today orders count error:', error);
      return 0;
    }
  }

  static async getActiveUsersCount() {
    try {
      const yesterday = moment().subtract(1, 'day').toDate();
      
      return await User.countDocuments({
        updatedAt: { $gte: yesterday }
      });
    } catch (error) {
      console.error('Get active users count error:', error);
      return 0;
    }
  }

  static async getPendingOrdersCount() {
    try {
      return await Order.countDocuments({
        status: 'pending'
      });
    } catch (error) {
      console.error('Get pending orders count error:', error);
      return 0;
    }
  }

  static async getTotalProductsCount() {
    try {
      return await Product.countDocuments({
        isActive: true
      });
    } catch (error) {
      console.error('Get total products count error:', error);
      return 0;
    }
  }

  static async getTotalCategoriesCount() {
    try {
      return await Category.countDocuments({
        isActive: true
      });
    } catch (error) {
      console.error('Get total categories count error:', error);
      return 0;
    }
  }

  // Admin tekshiruvi
  static isAdmin(ctx) {
    const adminIds = process.env.ADMIN_ID ? 
      process.env.ADMIN_ID.split(',').map(id => parseInt(id.toString().trim())) : 
      [];
    return adminIds.includes(ctx.from.id);
  }
}

module.exports = DashboardHandlers;
