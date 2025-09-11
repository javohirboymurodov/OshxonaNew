const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Loyalty va Rewards tizimi
class LoyaltyService {
  // Loyalty points hisoblash
  static async calculatePoints(orderAmount, userId) {
    const user = await User.findById(userId);
    if (!user) return 0;
    
    const basePoints = Math.floor(orderAmount / 1000); // Har 1000 so'm uchun 1 ball
    
    let multiplier = 1;
    
    // VIP status bo'yicha multiplier
    if (user.stats.totalOrders >= 50) multiplier = 1.5;
    else if (user.stats.totalOrders >= 20) multiplier = 1.3;
    else if (user.stats.totalOrders >= 10) multiplier = 1.2;
    
    // Maxsus kunlar uchun bonus
    const today = new Date();
    if (today.getDay() === 0) multiplier *= 1.2; // Yakshanba kuni 20% bonus
    
    return Math.floor(basePoints * multiplier);
  }

  // Loyalty level aniqlash
  static getLoyaltyLevel(totalSpent, totalOrders) {
    if (totalSpent >= 1000000 && totalOrders >= 50) return 'DIAMOND';
    if (totalSpent >= 500000 && totalOrders >= 30) return 'GOLD';
    if (totalSpent >= 200000 && totalOrders >= 15) return 'SILVER';
    if (totalSpent >= 50000 && totalOrders >= 5) return 'BRONZE';
    return 'STARTER';
  }

  // User loyallik darajasini yangilash
  static async updateUserLoyaltyLevel(userId) {
    const user = await User.findById(userId);
    if (!user) return null;

    // Rolling window: oxirgi 180 kun
    const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const recentOrders = await Order.find({ user: userId, paymentStatus: 'paid', updatedAt: { $gte: cutoff } }).select('total');
    const windowSpent = recentOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const windowOrders = recentOrders.length;

    const newLevel = this.getLoyaltyLevel(windowSpent, windowOrders);
    const oldLevel = user.loyaltyLevel;

    if (newLevel !== oldLevel) {
      user.loyaltyLevel = newLevel;
      await user.save();

      // Level up bonusi
      if (this.getLevelRank(newLevel) > this.getLevelRank(oldLevel)) {
        await this.awardLevelUpBonus(userId, newLevel);
      }

      return { oldLevel, newLevel, levelUp: true };
    }

    return { oldLevel, newLevel, levelUp: false };
  }

  // Level rank olish (comparison uchun)
  static getLevelRank(level) {
    const ranks = { STARTER: 1, BRONZE: 2, SILVER: 3, GOLD: 4, DIAMOND: 5 };
    return ranks[level] || 1;
  }

  // Level up bonusi berish
  static async awardLevelUpBonus(userId, newLevel) {
    const bonuses = {
      BRONZE: 2000,
      SILVER: 5000,
      GOLD: 10000,
      DIAMOND: 20000
    };

    const bonusAmount = bonuses[newLevel];
    if (!bonusAmount) return;

    const user = await User.findById(userId);
    user.loyaltyPoints += bonusAmount;
    user.bonuses.push({
      type: 'loyalty_bonus',
      amount: bonusAmount,
      message: `🎉 ${newLevel} darajasiga ko'tarilganingiz uchun bonus!`,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 kun
    });

    await user.save();

    // Botga xabar yuborish
    const bot = global.botInstance;
    if (bot) {
      try {
        await bot.telegram.sendMessage(user.telegramId, 
          `🎊 Tabriklaymiz!\n\n🏆 Siz ${newLevel} darajasiga ko'tarildingiz!\n💰 Bonus: ${bonusAmount.toLocaleString()} ball\n\n⭐ Yangi imtiyozlaringiz bilan tanishing!`,
          {
            reply_markup: {
              inline_keyboard: [[
                { text: '💎 Mening darajam', callback_data: 'my_loyalty_level' },
                { text: '🎁 Bonuslarim', callback_data: 'my_bonuses' }
              ]]
            }
          }
        );
      } catch (error) {
        console.error('Level up notification error:', error);
      }
    }
  }

