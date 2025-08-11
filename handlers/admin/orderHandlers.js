// Order management handlers - admin side
const { Order, User } = require('../../models');
const AdminKeyboards = require('../../keyboards/adminKeyboards');
const moment = require('moment');

class OrderHandlers {
  // Buyurtmalar boshqaruvi asosiy menyu
  static async showOrderManagement(ctx) {
    return this.orderManagementHandler(ctx);
  }

  static async orderManagementHandler(ctx) {
    try {
      console.log('=== ORDER MANAGEMENT HANDLER CALLED ===');
      console.log('User ID:', ctx.from.id);
      console.log('Callback data:', ctx.callbackQuery?.data);
      
      if (!this.isAdmin(ctx)) {
        console.log('User is not admin');
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      console.log('=== Getting Order Stats ===');
      
      const stats = await this.getOrderStats();
      console.log('Order Stats received:', stats);
      
      const message = `
📦 **Buyurtmalar boshqaruvi**

📊 **Oxirgi 7 kun statistikasi:**
• Yangi: ${stats.new}
• Tayyorlanayotgan: ${stats.preparing}
• Tayyor: ${stats.ready}
• Yetkazilayotgan: ${stats.delivering}
• Yakunlangan: ${stats.completed}
• Bekor qilingan: ${stats.cancelled}

**Jami:** ${stats.total}
      `;
      
      console.log('Message to send:', message);
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: AdminKeyboards.orderManagement().reply_markup
      });
      
      console.log('Message sent successfully');
      
    } catch (error) {
      console.error('Order management error:', error);
      await ctx.answerCbQuery('Buyurtmalar boshqaruvida xatolik!');
    }
  }

  // Yangi buyurtmalarni ko'rsatish
  static async showNewOrders(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      console.log('=== Show New Orders Called ===');
      
      // Oxirgi 7 kun uchun yangi buyurtmalar
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);
      console.log('Searching orders from date gte:', lastWeek);
      
      const orders = await Order.find({ 
        status: 'pending',
        createdAt: { $gte: lastWeek }
      })
      .populate('user', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .limit(10);
      
      console.log('New orders found:', orders.length);
      
      if (orders.length === 0) {
        return await ctx.editMessageText('🎉 Yangi buyurtmalar yo\'q!', {
          reply_markup: AdminKeyboards.backToAdmin().reply_markup
        });
      }
      
      let message = `🆕 **Yangi buyurtmalar** (${orders.length})\n\n`;
      
      orders.forEach((order, index) => {
        const createdTime = new Date(order.createdAt);
        const timeStr = `${createdTime.getHours().toString().padStart(2, '0')}:${createdTime.getMinutes().toString().padStart(2, '0')}`;
        
        message += `${index + 1}. **${order.orderId}**\n`;
        message += `👤 ${order.user.firstName} ${order.user.lastName || ''}\n`;
        message += `📱 ${order.user.phone || 'Telefon yo\'q'}\n`;
        message += `💰 ${order.total.toLocaleString()} so'm\n`;
        message += `🕐 ${timeStr}\n`;
        message += `📍 ${order.orderType === 'delivery' ? 'Yetkazib berish' : order.orderType === 'pickup' ? 'Olib ketish' : 'Oldindan Buyurtma'}\n\n`;
      });
      
      // Birinchi buyurtma uchun boshqaruv tugmalari
      const keyboard = {
        inline_keyboard: [
          [
            { text: '👀 Ko\'rish', callback_data: `view_order_${orders[0]._id}` },
            { text: '✅ Tasdiqlash', callback_data: `confirm_order_${orders[0]._id}` }
          ],
          [
            { text: '🔄 Yangilash', callback_data: 'orders_new' },
            { text: '🔙 Ortga', callback_data: 'admin_orders' }
          ]
        ]
      };
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      
    } catch (error) {
      console.error('Show new orders error:', error);
      await ctx.answerCbQuery('Yangi buyurtmalarni ko\'rsatishda xatolik!');
    }
  }

  // Buyurtma tafsilotlarini ko'rsatish
  static async viewOrderDetails(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const orderId = ctx.callbackQuery.data.split('_')[2];
      
      const order = await Order.findById(orderId)
        .populate('user', 'firstName lastName phone')
        .populate('items.product', 'name price');
      
      if (!order) {
        return await ctx.answerCbQuery('Buyurtma topilmadi!');
      }
      
      let message = `
📦 **Buyurtma tafsilotlari**

🆔 **Raqam:** ${order.orderId}
📅 **Sana:** ${moment(order.createdAt).format('DD.MM.YYYY HH:mm')}
📊 **Holat:** ${this.getOrderStatusText(order.status)}

👤 **Mijoz:**
• Ism: ${order.user.firstName} ${order.user.lastName || ''}
• Telefon: ${order.customerInfo.phone || order.user.phone || 'Yo\'q'}

📍 **Yetkazib berish:**
• Tur: ${order.orderType === 'delivery' ? '🚚 Yetkazib berish' : order.orderType === 'pickup' ? '🏃 Olib ketish' : '🍽️ Oldindan Buyurtma'}
`;
      
      if (order.orderType === 'delivery' && order.deliveryInfo?.address) {
        message += `• Manzil: ${order.deliveryInfo.address}\n`;
      }
      
      message += `\n🛍️ **Buyurtma tarkibi:**\n`;
      
      order.items.forEach((item, index) => {
        message += `${index + 1}. **${item.productName || item.product?.name || 'Noma\'lum'}**\n`;
        message += `   ${item.quantity} x ${item.price.toLocaleString()} = ${(item.quantity * item.price).toLocaleString()} so'm\n`;
        
        if (item.specialInstructions) {
          message += `   💬 ${item.specialInstructions}\n`;
        }
      });
      
      message += `\n💰 **Jami: ${order.total.toLocaleString()} so'm**\n`;
      message += `💳 **To'lov:** ${this.getPaymentMethodName(order.paymentMethod)}`;
      
      if (order.notes) {
        message += `\n📝 **Izoh:** ${order.notes}`;
      }
      
      const keyboard = AdminKeyboards.orderDetails(order);
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup
      });
      
    } catch (error) {
      console.error('View order details error:', error);
      await ctx.answerCbQuery('Buyurtma tafsilotlarini ko\'rsatishda xatolik!');
    }
  }

  // Buyurtmani tasdiqlash
  static async confirmOrder(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const orderId = ctx.callbackQuery.data.split('_')[2];
      
      const order = await Order.findById(orderId);
      if (!order) {
        return await ctx.answerCbQuery('Buyurtma topilmadi!');
      }
      
      if (order.status !== 'pending') {
        return await ctx.answerCbQuery('Bu buyurtma allaqachon jarayon boshlangan!');
      }
      
      // Buyurtma holatini yangilash
      order.status = 'confirmed';
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: 'confirmed',
        timestamp: new Date(),
        note: 'Admin tomonidan tasdiqlandi',
        updatedBy: 'admin'
      });
      await order.save();
      
      await ctx.answerCbQuery('✅ Buyurtma tasdiqlandi!');
      
      // Tafsilotlarni qayta ko'rsatish
      return await this.viewOrderDetails(ctx);
      
    } catch (error) {
      console.error('Confirm order error:', error);
      await ctx.answerCbQuery('Buyurtmani tasdiqlashda xatolik!');
    }
  }

  // Buyurtmani rad etish
  static async rejectOrder(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const orderId = ctx.callbackQuery.data.split('_')[2];
      
      const order = await Order.findById(orderId);
      if (!order) {
        return await ctx.answerCbQuery('Buyurtma topilmadi!');
      }
      
      if (!['pending', 'confirmed'].includes(order.status)) {
        return await ctx.answerCbQuery('Bu buyurtmani rad eta olmaysiz!');
      }
      
      // Buyurtma holatini yangilash
      order.status = 'cancelled';
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: 'cancelled',
        timestamp: new Date(),
        note: 'Admin tomonidan rad etildi',
        updatedBy: 'admin'
      });
      await order.save();
      
      await ctx.answerCbQuery('❌ Buyurtma rad etildi!');
      
      // Yangi buyurtmalar ro'yxatiga qaytish
      return this.showNewOrders(ctx);
      
    } catch (error) {
      console.error('Reject order error:', error);
      await ctx.answerCbQuery('Buyurtmani rad etishda xatolik!');
    }
  }

  // Buyurtmani tayyorlash holatiga o'tkazish
  static async prepareOrder(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const orderId = ctx.callbackQuery.data.split('_')[2];
      
      const order = await Order.findById(orderId);
      if (!order) {
        return await ctx.answerCbQuery('Buyurtma topilmadi!');
      }
      
      if (!['confirmed', 'pending'].includes(order.status)) {
        return await ctx.answerCbQuery('Bu buyurtmani tayyorlash holatiga o\'tkazib bo\'lmaydi!');
      }
      
      // Buyurtma holatini yangilash
      order.status = 'preparing';
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: 'preparing',
        timestamp: new Date(),
        note: 'Tayyorlash boshlandi',
        updatedBy: 'admin'
      });
      await order.save();
      
      await ctx.answerCbQuery('👨‍🍳 Buyurtma tayyorlanmoqda!');
      
      // Tafsilotlarni qayta ko'rsatish
      return await this.viewOrderDetails(ctx);
      
    } catch (error) {
      console.error('Prepare order error:', error);
      await ctx.answerCbQuery('Buyurtmani tayyorlash holatiga o\'tkazishda xatolik!');
    }
  }

  // Buyurtmani tayyor holatiga o'tkazish
  static async readyOrder(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const orderId = ctx.callbackQuery.data.split('_')[2];
      
      const order = await Order.findById(orderId);
      if (!order) {
        return await ctx.answerCbQuery('Buyurtma topilmadi!');
      }
      
      if (!['preparing', 'confirmed'].includes(order.status)) {
        return await ctx.answerCbQuery('Bu buyurtmani tayyor holatiga o\'tkazib bo\'lmaydi!');
      }
      
      // Buyurtma holatini yangilash
      order.status = 'ready';
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: 'ready',
        timestamp: new Date(),
        note: 'Buyurtma tayyor',
        updatedBy: 'admin'
      });
      await order.save();
      
      await ctx.answerCbQuery('🎯 Buyurtma tayyor!');
      
      // Tafsilotlarni qayta ko'rsatish
      return await this.viewOrderDetails(ctx);
      
    } catch (error) {
      console.error('Ready order error:', error);
      await ctx.answerCbQuery('Buyurtmani tayyor holatiga o\'tkazishda xatolik!');
    }
  }

  // Buyurtmani yetkazish holatiga o'tkazish
  static async deliverOrder(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const orderId = ctx.callbackQuery.data.split('_')[2];
      
      const order = await Order.findById(orderId);
      if (!order) {
        return await ctx.answerCbQuery('Buyurtma topilmadi!');
      }
      
      if (order.status !== 'ready') {
        return await ctx.answerCbQuery('Faqat tayyor buyurtmalarni yetkazish holatiga o\'tkazish mumkin!');
      }
      
      // Buyurtma holatini yangilash
      order.status = 'on_delivery';
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: 'on_delivery',
        timestamp: new Date(),
        note: 'Yetkazish boshlandi',
        updatedBy: 'admin'
      });
      await order.save();
      
      await ctx.answerCbQuery('🚚 Buyurtma yetkazilmoqda!');
      
      // Tafsilotlarni qayta ko'rsatish
      return await this.viewOrderDetails(ctx);
      
    } catch (error) {
      console.error('Deliver order error:', error);
      await ctx.answerCbQuery('Buyurtmani yetkazish holatiga o\'tkazishda xatolik!');
    }
  }

  // Buyurtmani yakunlash
  static async completeOrder(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      const orderId = ctx.callbackQuery.data.split('_')[2];
      
      const order = await Order.findById(orderId);
      if (!order) {
        return await ctx.answerCbQuery('Buyurtma topilmadi!');
      }
      
      if (!['ready', 'on_delivery'].includes(order.status)) {
        return await ctx.answerCbQuery('Bu buyurtmani yakunlab bo\'lmaydi!');
      }
      
      // Buyurtma holatini yangilash
      order.status = 'completed';
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: 'completed',
        timestamp: new Date(),
        note: 'Buyurtma yakunlandi',
        updatedBy: 'admin'
      });
      await order.save();
      
      await ctx.answerCbQuery('✅ Buyurtma yakunlandi!');
      
      // Tafsilotlarni qayta ko'rsatish
      return await this.viewOrderDetails(ctx);
      
    } catch (error) {
      console.error('Complete order error:', error);
      await ctx.answerCbQuery('Buyurtmani yakunlashda xatolik!');
    }
  }

  // Tayyorlanayotgan buyurtmalarni ko'rsatish
  static async showPreparingOrders(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      console.log('=== Show Preparing Orders Called ===');
      
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);
      
      const orders = await Order.find({ 
        status: 'preparing',
        createdAt: { $gte: lastWeek }
      })
      .populate('user', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .limit(10);
      
      console.log('Preparing orders found:', orders.length);
      
      if (orders.length === 0) {
        return await ctx.editMessageText('👨‍🍳 Tayyorlanayotgan buyurtmalar yo\'q!', {
          reply_markup: AdminKeyboards.backToAdmin().reply_markup
        });
      }
      
      let message = `👨‍🍳 **Tayyorlanayotgan buyurtmalar** (${orders.length})\n\n`;
      
      orders.forEach((order, index) => {
        const createdTime = new Date(order.createdAt);
        const timeStr = `${createdTime.getHours().toString().padStart(2, '0')}:${createdTime.getMinutes().toString().padStart(2, '0')}`;
        
        message += `${index + 1}. **${order.orderId}**\n`;
        message += `👤 ${order.user.firstName} ${order.user.lastName || ''}\n`;
        message += `📱 ${order.user.phone || 'Telefon yo\'q'}\n`;
        message += `💰 ${order.total.toLocaleString()} so'm\n`;
        message += `🕐 ${timeStr}\n`;
        message += `📍 ${order.orderType === 'delivery' ? 'Yetkazib berish' : order.orderType === 'pickup' ? 'Olib ketish' : 'Oldindan Buyurtma'}\n\n`;
      });
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '👀 Ko\'rish', callback_data: `view_order_${orders[0]._id}` },
            { text: '🎯 Tayyor', callback_data: `ready_order_${orders[0]._id}` }
          ],
          [
            { text: '🔄 Yangilash', callback_data: 'orders_preparing' },
            { text: '🔙 Ortga', callback_data: 'admin_orders' }
          ]
        ]
      };
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      
    } catch (error) {
      console.error('Show preparing orders error:', error);
      await ctx.answerCbQuery('Tayyorlanayotgan buyurtmalarni ko\'rsatishda xatolik!');
    }
  }

  // Tayyor buyurtmalarni ko'rsatish
  static async showReadyOrders(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      console.log('=== Show Ready Orders Called ===');
      
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);
      
      const orders = await Order.find({ 
        status: 'ready',
        createdAt: { $gte: lastWeek }
      })
      .populate('user', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .limit(10);
      
      console.log('Ready orders found:', orders.length);
      
      if (orders.length === 0) {
        return await ctx.editMessageText('✅ Tayyor buyurtmalar yo\'q!', {
          reply_markup: AdminKeyboards.backToAdmin().reply_markup
        });
      }
      
      let message = `✅ **Tayyor buyurtmalar** (${orders.length})\n\n`;
      
      orders.forEach((order, index) => {
        const createdTime = new Date(order.createdAt);
        const timeStr = `${createdTime.getHours().toString().padStart(2, '0')}:${createdTime.getMinutes().toString().padStart(2, '0')}`;
        
        message += `${index + 1}. **${order.orderId}**\n`;
        message += `👤 ${order.user.firstName} ${order.user.lastName || ''}\n`;
        message += `📱 ${order.user.phone || 'Telefon yo\'q'}\n`;
        message += `💰 ${order.total.toLocaleString()} so'm\n`;
        message += `🕐 ${timeStr}\n`;
        message += `📍 ${order.orderType === 'delivery' ? 'Yetkazib berish' : order.orderType === 'pickup' ? 'Olib ketish' : 'Oldindan Buyurtma'}\n\n`;
      });
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '👀 Ko\'rish', callback_data: `view_order_${orders[0]._id}` },
            { text: '🚚 Yetkazish', callback_data: `deliver_order_${orders[0]._id}` }
          ],
          [
            { text: '🔄 Yangilash', callback_data: 'orders_ready' },
            { text: '🔙 Ortga', callback_data: 'admin_orders' }
          ]
        ]
      };
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      
    } catch (error) {
      console.error('Show ready orders error:', error);
      await ctx.answerCbQuery('Tayyor buyurtmalarni ko\'rsatishda xatolik!');
    }
  }

  // Yetkazilayotgan buyurtmalarni ko'rsatish
  static async showDeliveringOrders(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      console.log('=== Show Delivering Orders Called ===');
      
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);
      
      const orders = await Order.find({ 
        status: 'on_delivery',
        createdAt: { $gte: lastWeek }
      })
      .populate('user', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .limit(10);
      
      console.log('Delivering orders found:', orders.length);
      
      if (orders.length === 0) {
        return await ctx.editMessageText('🚚 Yetkazilayotgan buyurtmalar yo\'q!', {
          reply_markup: AdminKeyboards.backToAdmin().reply_markup
        });
      }
      
      let message = `🚚 **Yetkazilayotgan buyurtmalar** (${orders.length})\n\n`;
      
      orders.forEach((order, index) => {
        const createdTime = new Date(order.createdAt);
        const timeStr = `${createdTime.getHours().toString().padStart(2, '0')}:${createdTime.getMinutes().toString().padStart(2, '0')}`;
        
        message += `${index + 1}. **${order.orderId}**\n`;
        message += `👤 ${order.user.firstName} ${order.user.lastName || ''}\n`;
        message += `📱 ${order.user.phone || 'Telefon yo\'q'}\n`;
        message += `💰 ${order.total.toLocaleString()} so'm\n`;
        message += `🕐 ${timeStr}\n`;
        message += `📍 ${order.orderType === 'delivery' ? 'Yetkazib berish' : order.orderType === 'pickup' ? 'Olib ketish' : 'Oldindan Buyurtma'}\n\n`;
      });
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '👀 Ko\'rish', callback_data: `view_order_${orders[0]._id}` },
            { text: '✅ Bajarildi', callback_data: `complete_order_${orders[0]._id}` }
          ],
          [
            { text: '🔄 Yangilash', callback_data: 'orders_delivering' },
            { text: '🔙 Ortga', callback_data: 'admin_orders' }
          ]
        ]
      };
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      
    } catch (error) {
      console.error('Show delivering orders error:', error);
      await ctx.answerCbQuery('Yetkazilayotgan buyurtmalarni ko\'rsatishda xatolik!');
    }
  }

  // Barcha buyurtmalarni ko'rsatish
  static async showAllOrders(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      console.log('=== Show All Orders Called ===');
      
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);
      
      const orders = await Order.find({ 
        createdAt: { $gte: lastWeek }
      })
      .populate('user', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .limit(20);
      
      console.log('All orders found:', orders.length);
      
      if (orders.length === 0) {
        return await ctx.editMessageText('📋 Oxirgi 7 kunda buyurtmalar yo\'q!', {
          reply_markup: AdminKeyboards.backToAdmin().reply_markup
        });
      }
      
      let message = `📋 **Barcha buyurtmalar** (${orders.length})\n\n`;
      
      orders.slice(0, 10).forEach((order, index) => {
        const createdTime = new Date(order.createdAt);
        const timeStr = `${createdTime.getHours().toString().padStart(2, '0')}:${createdTime.getMinutes().toString().padStart(2, '0')}`;
        const statusText = this.getOrderStatusText(order.status);
        
        message += `${index + 1}. **${order.orderId}**\n`;
        message += `👤 ${order.user.firstName} ${order.user.lastName || ''}\n`;
        message += `📊 ${statusText}\n`;
        message += `💰 ${order.total.toLocaleString()} so'm\n`;
        message += `🕐 ${timeStr}\n\n`;
      });
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '👀 Ko\'rish', callback_data: `view_order_${orders[0]._id}` }
          ],
          [
            { text: '🔄 Yangilash', callback_data: 'orders_all' },
            { text: '🔙 Ortga', callback_data: 'admin_orders' }
          ]
        ]
      };
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      
    } catch (error) {
      console.error('Show all orders error:', error);
      await ctx.answerCbQuery('Barcha buyurtmalarni ko\'rsatishda xatolik!');
    }
  }

  // Buyurtmalar statistikasi
  static async showOrdersStats(ctx) {
    try {
      if (!this.isAdmin(ctx)) {
        return await ctx.answerCbQuery('Sizda admin huquqi yo\'q!');
      }
      
      console.log('=== Show Orders Stats Called ===');
      
      const stats = await this.getOrderStats();
      
      let message = `📊 **Buyurtmalar statistikasi**\n\n`;
      message += `📈 **Oxirgi 7 kun:**\n`;
      message += `• Jami buyurtmalar: ${stats.total}\n`;
      message += `• Yangi: ${stats.new}\n`;
      message += `• Tayyorlanayotgan: ${stats.preparing}\n`;
      message += `• Tayyor: ${stats.ready}\n`;
      message += `• Yetkazilayotgan: ${stats.delivering}\n`;
      message += `• Yakunlangan: ${stats.completed}\n`;
      message += `• Bekor qilingan: ${stats.cancelled}\n\n`;
      
      const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
      message += `✅ **Yakunlanish foizi:** ${completionRate}%\n`;
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Yangilash', callback_data: 'orders_stats' },
            { text: '🔙 Ortga', callback_data: 'admin_orders' }
          ]
        ]
      };
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      
    } catch (error) {
      console.error('Show orders stats error:', error);
      await ctx.answerCbQuery('Buyurtmalar statistikasini ko\'rsatishda xatolik!');
    }
  }

  // Helper methods
  static async getOrderStats() {
    try {
      console.log('=== Getting Order Stats ===');
      
      // Oxirgi 7 kun uchun statistika (bugun faqat emas)
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      console.log('Date range (last 7 days):', {
        from: lastWeek,
        to: today
      });
      console.log('Date range ISO:', {
        from: lastWeek.toISOString(),
        to: today.toISOString()
      });
      
      // Avval barcha pending buyurtmalarni ko'ramiz
      const allPending = await Order.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(10);
      console.log('=== ALL PENDING ORDERS IN DB ===');
      allPending.forEach((order, index) => {
        const isInRange = order.createdAt >= lastWeek && order.createdAt <= today;
        console.log(`${index + 1}. Order: ${order.orderId}`);
        console.log(`   Created: ${order.createdAt.toISOString()}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   In range (last 7 days)? ${isInRange}`);
      });
      
      const orders = await Order.find({
        createdAt: { $gte: lastWeek, $lte: today }
      });
      
      console.log('Orders found in last 7 days:', orders.length);
      console.log('Orders:', orders.map(o => ({
        id: o._id,
        orderId: o.orderId,
        status: o.status,
        createdAt: o.createdAt
      })));
      
      const stats = {
        total: orders.length,
        new: orders.filter(o => o.status === 'pending').length,
        preparing: orders.filter(o => o.status === 'preparing').length,
        ready: orders.filter(o => o.status === 'ready').length,
        delivering: orders.filter(o => o.status === 'on_delivery').length,
        completed: orders.filter(o => ['delivered', 'completed'].includes(o.status)).length,
        cancelled: orders.filter(o => o.status === 'cancelled').length
      };
      
      console.log('Calculated stats:', stats);
      
      return stats;
    } catch (error) {
      console.error('Get order stats error:', error);
      return {
        total: 0, new: 0, preparing: 0, ready: 0, 
        delivering: 0, completed: 0, cancelled: 0
      };
    }
  }

  static getOrderStatusText(status) {
    const statuses = {
      pending: '⏳ Kutilmoqda',
      confirmed: '✅ Tasdiqlandi',
      preparing: '👨‍🍳 Tayyorlanmoqda',
      ready: '🎯 Tayyor',
      on_delivery: '🚚 Yetkazilmoqda',
      delivered: '✅ Yetkazildi',
      picked_up: '🏃 Olib ketildi',
      completed: '🎉 Yakunlandi',
      cancelled: '❌ Bekor qilindi',
      refunded: '💸 Qaytarildi'
    };
    
    return statuses[status] || status;
  }

  static getPaymentMethodName(method) {
    const methods = {
      cash: 'Naqd pul',
      card: 'Plastik karta',
      click: 'Click',
      payme: 'Payme',
      uzcard: 'UzCard',
      humo: 'Humo'
    };
    
    return methods[method] || method;
  }

  static isAdmin(ctx) {
    const adminIds = process.env.ADMIN_ID ? 
      process.env.ADMIN_ID.split(',').map(id => parseInt(id.toString().trim())) : 
      [];
    return adminIds.includes(ctx.from.id);
  }
}

module.exports = OrderHandlers;
