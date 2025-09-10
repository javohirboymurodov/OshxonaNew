/**
 * Rating and feedback handlers
 */
class RatingHandlers {
  
  /**
   * Show rating options (stars)
   */
  static async showRatingOptions(ctx, orderId) {
    try {
      // Find and verify order
      const { Order } = require('../../../models');
      const order = await Order.findById(orderId);
      
      if (!order) {
        await ctx.answerCbQuery('❌ Buyurtma topilmadi');
        return;
      }
      
      // Check if already rated
      if (order.rating && order.rating > 0) {
        await ctx.answerCbQuery(`✅ Siz bu buyurtmani ${order.rating} yulduz bilan baholagansiz`);
        return;
      }
      
      const message = `⭐ <b>Buyurtmani baholang</b>\n\n📦 Buyurtma: #${order.orderId}\n💰 Jami: ${order.total?.toLocaleString() || 0} so'm\n\n⭐ Qancha yulduz berasiz?`;
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '1⭐', callback_data: `rate_${orderId}_1` },
            { text: '2⭐⭐', callback_data: `rate_${orderId}_2` },
            { text: '3⭐⭐⭐', callback_data: `rate_${orderId}_3` }
          ],
          [
            { text: '4⭐⭐⭐⭐', callback_data: `rate_${orderId}_4` },
            { text: '5⭐⭐⭐⭐⭐', callback_data: `rate_${orderId}_5` }
          ],
          [
            { text: '🔙 Orqaga', callback_data: 'my_orders' }
          ]
        ]
      };
      
      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      }
      
    } catch (error) {
      console.error('❌ Show rating options error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }



  /**
   * Handle order rating
   */
  static async handleRating(ctx) {
    try {
      const match = ctx.callbackQuery?.data?.match(/^rate_(.+)_(\d+)$/);
      if (!match) {
        await ctx.answerCbQuery('❌ Noto\'g\'ri format!');
        return;
      }

      const orderId = match[1];
      const rating = parseInt(match[2]);
      
      // Find and verify order with user population
      const { Order, User } = require('../../../models');
      const order = await Order.findById(orderId).populate('user', 'telegramId');
      
      if (!order) {
        await ctx.answerCbQuery('❌ Buyurtma topilmadi');
        return;
      }
      
      // 🔧 FIX: To'g'ri user verification 
      const telegramId = ctx.from.id;
      
      if (!order.user || !order.user.telegramId) {
        await ctx.answerCbQuery('❌ Buyurtma egasi topilmadi');
        return;
      }
      
      if (order.user.telegramId !== telegramId) {
        await ctx.answerCbQuery('❌ Bu buyurtmani baholash huquqingiz yo\'q');
        return;
      }
      
      // Yetkazildi yoki completed bo'lgan buyurtmalarnigina baholash mumkin
      if (!['delivered', 'completed'].includes(order.status)) {
        await ctx.answerCbQuery('❌ Faqat yetkazilgan buyurtmalarni baholash mumkin');
        return;
      }
      
      // Save rating
      order.rating = rating;
      order.updatedAt = new Date();
      await order.save();
      
      await ctx.answerCbQuery(`✅ Baholash saqlandi: ${rating} yulduz`);
      
      // Ask for optional feedback using proper method
      await this.requestFeedback(ctx, orderId);
      
    } catch (error) {
      console.error('Rating error:', error);
      await ctx.answerCbQuery('❌ Baholashda xatolik yuz berdi');
    }
  }

  /**
   * Request feedback after rating
   */
  static async requestFeedback(ctx, orderId) {
    try {
      const message = `💬 <b>Izoh qoldiring</b>\n\n📝 Xizmatimiz haqida fikringizni yozing (ixtiyoriy):`;
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '💬 Izoh yozish', callback_data: `feedback_${orderId}` }
          ],
          [
            { text: '❌ Yo\'q, rahmat', callback_data: 'my_orders' }
          ]
        ]
      };
      
      try {
        if (ctx.callbackQuery) {
          await ctx.editMessageText(message, {
            parse_mode: 'HTML',
            reply_markup: keyboard
          });
        } else {
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: keyboard
          });
        }
      } catch (editError) {
        // 🔧 FIX: Agar xabar bir xil bo'lsa, yangi xabar yuboramiz
        console.log('🔄 Edit failed (same content), sending new feedback message');
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      }
      
    } catch (error) {
      console.error('❌ Request feedback error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }

  /**
   * Handle feedback request
   */
  static async handleFeedback(ctx) {
    try {
      const match = ctx.callbackQuery?.data?.match(/^feedback_(.+)$/);
      if (!match) {
        await ctx.answerCbQuery('❌ Noto\'g\'ri format!');
        return;
      }

      const orderId = match[1];
      ctx.session.waitingFor = 'feedback';
      ctx.session.feedbackOrderId = orderId;
      
      await ctx.reply('💬 Izohingizni yozing:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Orqaga', callback_data: 'back_to_main' }]
          ]
        }
      });
      
    } catch (error) {
      console.error('Feedback error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }

  /**
   * Process feedback text input
   */
  static async processFeedbackText(ctx, feedbackText, orderId) {
    try {
      // Find order and save feedback
      const { Order } = require('../../../models');
      const order = await Order.findById(orderId);
      
      if (!order) {
        await ctx.reply('❌ Buyurtma topilmadi');
        return;
      }
      
      // Verify user owns this order
      const telegramId = ctx.from.id;
      if (order.user?.toString() !== telegramId.toString()) {
        await ctx.reply('❌ Bu buyurtmaga izoh qoldirish huquqingiz yo\'q');
        return;
      }
      
      // Save feedback
      order.feedback = feedbackText;
      order.updatedAt = new Date();
      await order.save();
      
      await ctx.reply('✅ Izohingiz saqlandi! Fikr-mulohazangiz uchun rahmat.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Bosh sahifa', callback_data: 'back_to_main' }]
          ]
        }
      });
      
      // Clear session
      ctx.session.waitingFor = null;
      ctx.session.feedbackOrderId = null;
      
    } catch (error) {
      console.error('Process feedback error:', error);
      await ctx.reply('❌ Izohni saqlashda xatolik yuz berdi');
    }
  }

  /**
   * Register rating callbacks
   */
  static registerCallbacks(bot) {
    // Rating handler
    bot.action(/^rate_(.+)_(\d+)$/, RatingHandlers.handleRating);
    
    // Feedback handler
    bot.action(/^feedback_(.+)$/, RatingHandlers.handleFeedback);

    console.log('✅ Rating handlers registered');
  }
}

module.exports = RatingHandlers;
