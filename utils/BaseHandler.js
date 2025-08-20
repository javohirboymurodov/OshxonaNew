// Base Handler Class - barcha admin handlerlar uchun umumiy funksiyalar
const { User } = require('../models');

/**
 * Base Handler - barcha handler classlar uchun umumiy metodlar
 */
class BaseHandler {
  /**
   * Admin huquqlarini tekshirish
   * @param {Object} ctx - Telegraf context
   * @returns {boolean} - admin yoki yo'q
   */
  static isAdmin(ctx) {
    try {
      const adminIds = process.env.ADMIN_ID ? 
        process.env.ADMIN_ID.split(',').map((id) => parseInt(id.trim())) : [];
      return adminIds.includes(ctx.from.id);
    } catch (error) {
      console.error('isAdmin check error:', error);
      return false;
    }
  }

  /**
   * Superadmin huquqlarini tekshirish
   * @param {Object} ctx - Telegraf context
   * @returns {boolean} - superadmin yoki yo'q
   */
  static async isSuperAdmin(ctx) {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      return user && user.role === 'superadmin';
    } catch (error) {
      console.error('isSuperAdmin check error:', error);
      return false;
    }
  }

  /**
   * Foydalanuvchi rolini olish
   * @param {Object} ctx - Telegraf context
   * @returns {string|null} - user role yoki null
   */
  static async getUserRole(ctx) {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      return user ? user.role : null;
    } catch (error) {
      console.error('getUserRole error:', error);
      return null;
    }
  }

  /**
   * Xatolik xabarini yuborish
   * @param {Object} ctx - Telegraf context
   * @param {string} message - xatolik xabari
   * @param {Object} error - error object (optional)
   */
  static async sendErrorMessage(ctx, message = '❌ Xatolik yuz berdi!', error = null) {
    try {
      if (error) {
        console.error('Handler error:', error);
      }
      
      if (ctx.answerCbQuery) {
        await ctx.answerCbQuery(message);
      } else if (ctx.reply) {
        await ctx.reply(message);
      }
    } catch (err) {
      console.error('sendErrorMessage failed:', err);
    }
  }

  /**
   * Muvaffaqiyat xabarini yuborish
   * @param {Object} ctx - Telegraf context
   * @param {string} message - muvaffaqiyat xabari
   */
  static async sendSuccessMessage(ctx, message = '✅ Muvaffaqiyatli!') {
    try {
      if (ctx.answerCbQuery) {
        await ctx.answerCbQuery(message);
      } else if (ctx.reply) {
        await ctx.reply(message);
      }
    } catch (error) {
      console.error('sendSuccessMessage failed:', error);
    }
  }

  /**
   * Xabarni formatlash (Markdown bilan)
   * @param {string} title - sarlavha
   * @param {Object} data - ma'lumotlar
   * @param {Object} stats - statistikalar (optional)
   * @returns {string} - formatlanagan xabar
   */
  static formatMessage(title, data = {}, stats = null) {
    try {
      let message = `${title}\n\n`;
      
      if (stats) {
        message += '📊 **Statistika:**\n';
        Object.entries(stats).forEach(([key, value]) => {
          const displayKey = this.getDisplayKey(key);
          message += `• ${displayKey}: ${this.formatValue(value)}\n`;
        });
        message += '\n';
      }
      
      if (Object.keys(data).length > 0) {
        Object.entries(data).forEach(([key, value]) => {
          const displayKey = this.getDisplayKey(key);
          message += `**${displayKey}:** ${this.formatValue(value)}\n`;
        });
      }
      
      return message;
    } catch (error) {
      console.error('formatMessage error:', error);
      return title;
    }
  }

  /**
   * Key nomlarini foydalanuvchi uchun tushunarli qilish
   * @param {string} key - kalit nomi
   * @returns {string} - tushunarli nom
   */
  static getDisplayKey(key) {
    const keyMap = {
      'totalProducts': 'Jami mahsulotlar',
      'activeProducts': 'Faol mahsulotlar', 
      'inactiveProducts': 'Nofaol mahsulotlar',
      'totalCategories': 'Kategoriyalar',
      'minPrice': 'Eng arzon',
      'maxPrice': 'Eng qimmat',
      'avgPrice': 'O\'rtacha',
      'totalOrders': 'Jami buyurtmalar',
      'newOrders': 'Yangi',
      'preparingOrders': 'Tayyorlanayotgan',
      'readyOrders': 'Tayyor',
      'completedOrders': 'Yakunlangan',
      'cancelledOrders': 'Bekor qilingan',
      'totalUsers': 'Jami foydalanuvchilar',
      'activeUsers': 'Faol foydalanuvchilar',
      'blockedUsers': 'Bloklangan',
      'new': 'Yangi',
      'preparing': 'Tayyorlanayotgan', 
      'ready': 'Tayyor',
      'delivering': 'Yetkazilayotgan',
      'completed': 'Yakunlangan',
      'cancelled': 'Bekor qilingan',
      'total': 'Jami'
    };
    
    return keyMap[key] || key;
  }

  /**
   * Qiymatlarni formatlash
   * @param {any} value - qiymat
   * @returns {string} - formatlanagan qiymat
   */
  static formatValue(value) {
    try {
      if (typeof value === 'number') {
        // Narx kabi katta raqamlar uchun
        if (value > 1000) {
          return value.toLocaleString() + (value > 10000 ? ' so\'m' : '');
        }
        return value.toString();
      }
      
      if (typeof value === 'boolean') {
        return value ? '✅ Ha' : '❌ Yo\'q';
      }
      
      if (value instanceof Date) {
        return value.toLocaleDateString('uz-UZ');
      }
      
      return String(value);
    } catch (error) {
      console.error('formatValue error:', error);
      return String(value);
    }
  }

  /**
   * Pagination uchun offset va limit hisoblash
   * @param {number} page - sahifa raqami (1-dan boshlanadi)
   * @param {number} limit - sahifa o'lchami (default: 10)
   * @returns {Object} - {offset, limit}
   */
  static getPagination(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    return { offset, limit };
  }

  /**
   * Callback ma'lumotlaridan ID ajratish
   * @param {string} callbackData - callback ma'lumoti
   * @param {string} prefix - prefix pattern
   * @returns {string|null} - ID yoki null
   */
  static extractIdFromCallback(callbackData, prefix) {
    try {
      const regex = new RegExp(`${prefix}([0-9a-fA-F]{24})`);
      const match = callbackData.match(regex);
      return match ? match[1] : null;
    } catch (error) {
      console.error('extractIdFromCallback error:', error);
      return null;
    }
  }

  /**
   * Time ago formatini yaratish (necha vaqt oldin)
   * @param {Date} date - sana
   * @returns {string} - "2 soat oldin" kabi format
   */
  static timeAgo(date) {
    try {
      const now = new Date();
      const diffMs = now - new Date(date);
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 1) return 'Hozirgina';
      if (diffMins < 60) return `${diffMins} daqiqa oldin`;
      if (diffHours < 24) return `${diffHours} soat oldin`;
      if (diffDays < 30) return `${diffDays} kun oldin`;
      
      return date.toLocaleDateString('uz-UZ');
    } catch (error) {
      console.error('timeAgo error:', error);
      return 'Noma\'lum vaqt';
    }
  }

  /**
   * Fayl o'lchamini inson tushunadigan formatga aylantirish
   * @param {number} bytes - bytes miqdori
   * @returns {string} - "2.5 MB" kabi format
   */
  static formatFileSize(bytes) {
    try {
      if (bytes === 0) return '0 Bytes';
      
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    } catch (error) {
      console.error('formatFileSize error:', error);
      return 'Noma\'lum o\'lcham';
    }
  }

  /**
   * Safe JSON parse - xatolik bo'lsa default qiymat qaytaradi
   * @param {string} jsonString - JSON string
   * @param {any} defaultValue - default qiymat
   * @returns {any} - parse qilingan object yoki default
   */
  static safeJsonParse(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('safeJsonParse error:', error);
      return defaultValue;
    }
  }

  /**
   * MongoDB ObjectId validatsiyasi
   * @param {string} id - tekshirilayotgan ID
   * @returns {boolean} - to'g'ri ObjectId yoki yo'q
   */
  static isValidObjectId(id) {
    try {
      const mongoose = require('mongoose');
      return mongoose.Types.ObjectId.isValid(id);
    } catch (error) {
      console.error('isValidObjectId error:', error);
      return false;
    }
  }

  /**
   * Async operatsiyalarni safe bajarish
   * @param {Function} asyncFn - async function
   * @param {Object} ctx - context
   * @param {string} errorMessage - xatolik xabari
   */
  static async safeExecute(asyncFn, ctx, errorMessage = '❌ Xatolik yuz berdi!') {
    try {
      await asyncFn();
    } catch (error) {
      console.error('safeExecute error:', error);
      await this.sendErrorMessage(ctx, errorMessage, error);
    }
  }
}

module.exports = BaseHandler;
