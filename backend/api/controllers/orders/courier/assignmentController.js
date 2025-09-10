const { Order, User, Branch } = require('../../../../models');
const DeliveryService = require('../../../../services/deliveryService');
const SocketManager = require('../../../../config/socketConfig');

/**
 * Courier Assignment Controller
 * Kuryer tayinlash operatsiyalari
 */

// PATCH /api/orders/:id/assign-courier
async function assignCourier(req, res) {
  try {
    console.log('🚚 ASSIGN COURIER API CALLED:', {
      orderId: req.params.id,
      courierId: req.body.courierId,
      adminUser: req.user.firstName || req.user._id,
      adminRole: req.user.role,
      timestamp: new Date().toISOString()
    });
    
    const { id } = req.params;
    const { courierId } = req.body;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    
    const courier = await User.findOne({ _id: courierId, role: 'courier', isActive: true });
    if (!courier) {
      return res.status(400).json({ 
        success: false, 
        message: 'Haydovchi topilmadi yoki mavjud emas!' 
      });
    }
    
    const query = { _id: id };
    if (branchId) query.branch = branchId;
    
    const existingOrder = await Order.findOne(query).select('status deliveryInfo.courier orderId');
    if (!existingOrder) {
      return res.status(404).json({ 
        success: false, 
        message: 'Buyurtma topilmadi!' 
      });
    }
    
    if (['delivered', 'completed', 'cancelled'].includes(existingOrder.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ushbu buyurtma yakunlangan yoki bekor qilingan.' 
      });
    }
    
    if (existingOrder.deliveryInfo?.courier) {
      if (String(existingOrder.deliveryInfo.courier) === String(courierId)) {
        // Same courier already assigned - return success instead of error
        console.log(`Courier ${courierId} already assigned to order ${existingOrder.orderId} - returning success`);
        return res.json({ 
          success: true, 
          message: 'Kuryer allaqachon tayinlangan.' 
        });
      } else {
        // Allow re-assignment to a different courier
        console.log(`Re-assigning courier for order ${existingOrder.orderId} from ${existingOrder.deliveryInfo.courier} to ${courierId}`);
      }
    }
    
    const update = { 
      'deliveryInfo.courier': courierId, 
      updatedAt: new Date() 
    };
    
    // Update courier assignment
    const order = await Order.findOneAndUpdate(
      query, 
      update, 
      { new: true }
    )
      .populate('deliveryInfo.courier', 'firstName lastName phone telegramId courierInfo')
      .populate('user', 'firstName lastName phone telegramId')
      .populate('branch', 'name title address coordinates');
    
    // Use centralized status service
    const OrderStatusService = require('../../../../services/orderStatusService');
    
    // 🔧 FIX: Admin kuryer tayinlaganda har doim "assigned" statusga o'tkazish
    console.log(`🔍 Courier assignment: Current status: ${order.status}, changing to: assigned`);
    
    // To'g'ridan-to'g'ri order status ni o'zgartiramiz
    order.status = 'assigned';
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'assigned',
      message: `Kuryer tayinlandi: ${courier.firstName} ${courier.lastName}`,
      timestamp: new Date(),
      updatedBy: req.user._id
    });
    order.updatedAt = new Date();
    await order.save();
    
    console.log(`✅ Order status changed to: ${order.status}`);
    
    // Socket notification yuborish
    try {
      SocketManager.emitOrderUpdate(order._id.toString(), {
        orderId: order.orderId,
        status: 'assigned',
        message: `Kuryer tayinlandi: ${courier.firstName} ${courier.lastName}`,
        branchId: String(order.branch || ''),
        courier: {
          _id: courier._id,
          firstName: courier.firstName,
          lastName: courier.lastName,
          phone: courier.phone
        },
        timestamp: new Date()
      });
      console.log('✅ Socket notification sent for courier assignment with courier details');
    } catch (socketError) {
      console.error('❌ Socket notification error:', socketError);
    }
    
    // 🔧 FIX: Manual kuryer tayinlashda ham kuryerga telegram notification yuborish
    try {
      console.log('🚚 Sending telegram notification to courier after manual assignment');
      console.log('🚚 Courier details:', {
        courierId: courier._id,
        courierName: courier.firstName,
        telegramId: courier.telegramId,
        orderType: order.orderType
      });
      
      const bot = global.botInstance;
      console.log('🚚 Bot instance status:', !!bot);
      
      if (bot && courier.telegramId) {
        const message = `🚚 **Yangi buyurtma tayinlandi!**\n\n` +
          `📋 **Buyurtma №:** ${order.orderId}\n` +
          `💰 **Jami:** ${order.total.toLocaleString()} so'm\n` +
          `📍 **Manzil:** ${order.deliveryInfo?.address || 'Kiritilmagan'}\n` +
          `📞 **Mijoz:** ${order.customerInfo?.phone || 'N/A'}\n\n` +
          `Buyurtmani qabul qilish uchun "Yo'ldaman" tugmasini bosing.`;
        
        await bot.telegram.sendMessage(courier.telegramId, message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚗 Yo\'ldaman', callback_data: `courier_on_way_${order._id}` }],
              [{ text: '❌ Rad etish', callback_data: `courier_reject_${order._id}` }]
            ]
          }
        });
        
        console.log('✅ Manual assignment telegram notification sent to courier:', courier.telegramId);
      } else {
        console.log('❌ Cannot send notification - bot or courier telegramId missing');
      }
    } catch (courierNotifyError) {
      console.error('❌ Manual courier assignment notification error:', courierNotifyError);
    }
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Buyurtma topilmadi!' 
      });
    }
    
    // Notify customer that order is on delivery with ETA
    try {
      if (order.user?.telegramId && order.orderType === 'delivery') {
        let etaText = '';
        try {
          if (order?.deliveryInfo?.location?.latitude && order?.deliveryInfo?.location?.longitude) {
            let origin = null;
            const branchIdForOrigin = order?.branch?._id || order?.branch;
            if (branchIdForOrigin) {
              const b = await Branch.findById(branchIdForOrigin);
              if (b?.address?.coordinates?.latitude && b?.address?.coordinates?.longitude) {
                origin = { lat: b.address.coordinates.latitude, lon: b.address.coordinates.longitude };
              }
            }
            if (!origin && process.env.DEFAULT_RESTAURANT_LAT && process.env.DEFAULT_RESTAURANT_LON) {
              origin = { lat: parseFloat(process.env.DEFAULT_RESTAURANT_LAT), lon: parseFloat(process.env.DEFAULT_RESTAURANT_LON) };
            }
            const calc = await DeliveryService.calculateDeliveryTime({ 
              latitude: order.deliveryInfo.location.latitude, 
              longitude: order.deliveryInfo.location.longitude 
            }, order.items, origin || undefined);
            if (calc?.totalTime) etaText = `${calc.totalTime} daqiqa`;
          }
        } catch (e) {
          console.error('ETA calculation error:', e);
        }
        
        if (!etaText && order.deliveryMeta?.etaMinutes) etaText = `${order.deliveryMeta?.etaMinutes} daqiqa`;
        if (!etaText) etaText = 'taxminan 30-45 daqiqa';
        
        const courierName = `${order.deliveryInfo?.courier?.firstName || ''} ${order.deliveryInfo?.courier?.lastName || ''}`.trim();
        const courierPhone = order.deliveryInfo?.courier?.phone || '';
        const text = `🚚 Buyurtmangiz yetkazilmoqda\n\nKuryer: ${courierName || '—'}\nTelefon: ${courierPhone || '—'}\nETA: ${etaText}`;
        
        const bot = global.botInstance;
        if (bot) {
          await bot.telegram.sendMessage(order.user.telegramId, text);
        } else {
          console.error('❌ Bot instance not found for customer notification');
        }
      }
    } catch (e) {
      console.error('Customer notification error:', e);
    }
    
    const changed = existingOrder.deliveryInfo?.courier && String(existingOrder.deliveryInfo.courier) !== String(courierId);
    res.json({ 
      success: true, 
      message: changed ? 'Kuryer o\'zgartirildi!' : 'Haydovchi tayinlandi!', 
      data: { order } 
    });
  } catch (error) {
    console.error('Assign courier error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Haydovchi tayinlashda xatolik!' 
    });
  }
}

