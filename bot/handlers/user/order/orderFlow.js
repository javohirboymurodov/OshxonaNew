// Order Flow Management Module
const { User, Cart, Branch } = require('../../../../models');
const { orderTypeKeyboard, paymentMethodKeyboard, branchesKeyboard } = require('../../../user/keyboards');
const BaseHandler = require('../../../../utils/BaseHandler');

/**
 * Order Flow Handler - buyurtma jarayonini boshqarish
 */
class OrderFlow extends BaseHandler {
  /**
   * Buyurtma boshlash
   * @param {Object} ctx - Telegraf context
   */
  static async startOrder(ctx) {
    return this.safeExecute(async () => {
      const telegramId = ctx.from.id;
      const user = await User.findOne({ telegramId });
      
      if (!user) {
        return await ctx.answerCbQuery('Foydalanuvchi topilmadi!');
      }

      // STRICT: Telefon raqami bo'lmasa, darhol telefonni so'raymiz va boshqa oqimlarga o'tkazmaymiz
      if (!user.phone) {
        const UserOrderHandlers = require('./index');
        await UserOrderHandlers.askForPhone(ctx);
        return;
      }
      
      const cart = await Cart.findOne({ user: user._id, isActive: true });
      if (!cart || cart.items.length === 0) {
        return await ctx.answerCbQuery('❌ Savat bo\'sh!');
      }
      
      // QR orqali stolga biriktirilgan bo'lsa
      if (ctx.session.orderType === 'dine_in_qr' && ctx.session.orderData?.tableCode) {
        if (user.phone) {
          const PaymentFlow = require('./paymentFlow');
          await PaymentFlow.askForPaymentMethod(ctx);
        } else {
          const UserOrderHandlers = require('./index');
          await UserOrderHandlers.askForPhone(ctx);
        }
        return;
      }
      
      const message = `📝 **Buyurtma berish**\n\nBuyurtma turini tanlang:`;
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: orderTypeKeyboard.reply_markup
      });
    }, ctx, '❌ Buyurtma boshlashda xatolik!');
  }

  /**
   * Buyurtma turi tanlanishi
   * @param {Object} ctx - Telegraf context
   */
  static async handleOrderType(ctx) {
    return this.safeExecute(async () => {
      // Extract order type: order_type_dine_in -> dine_in (not dine!)
      const callbackData = ctx.callbackQuery.data;
      const orderType = callbackData.replace('order_type_', '');
      
      console.log('=== handleOrderType ===');
      console.log('Callback data:', callbackData);
      console.log('Order type:', orderType);
      
      ctx.session.orderType = orderType;
      ctx.session.orderData = ctx.session.orderData || {};
      
      switch (orderType) {
        case 'delivery':
          await this.handleDeliveryFlow(ctx);
          break;
          
        case 'pickup':
          await this.handlePickupFlow(ctx);
          break;
          
        case 'dine_in':
        case 'preorder':  // preorder = dine_in (same logic)
          await this.handleDineInFlow(ctx);
          break;
          
        case 'table':
          await this.handleTableFlow(ctx);
          break;
          
        default:
          console.log('❌ Unknown order type:', orderType);
          await ctx.answerCbQuery('❌ Noma\'lum buyurtma turi!');
      }
    }, ctx, '❌ Buyurtma turini tanlashda xatolik!');
  }

  /**
   * Delivery flow
   * @param {Object} ctx - Telegraf context
   */
  static async handleDeliveryFlow(ctx) {
    try {
      console.log('=== Starting delivery flow ===');
      
      // Location so'rash
      const message = `📍 **Yetkazib berish**\n\nYetkazib berish manzilini yuboring yoki pastdagi tugmani bosib joylashuvingizni ulashing:`;
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            // Telegram inline callback bilan real-time location yuborib bo'lmaydi.
            // Foydalanuvchiga ko'rsatma va reply keyboard orqali location so'raymiz.
            [{ text: '🔙 Orqaga', callback_data: 'start_order' }]
          ]
        }
      });
      
      // Reply keyboard orqali real location so'rash
      try {
        await ctx.reply('📍 Joylashuvingizni yuboring:', {
          reply_markup: {
            keyboard: [[{ text: '📍 Joylashuvni yuborish', request_location: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        });
      } catch {}
      
      ctx.session.waitingFor = 'delivery_location';
    } catch (error) {
      console.error('Delivery flow error:', error);
      await ctx.answerCbQuery('❌ Yetkazib berish oqimida xatolik!');
    }
  }

  /**
   * Pickup flow
   * @param {Object} ctx - Telegraf context  
   */
  static async handlePickupFlow(ctx) {
    try {
      console.log('=== Starting pickup flow ===');
      await this.askForBranchSelection(ctx, 'pickup');
    } catch (error) {
      console.error('Pickup flow error:', error);
      await ctx.answerCbQuery('❌ Olib ketish oqimida xatolik!');
    }
  }

  /**
   * Dine-in flow
   * @param {Object} ctx - Telegraf context
   */
  static async handleDineInFlow(ctx) {
    try {
      console.log('=== Starting dine-in flow ===');
      await this.askForBranchSelection(ctx, 'dine_in');
    } catch (error) {
      console.error('Dine-in flow error:', error);
      await ctx.answerCbQuery('❌ Avvaldan buyurtma oqimida xatolik!');
    }
  }

  /**
   * Filial tanlash (pickup/dine_in uchun)
   * @param {Object} ctx - Telegraf context
   * @param {string} forType - order type
   */
  static async askForBranchSelection(ctx, forType) {
    try {
      const branches = await Branch.find({ isActive: true }).select('name');
      
      if (!branches || branches.length === 0) {
        await ctx.reply('❌ Faol filial topilmadi.');
        return;
      }
      
      const typeKey = forType === 'dine_in' ? 'dine' : forType;
      const inline = {
        inline_keyboard: branches.map((b) => ([
          { text: b.name, callback_data: `choose_branch_${typeKey}_${b._id}` }
        ]))
      };
      
      const text = forType === 'pickup' ? 
        '🏪 Qaysi filialdan olib ketasiz?' : 
        '🏢 Qaysi filialga kelasiz?';
      
      if (ctx.updateType === 'callback_query') {
        await ctx.editMessageText(text, { reply_markup: inline });
      } else {
        await ctx.reply(text, { reply_markup: inline });
      }
    } catch (error) {
      console.error('Ask branch selection error:', error);
      await ctx.reply('❌ Filial tanlashda xatolik!');
    }
  }

  /**
   * Filial tanlanishi
   * @param {Object} ctx - Telegraf context
   */
  static async handleChooseBranch(ctx) {
    return this.safeExecute(async () => {
      const data = String(ctx.callbackQuery?.data || '');
      const branchMatch = data.match(/[0-9a-fA-F]{24}$/);
      const branchId = branchMatch ? branchMatch[0] : '';
      const type = data.includes('choose_branch_pickup_') ? 'pickup' : 'dine';
      
      if (!this.isValidObjectId(branchId)) {
        return await ctx.answerCbQuery('❌ Filial ID noto\'g\'ri!');
      }
      
      ctx.session.orderData = ctx.session.orderData || {};
      ctx.session.orderData.branch = branchId;
      
      // Filial tanlangach vaqt so'raladi
      if (type === 'pickup' || type === 'dine') {
        const normalized = type === 'dine' ? 'dine_in' : type;
        ctx.session.orderType = normalized;
        // Show arrival time selection (inline keyboard)
        const { arrivalTimeKeyboard } = require('../../../user/keyboards');
        const kb = arrivalTimeKeyboard();
        await ctx.editMessageText('⏰ Kelish vaqtini tanlang:', { reply_markup: kb.reply_markup });
      } else {
        const PaymentFlow = require('./paymentFlow');
        await PaymentFlow.askForPaymentMethod(ctx);
      }
      
      if (ctx.answerCbQuery) await ctx.answerCbQuery('✅ Filial tanlandi');
    }, ctx, '❌ Filialni tanlashda xatolik!');
  }

  /**
   * Avvaldan buyurtma (dine-in preorder)
   * @param {Object} ctx - Telegraf context
   */
  /**
   * Table flow (QR stol buyurtmasi)
   * @param {Object} ctx - Telegraf context
   */
  static async handleTableFlow(ctx) {
    try {
      console.log('=== Starting table flow ===');
      
      const message = `🪑 **Stol buyurtmasi**\n\nStolingizda joylashgan QR kodni skanerlang yoki stol raqamini kiriting:`;
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Orqaga', callback_data: 'start_order' }]
          ]
        }
      });
      
      ctx.session.waitingFor = 'table_number';
    } catch (error) {
      console.error('Table flow error:', error);
      await ctx.answerCbQuery('❌ Stol buyurtmasi oqimida xatolik!');
    }
  }

  /**
   * Dine-in flow (Avvaldan buyurtma)
   * @param {Object} ctx - Telegraf context
   */
  static async handleDineInFlow(ctx) {
    try {
      console.log('=== Starting dine-in flow ===');
      await this.askForBranchSelection(ctx, 'dine_in');
    } catch (error) {
      console.error('Dine-in flow error:', error);
      await ctx.answerCbQuery('❌ Avvaldan buyurtma oqimida xatolik!');
    }
  }

  static async handleDineInPreorder(ctx) {
    console.log('⚠️ DEPRECATED: handleDineInPreorder called - redirecting to handleDineInFlow');
    return this.handleDineInFlow(ctx);
  }
}

module.exports = OrderFlow;
