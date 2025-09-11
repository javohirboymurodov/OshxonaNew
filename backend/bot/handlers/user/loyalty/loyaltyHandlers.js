const User = require('../../../../models/User');
const LoyaltyService = require('../../../../services/loyaltyService');

// Loyalty program handlers
const loyaltyHandlers = {
  // Mening darajam
  async showMyLevel(ctx) {
    try {
      const telegramId = ctx.from.id;
      const user = await User.findOne({ telegramId });
      
      if (!user) {
        return ctx.reply('❌ Foydalanuvchi topilmadi');
      }

      const loyaltyInfo = await LoyaltyService.getUserLoyaltyInfo(user._id);
      
      if (!loyaltyInfo) {
        return ctx.reply('❌ Loyalty ma\'lumotlari topilmadi');
      }

      const levelEmojis = {
        STARTER: '🌟',
        BRONZE: '🥉',
        SILVER: '🥈',
        GOLD: '🥇',
        DIAMOND: '💎'
      };

      let message = `${levelEmojis[loyaltyInfo.currentLevel]} <b>Sizning Darajangiz: ${loyaltyInfo.currentLevel}</b>\n\n`;
      message += `💰 <b>Loyalty balllar:</b> ${loyaltyInfo.loyaltyPoints.toLocaleString()}\n`;
      message += `📊 <b>Jami buyurtmalar:</b> ${loyaltyInfo.totalOrders}\n\n`;

      // Keyingi daraja uchun ma'lumot
      if (loyaltyInfo.nextLevel && loyaltyInfo.requiredForNext) {
        message += `🎯 <b>Keyingi daraja: ${levelEmojis[loyaltyInfo.nextLevel]} ${loyaltyInfo.nextLevel}</b>\n`;
        if (loyaltyInfo.requiredForNext.spentNeeded > 0) {
          message += `   💰 Zarur xarajat: ${loyaltyInfo.requiredForNext.spentNeeded.toLocaleString()} so'm\n`;
        }
        if (loyaltyInfo.requiredForNext.ordersNeeded > 0) {
          message += `   📦 Zarur buyurtmalar: ${loyaltyInfo.requiredForNext.ordersNeeded} ta\n`;
        }
        message += '\n';
      } else {
        message += `🏆 <b>Siz eng yuqori darajada turibsiz!</b>\n\n`;
      }

      // Imtiyozlar
      message += `🎁 <b>Sizning imtiyozlaringiz:</b>\n`;
      loyaltyInfo.benefits.forEach(benefit => {
        message += `   ✅ ${benefit}\n`;
      });

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🎁 Bonuslarim', callback_data: 'my_bonuses' },
            { text: '👥 Referral', callback_data: 'referral_program' }
          ],
          [
            { text: '📈 Statistikam', callback_data: 'my_stats' },
            { text: '🏠 Bosh menyu', callback_data: 'back_to_main' }
          ]
        ]
      };

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Show my level error:', error);
      ctx.reply('❌ Xatolik yuz berdi');
    }
  },

  // Bonuslarim
  async showMyBonuses(ctx) {
    try {
      const telegramId = ctx.from.id;
      const user = await User.findOne({ telegramId });
      
      if (!user) {
        return ctx.reply('❌ Foydalanuvchi topilmadi');
      }

      const activeBonuses = user.bonuses.filter(bonus => 
        !bonus.used && (!bonus.expiresAt || bonus.expiresAt > new Date())
      );

      let message = `🎁 <b>Sizning bonuslaringiz</b>\n\n`;
      message += `💰 <b>Jami loyalty balllar:</b> ${user.loyaltyPoints.toLocaleString()}\n\n`;

      if (activeBonuses.length === 0) {
        message += `😔 Hozirda faol bonuslaringiz yo'q\n\n`;
        message += `💡 <b>Bonus olish yo'llari:</b>\n`;
        message += `   🛒 Buyurtma bering - har 1000 so'mga 1 ball\n`;
        message += `   👥 Do'stlaringizni taklif qiling\n`;
        message += `   🎂 Tug'ilgan kuningizda maxsus bonus\n`;
        message += `   📈 Darajangizni oshiring\n`;
      } else {
        message += `✨ <b>Faol bonuslar:</b>\n\n`;
        
        activeBonuses.forEach((bonus, index) => {
          const bonusEmojis = {
            referral_welcome: '👋',
            referral_reward: '👥',
            birthday: '🎂',
            loyalty_bonus: '🏆',
            promotion: '🎉'
          };

          message += `${bonusEmojis[bonus.type] || '🎁'} <b>${bonus.message}</b>\n`;
          message += `   💰 Miqdor: ${bonus.amount.toLocaleString()} ball\n`;
          
          if (bonus.expiresAt) {
            const daysLeft = Math.ceil((bonus.expiresAt - new Date()) / (1000 * 60 * 60 * 24));
            message += `   ⏰ Muddati: ${daysLeft} kun\n`;
          }
          message += '\n';
        });

        message += `💡 <b>Foydalanish:</b> Buyurtma berishda avtomatik qo'llaniladi\n`;
      }

      // Balllarni ishlatish tugmasi vaqtincha o'chirildi — to'lov tasdiqlashda avtomatik qo'llanadi
      const keyboard = {
        inline_keyboard: [
          [
            { text: '📊 Darajam', callback_data: 'my_loyalty_level' },
            { text: '📈 Statistikam', callback_data: 'my_stats' }
          ],
          [
            { text: '🏠 Bosh menyu', callback_data: 'back_to_main' }
          ]
        ]
      };

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Show my bonuses error:', error);
      ctx.reply('❌ Xatolik yuz berdi');
    }
  },

  // Referral dastur
  async showReferralProgram(ctx) {
    try {
      const telegramId = ctx.from.id;
      const user = await User.findOne({ telegramId });
      
      if (!user) {
        return ctx.reply('❌ Foydalanuvchi topilmadi');
      }

      let message = `👥 <b>Referral Dasturi</b>\n\n`;
      message += `🎁 <b>Do'stlaringizni taklif qiling va bonus oling!</b>\n\n`;
      
      message += `💰 <b>Siz olasiz:</b> 3,000 ball\n`;
      message += `🎉 <b>Do'stingiz oladi:</b> 5,000 ball\n\n`;
      
      message += `📊 <b>Sizning statistikangiz:</b>\n`;
      message += `   👥 Taklif qilganlar: ${user.referrals.totalReferrals} kishi\n`;
      message += `   💰 Olingan bonus: ${user.referrals.totalReferrals * 3000} ball\n\n`;
      
      message += `🔗 <b>Sizning referral linkingiz:</b>\n`;
      message += `<code>https://t.me/${process.env.BOT_USERNAME}?start=ref_${user._id}</code>\n\n`;
      
      message += `📝 <b>Qanday ishlaydi:</b>\n`;
      message += `1️⃣ Yuqoridagi linkni do'stlaringizga yuboring\n`;
      message += `2️⃣ Ular bot orqali ro'yxatdan o'tishi kerak\n`;
      message += `3️⃣ Birinchi buyurtmadan keyin bonus olasiz\n\n`;
      
      message += `⚡ <b>Maslahat:</b> Instagram, WhatsApp, SMS orqali ulashing!`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📤 Linkni ulashish', url: `https://t.me/share/url?url=https://t.me/${process.env.BOT_USERNAME}?start=ref_${user._id}&text=Oshxonada buyurtma berish uchun botga qo'shiling va bonus oling!` }
          ],
          [
            { text: '📊 Darajam', callback_data: 'my_loyalty_level' },
            { text: '🎁 Bonuslarim', callback_data: 'my_bonuses' }
          ],
          [
            { text: '🏠 Bosh menyu', callback_data: 'back_to_main' }
          ]
        ]
      };

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Show referral program error:', error);
      ctx.reply('❌ Xatolik yuz berdi');
    }
  },

  // Balllarni ishlatish
  async usePoints(ctx) {
    try {
      const telegramId = ctx.from.id;
      const user = await User.findOne({ telegramId });
      
      if (!user) {
        return ctx.reply('❌ Foydalanuvchi topilmadi');
      }

      if (user.loyaltyPoints < 1000) {
        const message = `😔 <b>Kamida 1,000 ball bo'lishi kerak</b>\n\n`;
        message += `💰 Sizda: ${user.loyaltyPoints} ball\n`;
        message += `📈 ${1000 - user.loyaltyPoints} ball yetishmaydi\n\n`;
        message += `💡 Buyurtma bering va ball to'plang!`;

        const keyboard = {
          inline_keyboard: [
            [{ text: '🛒 Buyurtma berish', callback_data: 'start_order' }],
            [{ text: '🔙 Orqaga', callback_data: 'my_bonuses' }]
          ]
        };

        return ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      }

      ctx.session.step = 'enter_points_amount';
      ctx.session.maxPoints = user.loyaltyPoints;

      const message = `💰 <b>Balllarni ishlatish</b>\n\n`;
      message += `📊 Sizda: ${user.loyaltyPoints.toLocaleString()} ball\n`;
      message += `💡 1 ball = 1 so'm chegirma\n\n`;
      message += `✍️ Nechta ball ishlatmoqchisiz?\n`;
      message += `(Maksimum buyurtma narxining 50%i)`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '1,000', callback_data: 'use_points_1000' },
            { text: '2,000', callback_data: 'use_points_2000' },
            { text: '5,000', callback_data: 'use_points_5000' }
          ],
          [
            { text: '10,000', callback_data: 'use_points_10000' },
            { text: '20,000', callback_data: 'use_points_20000' }
          ],
          [
            { text: '🔙 Orqaga', callback_data: 'my_bonuses' }
          ]
        ]
      };

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Use points error:', error);
      ctx.reply('❌ Xatolik yuz berdi');
    }
  },

  // Statistikalarni ko'rsatish
  async showMyStats(ctx) {
    try {
      const telegramId = ctx.from.id;
      const user = await User.findOne({ telegramId });
      
      if (!user) {
        return ctx.reply('❌ Foydalanuvchi topilmadi');
      }

      let message = `📈 <b>Sizning statistikangiz</b>\n\n`;
      
      // Asosiy statistikalar
      message += `🛒 <b>Jami buyurtmalar:</b> ${user.stats.totalOrders}\n`;
      message += `💸 <b>Jami xarajat:</b> ${user.stats.totalSpent.toLocaleString()} so'm\n`;
      message += `💰 <b>Loyalty balllar:</b> ${user.loyaltyPoints.toLocaleString()}\n`;
      message += `👥 <b>Referrallar:</b> ${user.referrals.totalReferrals}\n\n`;

      // O'rtacha statistikalar
      if (user.stats.totalOrders > 0) {
        const avgOrderValue = Math.round(user.stats.totalSpent / user.stats.totalOrders);
        message += `📊 <b>O'rtacha buyurtma:</b> ${avgOrderValue.toLocaleString()} so'm\n`;
      }

      if (user.stats.lastOrderDate) {
        const daysSinceLastOrder = Math.floor((new Date() - user.stats.lastOrderDate) / (1000 * 60 * 60 * 24));
        message += `📅 <b>Oxirgi buyurtma:</b> ${daysSinceLastOrder} kun oldin\n`;
      }

      message += `\n🎯 <b>Yil oxirigacha maqsadlaringiz:</b>\n`;
      
      // Keyingi daraja uchun progress
      const loyaltyInfo = await LoyaltyService.getUserLoyaltyInfo(user._id);
      if (loyaltyInfo.nextLevel && loyaltyInfo.requiredForNext) {
        const spentProgress = Math.round((user.stats.totalSpent / (user.stats.totalSpent + loyaltyInfo.requiredForNext.spentNeeded)) * 100);
        const ordersProgress = Math.round((user.stats.totalOrders / (user.stats.totalOrders + loyaltyInfo.requiredForNext.ordersNeeded)) * 100);
        
        message += `🏆 ${loyaltyInfo.nextLevel} darajasi:\n`;
        message += `   💰 Xarajat: ${spentProgress}% (${loyaltyInfo.requiredForNext.spentNeeded.toLocaleString()} so'm qoldi)\n`;
        message += `   📦 Buyurtmalar: ${ordersProgress}% (${loyaltyInfo.requiredForNext.ordersNeeded} ta qoldi)\n`;
      }

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📊 Darajam', callback_data: 'my_loyalty_level' },
            { text: '🎁 Bonuslarim', callback_data: 'my_bonuses' }
          ],
          [
            { text: '🏠 Bosh menyu', callback_data: 'back_to_main' }
          ]
        ]
      };

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Show my stats error:', error);
      ctx.reply('❌ Xatolik yuz berdi');
    }
  }
};

module.exports = loyaltyHandlers;