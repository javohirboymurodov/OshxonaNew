// Loyalty va Rewards tizimi
class LoyaltyService {
  // Loyalty points hisoblash
  static async calculatePoints(orderAmount, userId) {
    const user = await User.findById(userId);
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

  // Chegirmalar hisoblash
  static async calculateLoyaltyDiscount(userId, orderAmount) {
    const user = await User.findById(userId);
    const level = this.getLoyaltyLevel(user.stats.totalSpent, user.stats.totalOrders);
    
    const discounts = {
      'DIAMOND': 0.15, // 15%
      'GOLD': 0.10,    // 10%
      'SILVER': 0.07,  // 7%
      'BRONZE': 0.05,  // 5%
      'STARTER': 0.02  // 2%
    };
    
    return Math.floor(orderAmount * discounts[level]);
  }

  // Birthday bonus
  static async checkBirthdayBonus(userId) {
    const user = await User.findById(userId);
    if (!user.birthDate) return null;
    
    const today = new Date();
    const birthDate = new Date(user.birthDate);
    
    if (today.getMonth() === birthDate.getMonth() && 
        today.getDate() === birthDate.getDate()) {
      return {
        type: 'birthday',
        discount: 0.20, // 20% chegirma
        message: '🎂 Tug\'ilgan kuningiz muborak! 20% chegirma!'
      };
    }
    
    return null;
  }

  // Referral tizimi
  static async processReferral(referrerId, newUserId) {
    const referrer = await User.findById(referrerId);
    const newUser = await User.findById(newUserId);
    
    if (!referrer || !newUser) return false;
    
    // Yangi foydalanuvchiga bonus
    newUser.loyaltyPoints += 5000;
    newUser.bonuses.push({
      type: 'referral_welcome',
      amount: 5000,
      message: 'Xush kelibsiz bonusi!'
    });
    
    // Referrer ga bonus
    referrer.loyaltyPoints += 3000;
    referrer.bonuses.push({
      type: 'referral_reward',
      amount: 3000,
      message: `${newUser.firstName} ni taklif qilganingiz uchun bonus!`
    });
    
    await newUser.save();
    await referrer.save();
    
    return true;
  }
}

// Dynamic Pricing tizimi
class PricingService {
  // Vaqt asosida narx o'zgarishi
  static async getDynamicPrice(productId, orderTime = new Date()) {
    const product = await Product.findById(productId);
    if (!product) return null;
    
    let price = product.price;
    const hour = orderTime.getHours();
    
    // Happy hour (14:00-16:00) - 10% chegirma
    if (hour >= 14 && hour < 16) {
      price *= 0.9;
    }
    
    // Kechki rush hour (18:00-21:00) - 5% qo'shimcha
    if (hour >= 18 && hour < 21) {
      price *= 1.05;
    }
    
    // Weekend premium (Friday-Sunday)
    const day = orderTime.getDay();
    if (day >= 5 || day === 0) {
      price *= 1.1;
    }
    
    return Math.round(price);
  }
  
  // Demand-based pricing
  static async calculateDemandPrice(productId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Bugungi buyurtmalar soni
    const todayOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today },
          'items.product': mongoose.Types.ObjectId(productId)
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.product': mongoose.Types.ObjectId(productId)
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$items.quantity' }
        }
      }
    ]);
    
    const quantity = todayOrders[0]?.totalQuantity || 0;
    
    // Talab yuqori bo'lsa narx oshirish
    if (quantity > 50) return 1.15; // 15% oshirish
    if (quantity > 30) return 1.10; // 10% oshirish
    if (quantity > 20) return 1.05; // 5% oshirish
    
    return 1.0; // Standart narx
  }
}

// Advanced Analytics
class AnalyticsService {
  // Customer Lifetime Value
  static async calculateCLV(userId) {
    const user = await User.findById(userId);
    const orders = await Order.find({ 
      user: userId, 
      status: { $in: ['completed', 'delivered'] }
    }).sort({ createdAt: 1 });
    
    if (orders.length < 2) return null;
    
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    const firstOrder = orders[0].createdAt;
    const lastOrder = orders[orders.length - 1].createdAt;
    const daysBetween = (lastOrder - firstOrder) / (1000 * 60 * 60 * 24);
    
    const avgOrderValue = totalSpent / orders.length;
    const avgOrderFrequency = orders.length / (daysBetween || 1) * 30; // Monthly
    const predictedLifetime = 24; // 24 months
    
    return {
      clv: avgOrderValue * avgOrderFrequency * predictedLifetime,
      avgOrderValue,
      avgOrderFrequency,
      totalSpent,
      orderCount: orders.length
    };
  }
  
  // Churn prediction
  static async predictChurn(userId) {
    const user = await User.findById(userId);
    const lastOrder = await Order.findOne({
      user: userId,
      status: { $in: ['completed', 'delivered'] }
    }).sort({ createdAt: -1 });
    
    if (!lastOrder) return { risk: 'unknown', score: 0 };
    
    const daysSinceLastOrder = (new Date() - lastOrder.createdAt) / (1000 * 60 * 60 * 24);
    
    // Churn risk scorei
    let score = 0;
    if (daysSinceLastOrder > 30) score += 40;
    if (daysSinceLastOrder > 60) score += 30;
    if (daysSinceLastOrder > 90) score += 30;
    
    // Buyurtmalar soni pasayishini tekshirish
    const recentOrders = await Order.countDocuments({
      user: userId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    if (recentOrders === 0) score += 20;
    
    let risk = 'low';
    if (score >= 70) risk = 'high';
    else if (score >= 40) risk = 'medium';
    
    return { risk, score, daysSinceLastOrder };
  }
}

module.exports = {
  LoyaltyService,
  PricingService,
  AnalyticsService
};
