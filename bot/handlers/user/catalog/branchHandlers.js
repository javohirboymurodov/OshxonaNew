// Branch Handlers Module
const { Branch } = require('../../../../models');
const { branchesKeyboard } = require('../../../user/keyboards');
const geoService = require('../../../../services/geoService');
const BaseHandler = require('../../../../utils/BaseHandler');

/**
 * Branch Management Handler - filiallarni boshqarish
 */
class BranchHandlers extends BaseHandler {
  /**
   * Filiallar ro'yxatini ko'rsatish
   * @param {Object} ctx - Telegraf context
   * @param {number} page - sahifa raqami
   */
  static async showBranches(ctx, page = 1) {
    return this.safeExecute(async () => {
      const branches = await Branch.find({ isActive: true })
        .select('name title address phone workingHours')
        .sort({ name: 1 });

      if (branches.length === 0) {
        return await ctx.reply('🤷‍♂️ Hozircha faol filiallar mavjud emas');
      }

      const message = '🏢 **Filiallar**\n\nFilial tanlang yoki "Eng yaqin filial" tugmasini bosing:';

      await ctx.reply(message, { 
        parse_mode: 'Markdown',
        reply_markup: branchesKeyboard(branches, page).reply_markup 
      });
    }, ctx, '❌ Filiallarni ko\'rsatishda xatolik');
  }

