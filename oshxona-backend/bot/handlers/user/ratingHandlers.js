/**
 * Rating and feedback handlers
 */
class RatingHandlers {
  
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
      
      // Find and verify order
      const { Order } = require('../../../models');
      const order = await Order.findById(orderId);
      
      if (!order) {
        await ctx.answerCbQuery('❌ Buyurtma topilmadi');
        return;
      }
      
      // Verify user owns this order
      const telegramId = ctx.from.id;
      if (order.user?.toString() !== telegramId.toString()) {
        await ctx.answerCbQuery('❌ Bu buyurtmani baholash huquqingiz yo\'q');
        return;
      }
      
      // Save rating
      order.rating = rating;
      order.updatedAt = new Date();
      await order.save();
      
      await ctx.answerCbQuery(`✅ Baholash saqlandi: ${rating} yulduz`);
      
      // Ask for optional feedback
      await ctx.reply('💬 Izoh qoldirmoqchimisiz? (ixtiyoriy)', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💬 Ha, izoh yozaman', callback_data: `feedback_${orderId}` },
              { text: '❌ Yo\'q, rahmat', callback_data: 'back_to_main' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Rating error:', error);
      await ctx.answerCbQuery('❌ Baholashda xatolik yuz berdi');
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