  // Chegirmalar hisoblash
  static async calculateLoyaltyDiscount(userId, orderAmount) {
    const user = await User.findById(userId);
    if (!user) return 0;
    
    const level = user.loyaltyLevel;
    
    const discounts = {
      'DIAMOND': 0.15, // 15%
      'GOLD': 0.10,    // 10%
      'SILVER': 0.07,  // 7%
      'BRONZE': 0.05,  // 5%
      'STARTER': 0.02  // 2%
    };
    
    return Math.floor(orderAmount * (discounts[level] || 0));
  }

  // Birthday bonus
  static async checkBirthdayBonus(userId) {
    const user = await User.findById(userId);
    if (!user || !user.birthDate) return null;
    
    const today = new Date();
    const birthDate = new Date(user.birthDate);
    
    // Birthday month check
    if (today.getMonth() === birthDate.getMonth() && 
        today.getDate() === birthDate.getDate()) {
      
      // Check if birthday bonus already given this year
      const thisYear = today.getFullYear();
      const birthdayBonusThisYear = user.bonuses.find(bonus => 
        bonus.type === 'birthday' && 
        new Date(bonus.createdAt).getFullYear() === thisYear
      );

      if (birthdayBonusThisYear) return null;

      // Add birthday bonus
      const bonusAmount = 10000;
      user.loyaltyPoints += bonusAmount;
      user.bonuses.push({
        type: 'birthday',
        amount: bonusAmount,
        message: '🎂 Tug\'ilgan kuningiz muborak! Maxsus bonus!',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 kun
      });

      await user.save();

      return {
        type: 'birthday',
        amount: bonusAmount,
        discount: 0.20, // 20% chegirma
        message: '🎂 Tug\'ilgan kuningiz muborak! 20% chegirma va 10,000 bonus ball!'
      };
    }
    
    return null;
  }

