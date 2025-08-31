const MobileUXService = require('../mobileOptimizations');

/**
 * Quick Order Service
 * Tezkor buyurtma xizmati
 */

class QuickOrderService {
  /**
   * Tezkor buyurtma menyusini ko'rsatish
   * @param {Object} ctx - Telegraf context
   */
  static async showQuickOrder(ctx) {
    try {
      const telegramId = ctx.from.id;
      const keyboard = await MobileUXService.getQuickOrderKeyboard(telegramId);
      
      const message = `⚡ <b>Tezkor buyurtma</b>\n\n` +
        `🔥 Eng mashhur mahsulotlardan tanlang\n` +
        `📋 Oldingi buyurtmalaringizni takrorlang\n` +
        `❤️ Sevimli mahsulotlaringizni qo'shing`;

      const messageFunction = ctx.callbackQuery ? 'editMessageText' : 'reply';
      await ctx[messageFunction](message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Show quick order error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }

  /**
   * Mashhur mahsulotlarni ko'rsatish
   * @param {Object} ctx - Telegraf context
   */
  static async showPopularProducts(ctx) {
    try {
      const popularProducts = await MobileUXService.getPopularProducts(6);
      
      if (popularProducts.length === 0) {
        return ctx.editMessageText(
          '😔 Hozirda mashhur mahsulotlar mavjud emas\n\nTo\'liq katalogni ko\'ring:',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🛍️ Katalog', callback_data: 'show_categories' }],
                [{ text: '🔙 Orqaga', callback_data: 'quick_order' }]
              ]
            }
          }
        );
      }

      let message = `🔥 <b>Eng mashhur mahsulotlar</b>\n\n`;
      
      const keyboard = {
        inline_keyboard: []
      };

      popularProducts.forEach((product, index) => {
        message += `${index + 1}. <b>${product.name}</b>\n`;
        message += `   💰 ${product.price.toLocaleString()} so'm\n`;
        message += `   📊 ${product.orderCount} marta buyurtma qilingan\n\n`;

        keyboard.inline_keyboard.push([
          { 
            text: `➕ ${product.name}`, 
            callback_data: `quick_add_${product._id}` 
          }
        ]);
      });

      keyboard.inline_keyboard.push([
        { text: '🛍️ To\'liq katalog', callback_data: 'show_categories' }
      ]);
      keyboard.inline_keyboard.push([
        { text: '🔙 Tezkor buyurtma', callback_data: 'quick_order' }
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Show popular products error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }

  /**
   * Tez tayyor mahsulotlarni ko'rsatish
   * @param {Object} ctx - Telegraf context
   */
  static async showFastProducts(ctx) {
    try {
      const fastProducts = await MobileUXService.getFastProducts(6);
      
      if (fastProducts.length === 0) {
        return ctx.editMessageText(
          '😔 Hozirda tez tayyor mahsulotlar mavjud emas\n\nTo\'liq katalogni ko\'ring:',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🛍️ Katalog', callback_data: 'show_categories' }],
                [{ text: '🔙 Orqaga', callback_data: 'quick_order' }]
              ]
            }
          }
        );
      }

      let message = `⚡ <b>Tez tayyor mahsulotlar</b>\n\n`;
      
      const keyboard = {
        inline_keyboard: []
      };

      fastProducts.forEach((product, index) => {
        const prepTime = product.preparationTime || 15;
        message += `${index + 1}. <b>${product.name}</b>\n`;
        message += `   💰 ${product.price.toLocaleString()} so'm\n`;
        message += `   ⏱️ ${prepTime} daqiqa\n\n`;

        keyboard.inline_keyboard.push([
          { 
            text: `➕ ${product.name}`, 
            callback_data: `quick_add_${product._id}` 
          }
        ]);
      });

      keyboard.inline_keyboard.push([
        { text: '🛍️ To\'liq katalog', callback_data: 'show_categories' }
      ]);
      keyboard.inline_keyboard.push([
        { text: '🔙 Tezkor buyurtma', callback_data: 'quick_order' }
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Show fast products error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }
}

module.exports = QuickOrderService;