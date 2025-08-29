// Premium foydalanuvchilarni tekshirish
const premiumAuth = async (ctx, next) => {
  try {
    const user = ctx.user || ctx.session?.user;
    
    if (!user || !user.isPremium) {
      return ctx.reply('⭐ Bu funksiya faqat premium foydalanuvchilar uchun!');
    }
    
    return next();
  } catch (error) {
    console.error('Premium auth error:', error);
    return ctx.reply('Huquqlarni tekshirishda xatolik!');
  }
};

// Bloklangan foydalanuvchilarni tekshirish
const blockCheck = async (ctx, next) => {
  try {
    const user = ctx.user || ctx.session?.user;
    
    if (user && user.isBlocked) {
      return ctx.reply('🚫 Sizning akkauntingiz bloklangan. Qo\'llab-quvvatlash bilan bog\'laning.');
    }
    
    return next();
  } catch (error) {
    console.error('Block check error:', error);
    return next();
  }
};

// Rate limiting
const rateLimitMiddleware = (limit = 30, windowMs = 60000) => {
  const requests = new Map();
  
  return async (ctx, next) => {
    try {
      const userId = ctx.from.id;
      const now = Date.now();
      
      if (!requests.has(userId)) {
        requests.set(userId, { count: 1, resetTime: now + windowMs });
      } else {
        const userRequests = requests.get(userId);
        
        if (now > userRequests.resetTime) {
          userRequests.count = 1;
          userRequests.resetTime = now + windowMs;
        } else {
          userRequests.count++;
          
          if (userRequests.count > limit) {
            return await ctx.reply('⏳ Juda ko\'p so\'rov. Biroz kuting...');
          }
        }
      }
      
      await next();
    } catch (error) {
      console.error('Rate limit error:', error);
      await next();
    }
  };
};

module.exports = {
  premiumAuth,
  blockCheck,
  rateLimitMiddleware
};