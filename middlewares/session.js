const { User } = require('../models');

// Session middleware - har bir request da foydalanuvchini tekshirish
const sessionMiddleware = async (ctx, next) => {
  try {
    // Session mavjudligini tekshirish
    if (!ctx.session) {
      ctx.session = {};
    }
    
    const telegramUser = ctx.from;
    
    if (telegramUser) {
      // Foydalanuvchini database dan topish yoki yaratish
      let user = await User.findOne({ telegramId: telegramUser.id });
      
      if (!user) {
        user = new User({
          telegramId: telegramUser.id,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          username: telegramUser.username,
          languageCode: telegramUser.language_code || 'uz'
        });
        
        await user.save();
        console.log(`📝 Yangi foydalanuvchi: ${user.firstName} (${user.telegramId})`);
      } else {
        // Mavjud foydalanuvchi ma'lumotlarini yangilash
        let needUpdate = false;
        
        if (user.firstName !== telegramUser.first_name) {
          user.firstName = telegramUser.first_name;
          needUpdate = true;
        }
        
        if (user.lastName !== telegramUser.last_name) {
          user.lastName = telegramUser.last_name;
          needUpdate = true;
        }
        
        if (user.username !== telegramUser.username) {
          user.username = telegramUser.username;
          needUpdate = true;
        }
        
        if (needUpdate) {
          await user.save();
        }
      }
      
      // Faollik vaqtini yangilash (fallback: direct save if method not defined)
      try {
        if (typeof user.updateLastActivity === 'function') {
          await user.updateLastActivity();
        } else {
          user.updatedAt = new Date();
          await user.save();
        }
      } catch (e) {
        try {
          user.updatedAt = new Date();
          await user.save();
        } catch {}
      }
      
      // Session ga foydalanuvchini saqlash
      ctx.session.user = user;
      ctx.user = user; // Quick access
    }
    
    // Request ma'lumotlarini loglash
    if (process.env.NODE_ENV === 'development') {
      console.log(`📨 ${ctx.updateType}: ${telegramUser?.first_name} (${telegramUser?.id})`);
    }
    
    return next();
    
  } catch (error) {
    console.error('Session middleware error:', error);
    
    // Xatolik bo'lganda ham davom etish
    if (!ctx.session) {
      ctx.session = {};
    }
    
    return next();
  }
};

module.exports = sessionMiddleware;