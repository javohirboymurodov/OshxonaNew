const { User, Product } = require('../../../../../models');
const Favorite = require('../../../../../models/Favorite');

/**
 * Favorites Service
 * Sevimlilar xizmati
 */

class FavoritesService {
  /**
   * Mahsulotni sevimlilarga qo'shish
   * @param {Object} ctx - Telegraf context
   */
  static async addToFavorites(ctx) {
    try {
      const callbackData = ctx.callbackQuery?.data || '';
      const productIdMatch = callbackData.match(/^add_favorite_(.+)$/);
      
      if (!productIdMatch) {
        return ctx.answerCbQuery('❌ Mahsulot ID topilmadi');
      }

      const productId = productIdMatch[1];
      const telegramId = ctx.from.id;
      
      const user = await User.findOne({ telegramId });
      if (!user) {
        return ctx.answerCbQuery('❌ Foydalanuvchi topilmadi');
      }

      const product = await Product.findById(productId);
      if (!product) {
        return ctx.answerCbQuery('❌ Mahsulot topilmadi');
      }

      // Check if already in favorites
      const existingFavorite = await Favorite.findOne({
        user: user._id,
        product: productId
      });

      if (existingFavorite) {
        return ctx.answerCbQuery('❤️ Mahsulot allaqachon sevimlilarda');
      }

      // Add to favorites
      const favorite = new Favorite({
        user: user._id,
        product: productId
      });
      await favorite.save();

      await ctx.answerCbQuery(`❤️ ${product.name} sevimlilarga qo'shildi!`);

    } catch (error) {
      console.error('Add to favorites error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }

  /**
   * Sevimli mahsulotlarni ko'rsatish
   * @param {Object} ctx - Telegraf context
   */
  static async showFavorites(ctx) {
    try {
      const telegramId = ctx.from.id;
      const user = await User.findOne({ telegramId });
      
      if (!user) {
        return ctx.answerCbQuery('❌ Foydalanuvchi topilmadi');
      }

      const favorites = await Favorite.find({ user: user._id })
        .populate('product', 'name price isActive isAvailable')
        .sort({ createdAt: -1 });

      if (favorites.length === 0) {
        const webAppUrl = `${process.env.WEBAPP_URL}?telegramId=${telegramId}`;
        return ctx.editMessageText(
          '😔 <b>Sevimli mahsulotlaringiz yo\'q</b>\n\n' +
          'Mahsulotlarni ko\'rib, ❤️ tugmasini bosing!',
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🌐 To\'liq katalog (WebApp)', web_app: { url: webAppUrl } }],
                [{ text: '📂 Kategoriyalar', callback_data: 'show_categories' }],
                [{ text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }]
              ]
            }
          }
        );
      }

      let message = `❤️ <b>Sevimli mahsulotlaringiz</b>\n\n`;
      const keyboard = { inline_keyboard: [] };

      favorites.forEach((favorite, index) => {
        const product = favorite.product;
        // Check availability - if isAvailable is undefined, treat as true
        const isAvailable = product.isAvailable !== false;
        if (product && product.isActive && isAvailable) {
          message += `${index + 1}. <b>${product.name}</b>\n`;
          message += `   💰 ${product.price.toLocaleString()} so'm\n\n`;

          keyboard.inline_keyboard.push([
            { 
              text: `➕ ${product.name}`, 
              callback_data: `quick_add_${product._id}` 
            },
            { 
              text: '🗑️', 
              callback_data: `remove_favorite_${product._id}` 
            }
          ]);
        }
      });

      const webAppUrl = `${process.env.WEBAPP_URL}?telegramId=${telegramId}`;
      keyboard.inline_keyboard.push([
        { text: '🌐 To\'liq katalog (WebApp)', web_app: { url: webAppUrl } }
      ]);
      keyboard.inline_keyboard.push([
        { text: '📂 Kategoriyalar', callback_data: 'show_categories' }
      ]);
      keyboard.inline_keyboard.push([
        { text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Show favorites error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }

  /**
   * Sevimlilardan olib tashlash
   * @param {Object} ctx - Telegraf context
   */
  static async removeFromFavorites(ctx) {
    try {
      console.log('🔍 FAVORITES SERVICE: removeFromFavorites called:', {
        callbackData: ctx.callbackQuery?.data,
        userId: ctx.from.id
      });
  
      const callbackData = ctx.callbackQuery?.data || '';
      const productIdMatch = callbackData.match(/^remove_favorite_(.+)$/);
      
      if (!productIdMatch) {
        console.log('❌ Invalid callback pattern:', callbackData);
        return ctx.answerCbQuery('❌ Mahsulot ID topilmadi');
      }
  
      const productId = productIdMatch[1];
      const telegramId = ctx.from.id;
      
      console.log('🔍 Removing product from favorites:', { productId, telegramId });
      
      const user = await User.findOne({ telegramId });
      if (!user) {
        console.log('❌ User not found:', telegramId);
        return ctx.answerCbQuery('❌ Foydalanuvchi topilmadi');
      }
  
      // ENHANCED: Support both storage methods
      let removed = false;
  
      // Method 1: Favorite model (separate collection)
      try {
        const deletedFavorite = await Favorite.findOneAndDelete({
          user: user._id,
          product: productId
        });
        if (deletedFavorite) {
          removed = true;
          console.log('✅ Removed from Favorite model');
        }
      } catch (favoriteModelError) {
        console.log('⚠️ Favorite model error:', favoriteModelError.message);
      }
  
      // Method 2: user.favorites array (embedded)
      if (!removed && user.favorites && user.favorites.includes(productId)) {
        user.favorites = user.favorites.filter(id => id.toString() !== productId);
        await user.save();
        removed = true;
        console.log('✅ Removed from user.favorites array');
      }
  
      if (removed) {
        await ctx.answerCbQuery('💔 Sevimlilardan olib tashlandi!');
        console.log('✅ Product successfully removed from favorites');
        
        // Refresh favorites list
        await this.showFavorites(ctx);
      } else {
        console.log('⚠️ Product not found in favorites');
        await ctx.answerCbQuery('⚠️ Mahsulot sevimlilardan topilmadi');
      }
  
    } catch (error) {
      console.error('❌ Remove from favorites error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }
}

module.exports = FavoritesService;