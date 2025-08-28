const { Order, User } = require('../../../../models');
const orderTracker = require('../../../../services/orderTrackingService');

// Order tracking handlers
const trackingHandlers = {
  // Smart Buyurtmani Kuzatish (Professional)
  async trackOrderSmart(ctx) {
    try {
      const callbackData = ctx.callbackQuery?.data || '';
      const orderIdMatch = callbackData.match(/^track_(.+)$/);
      
      if (!orderIdMatch) {
        return ctx.answerCbQuery('❌ Buyurtma ID topilmadi');
      }

      const orderId = orderIdMatch[1];
      
      // Use Smart Order Interface for modern tracking
      const SmartOrderInterface = require('../../../services/smartOrderInterface');
      const RealTimeTrackingManager = require('../../../services/realTimeTrackingManager');
      
      // Start real-time tracking
      await RealTimeTrackingManager.startTracking(orderId, ctx.from.id, {
        source: 'tracking',
        features: ['status', 'courier', 'time']
      });
      
      // Show order with smart interface
      await SmartOrderInterface.showOrder(ctx, orderId, { 
        source: 'tracking',
        preserveNavigation: true 
      });

      console.log('✅ Smart tracking started for order:', orderId);
      
    } catch (error) {
      console.error('❌ Smart track order error:', error);
      // Fallback to legacy tracking
      await this.trackOrder(ctx);
    }
  },

  // Legacy Buyurtmani kuzatish (Fallback)
  async trackOrder(ctx) {
    try {
      const callbackData = ctx.callbackQuery?.data || '';
      const orderIdMatch = callbackData.match(/^track_(.+)$/);
      
      if (!orderIdMatch) {
        return ctx.answerCbQuery('❌ Buyurtma ID topilmadi');
      }

      const orderId = orderIdMatch[1];
      const tracking = await orderTracker.getOrderTracking(orderId);

      if (!tracking) {
        return ctx.answerCbQuery('❌ Buyurtma topilmadi', { show_alert: true });
      }

      // Check if user owns this order
      const telegramId = ctx.from.id;
      const user = await User.findOne({ telegramId });
      if (!user) {
        return ctx.answerCbQuery('❌ Foydalanuvchi topilmadi');
      }

      if (tracking.customer.phone !== user.phone) {
        return ctx.answerCbQuery('❌ Bu buyurtma sizga tegishli emas', { show_alert: true });
      }

      let message = `📋 <b>Buyurtma kuzatuvi</b>\n\n`;
      message += `🔢 Raqam: #${tracking.orderNumber}\n`;
      message += `💰 Jami: ${tracking.total.toLocaleString()} so'm\n`;
      message += `📅 Vaqt: ${tracking.createdAt.toLocaleDateString('uz-UZ')} ${tracking.createdAt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}\n\n`;

      // Current status with emoji
      const statusEmojis = {
        pending: '⏳ Kutilmoqda',
        confirmed: '✅ Tasdiqlandi',
        assigned: '🚚 Kuryer tayinlandi',
        preparing: '👨‍🍳 Tayyorlanmoqda',
        ready: '🎯 Tayyor',
        on_delivery: '🚚 Yo\'lda',
        delivered: '✅ Yetkazildi',
        cancelled: '❌ Bekor qilindi'
      };

      message += `📊 <b>Hozirgi holat:</b> ${statusEmojis[tracking.status] || tracking.status}\n\n`;

      // Estimated delivery time
      if (tracking.estimatedDelivery && tracking.isActive) {
        message += `⏰ <b>Tahminy vaqt:</b> ${tracking.estimatedDelivery.remainingMinutes} daqiqa\n\n`;
      }

      // Courier info (if assigned)
      if (tracking.courier && tracking.status === 'on_delivery') {
        message += `🏃‍♂️ <b>Kuryer:</b> ${tracking.courier.name}\n`;
        message += `📱 <b>Telefon:</b> ${tracking.courier.phone}\n`;
        if (tracking.courier.location) {
          message += `📍 <b>Lokatsiya:</b> Real-time kuzatish\n`;
        }
        message += '\n';
      }

      // Branch info (for pickup orders)
      if (tracking.branch && ['pickup', 'dine_in'].includes(tracking.orderType)) {
        message += `🏢 <b>Filial:</b> ${tracking.branch.name}\n`;
        message += `📍 <b>Manzil:</b> ${tracking.branch.address}\n`;
        message += `📞 <b>Telefon:</b> ${tracking.branch.phone}\n\n`;
      }

      // Timeline
      if (tracking.timeline && tracking.timeline.length > 0) {
        message += `📈 <b>Buyurtma tarixi:</b>\n`;
        tracking.timeline.slice(-5).forEach(event => {
          const time = new Date(event.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
          const statusText = statusEmojis[event.status] || event.status;
          message += `   ${time} - ${statusText}\n`;
        });
      }

      const keyboard = {
        inline_keyboard: []
      };

      // Add action buttons based on status
      if (tracking.status === 'on_delivery' && tracking.courier?.location) {
        keyboard.inline_keyboard.push([
          { text: '📍 Kuryer lokatsiyasi', callback_data: `courier_location_${orderId}` }
        ]);
      }

      if (tracking.status === 'ready' && tracking.orderType === 'pickup') {
        keyboard.inline_keyboard.push([
          { text: '📱 Filialga qo\'ng\'iroq', url: `tel:${tracking.branch?.phone || process.env.RESTAURANT_PHONE}` }
        ]);
      }

      if (tracking.status === 'delivered') {
        keyboard.inline_keyboard.push([
          { text: '⭐ Baho berish', callback_data: `rate_${orderId}` },
          { text: '🔄 Qayta buyurtma', callback_data: `reorder_${orderId}` }
        ]);
      }

      // Add refresh and back buttons
      keyboard.inline_keyboard.push([
        { text: '🔄 Yangilash', callback_data: `track_${orderId}` },
        { text: '🏠 Bosh menyu', callback_data: 'back_to_main' }
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Track order error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  },

  // Kuryer lokatsiyasini ko'rsatish
  async showCourierLocation(ctx) {
    try {
      const callbackData = ctx.callbackQuery?.data || '';
      const orderIdMatch = callbackData.match(/^courier_location_(.+)$/);
      
      if (!orderIdMatch) {
        return ctx.answerCbQuery('❌ Buyurtma ID topilmadi');
      }

      const orderId = orderIdMatch[1];
      const tracking = await orderTracker.getOrderTracking(orderId);

      if (!tracking || !tracking.courier?.location) {
        return ctx.answerCbQuery('❌ Kuryer lokatsiyasi mavjud emas', { show_alert: true });
      }

      const location = tracking.courier.location;
      const lastUpdate = new Date(location.updatedAt);
      const minutesAgo = Math.floor((new Date() - lastUpdate) / (60 * 1000));

      let message = `📍 <b>Kuryer lokatsiyasi</b>\n\n`;
      message += `🏃‍♂️ <b>Kuryer:</b> ${tracking.courier.name}\n`;
      message += `📱 <b>Telefon:</b> ${tracking.courier.phone}\n`;
      message += `⏰ <b>Oxirgi yangilanish:</b> ${minutesAgo} daqiqa oldin\n\n`;
      message += `📍 Kuryer sizga yaqinlashmoqda...`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📱 Kuryer bilan aloqa', url: `tel:${tracking.courier.phone}` }
          ],
          [
            { text: '🔄 Lokatsiyani yangilash', callback_data: `courier_location_${orderId}` },
            { text: '📋 Kuzatuv', callback_data: `track_${orderId}` }
          ],
          [
            { text: '🏠 Bosh menyu', callback_data: 'back_to_main' }
          ]
        ]
      };

      // Send location first
      try {
        await ctx.telegram.sendLocation(ctx.from.id, location.latitude, location.longitude, {
          live_period: 300, // 5 minutes
          reply_markup: {
            inline_keyboard: [
              [{ text: '📋 Buyurtma kuzatuvi', callback_data: `track_${orderId}` }]
            ]
          }
        });
      } catch (locationError) {
        console.error('Send location error:', locationError);
      }

      // Then send the message
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Show courier location error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  },

  // Qayta buyurtma berish
  async reorderItem(ctx) {
    try {
      const callbackData = ctx.callbackQuery?.data || '';
      const orderIdMatch = callbackData.match(/^reorder_(.+)$/);
      
      if (!orderIdMatch) {
        return ctx.answerCbQuery('❌ Buyurtma ID topilmadi');
      }

      const orderId = orderIdMatch[1];
      const order = await Order.findById(orderId).populate('items.product');

      if (!order) {
        return ctx.answerCbQuery('❌ Buyurtma topilmadi', { show_alert: true });
      }

      // Check if user owns this order
      const telegramId = ctx.from.id;
      const user = await User.findOne({ telegramId });
      if (!user || order.user.toString() !== user._id.toString()) {
        return ctx.answerCbQuery('❌ Bu buyurtma sizga tegishli emas', { show_alert: true });
      }

      let message = `🔄 <b>Qayta buyurtma</b>\n\n`;
      message += `📋 Avvalgi buyurtma: #${order.orderId}\n`;
      message += `📅 Sana: ${order.createdAt.toLocaleDateString('uz-UZ')}\n\n`;
      message += `🛒 <b>Mahsulotlar:</b>\n`;

      order.items.forEach((item, index) => {
        message += `${index + 1}. ${item.productName} - ${item.quantity} ta\n`;
      });

      message += `\n💰 <b>Jami:</b> ${order.total.toLocaleString()} so'm\n\n`;
      message += `Xuddi shu buyurtmani qayta berasizmi?`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Ha, qayta beraman', callback_data: `confirm_reorder_${orderId}` }
          ],
          [
            { text: '🛒 Yangi buyurtma', callback_data: 'show_categories' }
          ],
          [
            { text: '🔙 Orqaga', callback_data: 'quick_order' }
          ]
        ]
      };

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Reorder item error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  },

  // Qayta buyurtmani tasdiqlash
  async confirmReorder(ctx) {
    try {
      const callbackData = ctx.callbackQuery?.data || '';
      const orderIdMatch = callbackData.match(/^confirm_reorder_(.+)$/);
      
      if (!orderIdMatch) {
        return ctx.answerCbQuery('❌ Buyurtma ID topilmadi');
      }

      const orderId = orderIdMatch[1];
      const originalOrder = await Order.findById(orderId).populate('items.product');

      if (!originalOrder) {
        return ctx.answerCbQuery('❌ Buyurtma topilmadi', { show_alert: true });
      }

      const telegramId = ctx.from.id;
      const user = await User.findOne({ telegramId });
      if (!user || originalOrder.user.toString() !== user._id.toString()) {
        return ctx.answerCbQuery('❌ Bu buyurtma sizga tegishli emas', { show_alert: true });
      }

      // Clear existing cart and add items from previous order
      const { Cart } = require('../../../../models');
      let cart = await Cart.findOne({ user: user._id, isActive: true });
      
      if (!cart) {
        cart = new Cart({ user: user._id, items: [], isActive: true });
      } else {
        cart.items = []; // Clear existing items
      }

      // Add items from the original order
      console.log('🔍 Original order items:', originalOrder.items.length);
      
      for (const item of originalOrder.items) {
        console.log('🔍 Processing item:', {
          productName: item.productName,
          productExists: !!item.product,
          isActive: item.product?.isActive,
          isAvailable: item.product?.isAvailable
        });
        
        // Check availability - if isAvailable is undefined, treat as true
        const isAvailable = item.product.isAvailable !== false;
        
        if (item.product && item.product.isActive && isAvailable) {
          cart.items.push({
            product: item.product._id,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.price * item.quantity
          });
          console.log('✅ Added to cart:', item.productName);
        } else {
          console.log('❌ Skipped unavailable item:', item.productName);
        }
      }

      await cart.save();
      console.log('🔍 Reorder cart saved. Total items:', cart.items.length);

      await ctx.answerCbQuery('✅ Mahsulotlar savatga qo\'shildi!');
      
      // Show cart
      const { showCart } = require('../cart');
      await showCart(ctx);

    } catch (error) {
      console.error('Confirm reorder error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }
};

module.exports = trackingHandlers;