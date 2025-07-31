// Rate limiting middleware - spam oldini olish
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.cleanup();
  }
  
  // Har 5 minutda eski ma'lumotlarni tozalash
  cleanup() {
    setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      
      for (const [userId, requests] of this.requests.entries()) {
        const filteredRequests = requests.filter(time => time > fiveMinutesAgo);
        
        if (filteredRequests.length === 0) {
          this.requests.delete(userId);
        } else {
          this.requests.set(userId, filteredRequests);
        }
      }
    }, 60000); // Har minutda tekshirish
  }
  
  // Foydalanuvchi limitini tekshirish
  checkLimit(userId, limit = 30, windowMs = 5 * 60 * 1000) {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Vaqt oralig'idagi requestlarni filtrash
    const recentRequests = userRequests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= limit) {
      return false; // Limit oshib ketgan
    }
    
    // Yangi requestni qo'shish
    recentRequests.push(now);
    this.requests.set(userId, recentRequests);
    
    return true; // OK
  }
}

const rateLimiter = new RateLimiter();

const rateLimitMiddleware = (limit = 30, windowMs = 5 * 60 * 1000) => {
  return (ctx, next) => {
    const userId = ctx.from?.id;
    
    if (!userId) {
      return next();
    }
    
    if (!rateLimiter.checkLimit(userId, limit, windowMs)) {
      console.log(`⚠️ Rate limit exceeded for user ${userId}`);
      
      if (ctx.callbackQuery) {
        return ctx.answerCbQuery('⏳ Juda tez! Biroz kuting...');
      } else {
        return ctx.reply('⏳ Juda ko\'p so\'rov! Iltimos 5 minut kuting.');
      }
    }
    
    return next();
  };
};

module.exports = {
  rateLimitMiddleware,
  rateLimiter
};