  // Referral tizimi
  static async processReferral(referrerId, newUserId) {
    const referrer = await User.findById(referrerId);
    const newUser = await User.findById(newUserId);
    
    if (!referrer || !newUser || newUser.referrals.referredBy) return false;
    
    // Yangi foydalanuvchiga bonus
    newUser.loyaltyPoints += 5000;
    newUser.referrals.referredBy = referrerId;
    newUser.bonuses.push({
      type: 'referral_welcome',
      amount: 5000,
      message: 'Xush kelibsiz bonusi!',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    
    // Referrer ga bonus
    referrer.loyaltyPoints += 3000;
    referrer.referrals.referredUsers.push(newUserId);
    referrer.referrals.totalReferrals += 1;
    referrer.bonuses.push({
      type: 'referral_reward',
      amount: 3000,
      message: `${newUser.firstName} ni taklif qilganingiz uchun bonus!`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    
    await newUser.save();
    await referrer.save();
    
    return true;
  }

  // Loyalty balllarni buyurtmaga qo'llash
  static async redeemPoints(userId, pointsToUse, orderAmount) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (pointsToUse > user.loyaltyPoints) {
      throw new Error('Insufficient loyalty points');
    }

    // 1 ball = 1 so'm
    const discount = Math.min(pointsToUse, Math.floor(orderAmount * 0.5)); // Maksimum 50% chegirma
    
    user.loyaltyPoints -= discount;
    await user.save();

    return discount;
  }

  // User loyalty ma'lumotlarini olish
  static async getUserLoyaltyInfo(userId) {
    const user = await User.findById(userId);
    if (!user) return null;

    const currentLevel = user.loyaltyLevel;
    const nextLevel = this.getNextLevel(currentLevel);
    const requiredForNext = this.getRequiredForNextLevel(user.stats.totalSpent, user.stats.totalOrders, nextLevel);

    return {
      currentLevel,
      nextLevel,
      loyaltyPoints: user.loyaltyPoints,
      totalSpent: user.stats.totalSpent,
      totalOrders: user.stats.totalOrders,
      requiredForNext,
      bonuses: user.bonuses.filter(bonus => !bonus.used && (!bonus.expiresAt || bonus.expiresAt > new Date())),
      benefits: this.getLevelBenefits(currentLevel)
    };
  }

  static getNextLevel(currentLevel) {
    const levels = ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'DIAMOND'];
    const currentIndex = levels.indexOf(currentLevel);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
  }

  static getRequiredForNextLevel(currentSpent, currentOrders, nextLevel) {
    if (!nextLevel) return null;

    const requirements = {
      BRONZE: { spent: 50000, orders: 5 },
      SILVER: { spent: 200000, orders: 15 },
      GOLD: { spent: 500000, orders: 30 },
      DIAMOND: { spent: 1000000, orders: 50 }
    };

    const req = requirements[nextLevel];
    if (!req) return null;

    return {
      spentNeeded: Math.max(0, req.spent - currentSpent),
      ordersNeeded: Math.max(0, req.orders - currentOrders)
    };
  }

  static getLevelBenefits(level) {
    const benefits = {
      STARTER: ['2% chegirma', 'Standart yetkazib berish'],
      BRONZE: ['5% chegirma', 'Tez yetkazib berish', '1.2x bonus balllar'],
      SILVER: ['7% chegirma', 'Bepul yetkazib berish', '1.3x bonus balllar', 'Maxsus aksiyalar'],
      GOLD: ['10% chegirma', 'Premium yetkazib berish', '1.5x bonus balllar', 'VIP qo\'llab-quvvatlash'],
      DIAMOND: ['15% chegirma', '24/7 yetkazib berish', '1.5x bonus balllar', 'Shaxsiy manager', 'Eksklyuziv menyu']
    };

    return benefits[level] || benefits.STARTER;
  }

  // Buyurtma yakunlanganda loyallik balllarini qo'shish
  static async processOrderCompletion(orderId) {
    const order = await Order.findById(orderId).populate('user');
    if (!order || !order.user) return;

    const userId = order.user._id;
    const orderAmount = order.total;

    // Loyalty balllarni hisoblash va qo'shish
    const earnedPoints = await this.calculatePoints(orderAmount, userId);
    
    const user = await User.findById(userId);
    user.loyaltyPoints += earnedPoints;
    user.stats.totalOrders += 1;
    user.stats.totalSpent += orderAmount;
    user.stats.lastOrderDate = new Date();

    await user.save();

    // Loyalty darajasini yangilash
    const levelUpdate = await this.updateUserLoyaltyLevel(userId);

    // Birthday bonusini tekshirish
    await this.checkBirthdayBonus(userId);

    return {
      earnedPoints,
      totalPoints: user.loyaltyPoints,
      levelUpdate
    };
  }

  // Referral bonus on first paid order only
  static async awardReferralOnFirstOrder(newUserId, referrerId) {
    try {
      const newUser = await User.findById(newUserId);
      const referrer = await User.findById(referrerId);
      if (!newUser || !referrer) return false;
      // Prevent double-award: check if welcome already used
      const already = newUser.bonuses?.some(b => b.type === 'referral_welcome' && b.used === false);
      if (!newUser.referrals?.referredBy || String(newUser.referrals.referredBy) !== String(referrerId)) return false;

      if (!already) {
        newUser.loyaltyPoints += 5000;
        newUser.bonuses.push({ type: 'referral_welcome', amount: 5000, message: 'Xush kelibsiz bonusi!', expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
        await newUser.save();
      }

      referrer.loyaltyPoints += 3000;
      referrer.bonuses.push({ type: 'referral_reward', amount: 3000, message: `${newUser.firstName} ni taklif qilganingiz uchun bonus!`, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
      await referrer.save();
      return true;
    } catch (e) {
      console.error('awardReferralOnFirstOrder error:', e);
      return false;
    }
  }
}

module.exports = LoyaltyService;