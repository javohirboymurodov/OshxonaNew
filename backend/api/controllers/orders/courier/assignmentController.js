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
      .populate('deliveryInfo.courier', 'firstName lastName phone courierInfo')
      .populate('user', 'firstName lastName phone telegramId')
      .populate('branch', 'address coordinates');
    
    // Use centralized status service
    const OrderStatusService = require('../../../../services/orderStatusService');
    
    // Only update status to 'assigned' if the order is not already in ready/preparing state
    const targetStatus = ['ready', 'preparing'].includes(order.status) ? order.status : 'assigned';
    
    if (targetStatus === 'assigned') {
      await OrderStatusService.updateStatus(order._id, 'assigned', {
        message: `Kuryer tayinlandi: ${courier.firstName} ${courier.lastName}`,
        updatedBy: req.user._id
      });
    } else {
      // Just emit courier assignment notification without status change
      SocketManager.emitOrderUpdate(order._id.toString(), {
        type: 'courier-assigned',
        orderId: order.orderId,
        courierName: `${courier.firstName} ${courier.lastName}`,
        courierPhone: courier.phone,
        message: `Kuryer tayinlandi: ${courier.firstName} ${courier.lastName}`,
        timestamp: new Date()
      });
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
        
        const { bot } = require('../../../../index');
        await bot.telegram.sendMessage(order.user.telegramId, text);
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