  /**
   * Filial tafsilotlarini ko'rsatish
   * @param {Object} ctx - Telegraf context
   * @param {Object} branch - filial obyekti
   * @param {Array} nearby - yaqin atrofdagi filiallar
   */
  static async showBranchDetails(ctx, branch, nearby = []) {
    try {
      const name = branch.name || branch.title || 'Filial';
      const lat = branch.address?.coordinates?.latitude;
      const lon = branch.address?.coordinates?.longitude;
      
      let message = `🏢 **${name}**\n\n`;
      
      // Address
      if (branch.address?.street || branch.address?.formatted) {
        const address = branch.address.formatted || 
          `${branch.address.street || ''} ${branch.address.district || ''}`.trim();
        message += `📍 **Manzil:** ${address}\n`;
      }

      // Phone
      if (branch.phone) {
        message += `📞 **Telefon:** ${branch.phone}\n`;
      }

      // Working hours
      const workingHours = this.formatWorkingHours(branch);
      message += `⏰ **Ish vaqti:** ${workingHours}\n`;

      // Location link
      if (lat && lon) {
        const yandexLink = this.buildYandexLink(lat, lon);
        message += `🗺️ [Xaritada ko'rish](${yandexLink})\n`;
      }

      // Nearby branches
      if (nearby && nearby.length > 0) {
        message += '\n🌟 **Yaqin atrofdagi filiallar:**\n';
        nearby.slice(0, 3).forEach((nearBranch, index) => {
          message += `${index + 1}. ${nearBranch.name} (${nearBranch.distance?.toFixed(1)} km)\n`;
        });
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔙 Filiallar ro\'yxati', callback_data: 'show_branches' }],
          [{ text: '🏠 Bosh sahifa', callback_data: 'back_to_main' }]
        ]
      };

      // Add location sharing if coordinates available
      if (lat && lon) {
        keyboard.inline_keyboard.unshift([
          { text: '📍 Joylashuvni ulashish', callback_data: `share_branch_location_${branch._id}` }
        ]);
      }

      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
          disable_web_page_preview: true
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
          disable_web_page_preview: true
        });
      }
    } catch (error) {
      console.error('Show branch details error:', error);
      await ctx.reply('❌ Filial ma\'lumotlarini ko\'rsatishda xatolik');
    }
  }

  /**
   * Eng yaqin filialni topish
   * @param {number} lat - kenglik
   * @param {number} lon - uzunlik
   * @returns {Object} - eng yaqin filial va masofasi
   */
  static async findNearestBranch(lat, lon) {
    try {
      if (!lat || !lon || typeof lat !== 'number' || typeof lon !== 'number') {
        return null;
      }

      const branches = await Branch.find({ isActive: true });
      let nearest = null;
      let minDistance = Infinity;
      const nearby = [];

      for (const branch of branches) {
        const branchLat = branch.address?.coordinates?.latitude;
        const branchLon = branch.address?.coordinates?.longitude;

        if (branchLat && branchLon) {
          const distance = this.calculateDistance(lat, lon, branchLat, branchLon);
          
          nearby.push({
            ...branch.toObject(),
            distance
          });

          if (distance < minDistance) {
            minDistance = distance;
            nearest = { ...branch.toObject(), distance };
          }
        }
      }

      // Sort nearby branches by distance
      nearby.sort((a, b) => a.distance - b.distance);

      return {
        nearest,
        nearby: nearby.slice(0, 5), // Top 5 nearest
        totalFound: nearby.length
      };
    } catch (error) {
      console.error('Find nearest branch error:', error);
      return null;
    }
  }

  /**
   * Filial joylashuvini ulashish
   * @param {Object} ctx - Telegraf context
   * @param {string} branchId - filial ID
   */
  static async shareBranchLocation(ctx, branchId) {
    return this.safeExecute(async () => {
      if (!this.isValidObjectId(branchId)) {
        return await ctx.answerCbQuery('❌ Filial ID noto\'g\'ri!');
      }

      const branch = await Branch.findById(branchId);
      if (!branch || !branch.isActive) {
        return await ctx.answerCbQuery('❌ Filial topilmadi!');
      }

      const lat = branch.address?.coordinates?.latitude;
      const lon = branch.address?.coordinates?.longitude;

      if (!lat || !lon) {
        return await ctx.answerCbQuery('❌ Filial joylashuvi mavjud emas!');
      }

      const title = branch.name || branch.title || 'Filial';
      const address = branch.address?.formatted || branch.address?.street || '';

      await ctx.replyWithLocation(lat, lon);
      await ctx.reply(`📍 **${title}**\n📮 ${address}`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Filiallar ro\'yxati', callback_data: 'show_branches' }],
            [{ text: '🏠 Bosh sahifa', callback_data: 'back_to_main' }]
          ]
        }
      });

      if (ctx.answerCbQuery) await ctx.answerCbQuery('✅ Joylashuv ulashildi');
    }, ctx, '❌ Joylashuvni ulashishda xatolik!');
  }

  /**
   * Ish vaqtini formatlash
   * @param {Object} branch - filial obyekti
   * @returns {string} - formatli ish vaqti
   */
  static formatWorkingHours(branch) {
    try {
      const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const today = new Date();
      const dayKey = days[today.getDay()];
      
      const workingHours = branch?.workingHours?.[dayKey];
      
      if (workingHours && workingHours.isOpen !== false && workingHours.open && workingHours.close) {
        return `${workingHours.open}-${workingHours.close}`;
      }
      
      // Default working hours
      return '10:00-22:00';
    } catch (error) {
      console.warn('Format working hours error:', error);
      return '10:00-22:00';
    }
  }

  /**
   * Yandex Maps havolasini yaratish
   * @param {number} lat - kenglik
   * @param {number} lon - uzunlik
   * @returns {string} - Yandex Maps havolasi
   */
  static buildYandexLink(lat, lon) {
    if (typeof lat === 'number' && typeof lon === 'number') {
      return `https://yandex.uz/maps/?pt=${lon},${lat}&z=16&l=map`;
    }
    return 'https://yandex.uz/maps/';
  }

  /**
   * Ikki nuqta orasidagi masofani hisoblash (Haversine formula)
   * @param {number} lat1 - birinchi nuqta kengligi
   * @param {number} lon1 - birinchi nuqta uzunligi
   * @param {number} lat2 - ikkinchi nuqta kengligi
   * @param {number} lon2 - ikkinchi nuqta uzunligi
   * @returns {number} - masofa (km)
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    try {
      const R = 6371; // Earth's radius in kilometers
      const dLat = this.deg2rad(lat2 - lat1);
      const dLon = this.deg2rad(lon2 - lon1);
      
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    } catch (error) {
      console.error('Calculate distance error:', error);
      return Infinity;
    }
  }

  /**
   * Darajani radianga o'girish
   * @param {number} deg - daraja
   * @returns {number} - radian
   */
  static deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * Filial ish vaqtini tekshirish
   * @param {Object} branch - filial obyekti
   * @returns {Object} - ish vaqti ma'lumotlari
   */
  static checkWorkingStatus(branch) {
    try {
      const now = new Date();
      const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const dayKey = days[now.getDay()];
      const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight
      
      const workingHours = branch?.workingHours?.[dayKey];
      
      if (!workingHours || workingHours.isOpen === false) {
        return { isOpen: false, message: 'Bugun dam olish kuni' };
      }

      const [openHour, openMin] = (workingHours.open || '10:00').split(':').map(Number);
      const [closeHour, closeMin] = (workingHours.close || '22:00').split(':').map(Number);
      
      const openTime = openHour * 60 + openMin;
      const closeTime = closeHour * 60 + closeMin;
      
      if (currentTime >= openTime && currentTime <= closeTime) {
        const remainingMinutes = closeTime - currentTime;
        const remainingHours = Math.floor(remainingMinutes / 60);
        const remainingMins = remainingMinutes % 60;
        
        return { 
          isOpen: true, 
          message: `Ochiq (${remainingHours}:${remainingMins.toString().padStart(2, '0')} gacha)` 
        };
      } else if (currentTime < openTime) {
        const openingMinutes = openTime - currentTime;
        const openingHours = Math.floor(openingMinutes / 60);
        const openingMins = openingMinutes % 60;
        
        return { 
          isOpen: false, 
          message: `${openingHours}:${openingMins.toString().padStart(2, '0')} da ochiladi` 
        };
      } else {
        return { 
          isOpen: false, 
          message: `Bugun yopilgan (ertaga ${workingHours.open} da)` 
        };
      }
    } catch (error) {
      console.error('Check working status error:', error);
      return { isOpen: true, message: 'Ma\'lumot yo\'q' };
    }
  }

  /**
   * Filial qidiruv
   * @param {string} searchTerm - qidiruv atamasi
   * @returns {Array} - topilgan filiallar
   */
  static async searchBranches(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return [];
      }

      const branches = await Branch.find({
        isActive: true,
        $or: [
          { name: { $regex: searchTerm.trim(), $options: 'i' } },
          { title: { $regex: searchTerm.trim(), $options: 'i' } },
          { 'address.street': { $regex: searchTerm.trim(), $options: 'i' } },
          { 'address.district': { $regex: searchTerm.trim(), $options: 'i' } },
          { 'address.formatted': { $regex: searchTerm.trim(), $options: 'i' } }
        ]
      }).sort({ name: 1 }).limit(10);

      return branches;
    } catch (error) {
      console.error('Search branches error:', error);
      return [];
    }
  }
}

module.exports = BranchHandlers;
