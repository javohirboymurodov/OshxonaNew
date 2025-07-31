const { PromoCode, User } = require('../models');

class PromoService {
  // Promo kodni tekshirish
  static async validatePromoCode(code, userId, orderAmount, orderType = 'delivery') {
    try {
      const promoCode = await PromoCode.findOne({ 
        code: code.toUpperCase(),
        isActive: true 
      });
      
      if (!promoCode) {
        return {
          isValid: false,
          message: 'Promo kod topilmadi'
        };
      }
      
      if (!promoCode.isValid()) {
        return {
          isValid: false,
          message: 'Promo kod muddati tugagan yoki nofaol'
        };
      }
      
      if (!promoCode.canUseBy(userId, orderAmount, orderType)) {
        return {
          isValid: false,
          message: 'Promo kod sizning buyurtmangiz uchun mos emas'
        };
      }
      
      const discount = promoCode.calculateDiscount(orderAmount);
      
      return {
        isValid: true,
        promoCode,
        discount,
        message: `Chegirma: ${discount.toLocaleString()} so'm`
      };
      
    } catch (error) {
      console.error('Promo code validation error:', error);
      return {
        isValid: false,
        message: 'Promo kodni tekshirishda xatolik'
      };
    }
  }
  
  // Promo kodni qo'llash
  static async applyPromoCode(code, userId, orderAmount, orderType = 'delivery') {
    try {
      const validation = await this.validatePromoCode(code, userId, orderAmount, orderType);
      
      if (!validation.isValid) {
        return validation;
      }
      
      const { promoCode, discount } = validation;
      
      // Promo kod ishlatilganini belgilash
      await promoCode.use(userId, orderAmount, discount);
      
      // Foydalanuvchiga loyalty points berish
      const user = await User.findById(userId);
      if (user) {
        await user.addLoyaltyPoints(Math.floor(discount / 1000)); // Har 1000 so'm uchun 1 ball
      }
      
      return {
        isValid: true,
        discount,
        promoCode,
        message: `${code} promo kodi muvaffaqiyatli qo'llandi`
      };
      
    } catch (error) {
      console.error('Promo code apply error:', error);
      return {
        isValid: false,
        message: 'Promo kodni qo\'llashda xatolik'
      };
    }
  }
  
  // Foydalanuvchi uchun mavjud promo kodlar
  static async getAvailablePromoCodes(userId, orderAmount = 0, orderType = 'delivery') {
    try {
      const promoCodes = await PromoCode.find({
        isActive: true,
        validFrom: { $lte: new Date() },
        $or: [
          { validUntil: { $gte: new Date() } },
          { validUntil: null }
        ]
      }).sort({ discountValue: -1 });
      
      const availableCodes = [];
      
      for (const promo of promoCodes) {
        if (promo.canUseBy(userId, orderAmount, orderType)) {
          availableCodes.push({
            code: promo.code,
            name: promo.name,
            description: promo.description,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            minOrderAmount: promo.minOrderAmount,
            validUntil: promo.validUntil
          });
        }
      }
      
      return availableCodes;
    } catch (error) {
      console.error('Get available promo codes error:', error);
      return [];
    }
  }
  
  // Avtomatik promo kod taklif qilish
  static async suggestPromoCode(userId, orderAmount, orderType = 'delivery') {
    try {
      const availableCodes = await this.getAvailablePromoCodes(userId, orderAmount, orderType);
      
      if (availableCodes.length === 0) {
        return null;
      }
      
      // Eng yaxshi promo kodni tanlash
      let bestPromo = null;
      let maxDiscount = 0;
      
      for (const promo of availableCodes) {
        const promoCode = await PromoCode.findOne({ code: promo.code });
        const discount = promoCode.calculateDiscount(orderAmount);
        
        if (discount > maxDiscount) {
          maxDiscount = discount;
          bestPromo = promo;
        }
      }
      
      return bestPromo;
    } catch (error) {
      console.error('Suggest promo code error:', error);
      return null;
    }
  }
  
  // Promo kod yaratish (admin uchun)
  static async createPromoCode(data) {
    try {
      const promoCode = new PromoCode(data);
      await promoCode.save();
      
      return {
        success: true,
        promoCode,
        message: 'Promo kod muvaffaqiyatli yaratildi'
      };
    } catch (error) {
      console.error('Create promo code error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  // Promo kod statistikasi
  static async getPromoCodeStats(code) {
    try {
      const promoCode = await PromoCode.findOne({ code: code.toUpperCase() })
        .populate('usedBy.user', 'firstName lastName phone');
      
      if (!promoCode) {
        return {
          success: false,
          message: 'Promo kod topilmadi'
        };
      }
      
      const totalDiscount = promoCode.usedBy.reduce((sum, usage) => sum + usage.discountAmount, 0);
      const totalOrders = promoCode.usedBy.reduce((sum, usage) => sum + usage.orderAmount, 0);
      
      return {
        success: true,
        stats: {
          code: promoCode.code,
          name: promoCode.name,
          usageCount: promoCode.usageCount,
          usageLimit: promoCode.usageLimit,
          totalDiscount,
          totalOrders,
          averageDiscount: promoCode.usageCount > 0 ? Math.round(totalDiscount / promoCode.usageCount) : 0,
          recentUsages: promoCode.usedBy.slice(-10) // Son 10 ta ishlatilgan
        }
      };
    } catch (error) {
      console.error('Get promo code stats error:', error);
      return {
        success: false,
        message: 'Statistika olishda xatolik'
      };
    }
  }
}

module.exports = PromoService;