// Kuryer buyurtmani qabul qiladi
async function courierAcceptOrder(req, res) {
  try {
    const { orderId } = req.params;
    const { latitude, longitude } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Buyurtma topilmadi!' 
      });
    }
    
    if (order.status !== 'assigned') {
      return res.status(400).json({ 
        success: false, 
        message: 'Buyurtma hali kuryerga tayinlanmagan!' 
      });
    }
    
    // Kuryer oqimini yangilash
    order.courierFlow = order.courierFlow || {};
    order.courierFlow.acceptedAt = new Date();
    order.courierFlow.currentLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date()
    };
    
    await order.save();
    
    // Real-time yangilash
    try {
      SocketManager.emitOrderStatusUpdateToBranch(order.branch, {
        orderId: order._id,
        status: 'assigned',
        courierAccepted: true,
        courierLocation: order.courierFlow.currentLocation,
        updatedAt: new Date()
      });
    } catch (e) {
      console.error('Socket emit error:', e);
    }
    
    res.json({ 
      success: true, 
      message: 'Buyurtma qabul qilindi!' 
    });
  } catch (error) {
    console.error('Courier accept order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Buyurtmani qabul qilishda xatolik!' 
    });
  }
}

module.exports = {
  assignCourier,
  courierAcceptOrder
};