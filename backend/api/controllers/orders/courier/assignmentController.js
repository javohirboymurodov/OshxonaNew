/**
 * Courier Assignment Controller
 * Kuryer tayinlash operatsiyalari
 */

const { Order, User, Branch } = require('../../../../models');
const DeliveryService = require('../../../../services/deliveryService');
const SocketManager = require('../../../../config/socketConfig');

/**
 * Kuryer tayinlash
 * PATCH /api/orders/:id/assign-courier
 */
async function assignCourier(req, res) {
  try {
    const { id } = req.params;
    const { courierId } = req.body;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    
    // Kuryer ma'lumotlarini tekshirish
    const courier = await User.findOne({ _id: courierId, role: 'courier', isActive: true });
    if (!courier) {
      return res.status(400).json({ 
        success: false, 
        message: 'Haydovchi topilmadi yoki mavjud emas!' 
      });
    }
    
    // Buyurtma ma'lumotlarini tekshirish
    const query = { _id: id };
    if (branchId) query.branch = branchId;
    
    const existingOrder = await Order.findOne(query).select('status deliveryInfo.courier orderId');
    if (!existingOrder) {
      return res.status(404).json({ 
        success: false, 
        message: 'Buyurtma topilmadi!' 
      });
    }
    
    // Buyurtma holatini tekshirish
    if (['delivered', 'completed', 'cancelled'].includes(existingOrder.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ushbu buyurtma yakunlangan yoki bekor qilingan.' 
      });
    }
    
    // Kuryer allaqachon tayinlanganligini tekshirish
    if (existingOrder.deliveryInfo?.courier) {
      if (String(existingOrder.deliveryInfo.courier) === String(courierId)) {
        console.log(`Courier ${courierId} already assigned to order ${existingOrder.orderId}`);
        return res.json({ 
          success: true, 
          message: 'Kuryer allaqachon tayinlangan.' 
        });
      } else {
        console.log(`Re-assigning courier for order ${existingOrder.orderId}`);
      }
    }
    
    // Kuryer tayinlash
    const update = { 
      'deliveryInfo.courier': courierId, 
      updatedAt: new Date() 
    };
    
    const order = await Order.findOneAndUpdate(query, update, { new: true })
      .populate('deliveryInfo.courier', 'firstName lastName phone courierInfo')
      .populate('user', 'firstName lastName phone telegramId')
      .populate('branch', 'address coordinates');
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Buyurtma topilmadi!' 
      });
    }
    
    // Status yangilash
    await updateOrderStatus(order, req.user._id, courier);
    
    // Mijozga xabar yuborish
    await notifyCustomer(order);
    
    const changed = existingOrder.deliveryInfo?.courier && 
      String(existingOrder.deliveryInfo.courier) !== String(courierId);
    
    res.json({ 
      success: true, 
      message: changed ? 'Kuryer o\'zgartirildi!' : 'Haydovchi tayinlandi!', 
      data: { order } 
    });
    
  } catch (error) {
    console.error('❌ Assign courier error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Haydovchi tayinlashda xatolik!' 
    });
  }
}

/**
 * Buyurtma status'ini yangilash
 */
async function updateOrderStatus(order, updatedBy, courier) {
  try {
    const OrderStatusService = require('../../../../services/orderStatusService');
    
    // Status'ni yangilash
    const targetStatus = ['ready', 'preparing'].includes(order.status) ? order.status : 'assigned';
    
    if (targetStatus === 'assigned') {
      await OrderStatusService.updateStatus(order._id, 'assigned', {
        message: `Kuryer tayinlandi: ${courier.firstName} ${courier.lastName}`,
        updatedBy
      });
    } else {
      // Socket.IO orqali bildirishnoma
      SocketManager.emitOrderUpdate(order._id.toString(), {
        type: 'courier-assigned',
        orderId: order.orderId,
        courierName: `${courier.firstName} ${courier.lastName}`,
        courierPhone: courier.phone,
        message: `Kuryer tayinlandi: ${courier.firstName} ${courier.lastName}`,
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error('❌ Update order status error:', error);
  }
}

/**
 * Mijozga xabar yuborish
 */
async function notifyCustomer(order) {
  try {
    if (!order.user?.telegramId || order.orderType !== 'delivery') {
      return;
    }
    
    // ETA hisoblash
    let etaText = '';
    try {
      if (order?.deliveryInfo?.location?.latitude && order?.deliveryInfo?.location?.longitude) {
        let origin = null;
        const branchIdForOrigin = order?.branch?._id || order?.branch;
        
        if (branchIdForOrigin) {
          const branch = await Branch.findById(branchIdForOrigin);
          if (branch?.address?.coordinates?.latitude && branch?.address?.coordinates?.longitude) {
            origin = { 
              lat: branch.address.coordinates.latitude, 
              lon: branch.address.coordinates.longitude 
            };
          }
        }
        
        if (!origin && process.env.DEFAULT_RESTAURANT_LAT && process.env.DEFAULT_RESTAURANT_LON) {
          origin = { 
            lat: parseFloat(process.env.DEFAULT_RESTAURANT_LAT), 
            lon: parseFloat(process.env.DEFAULT_RESTAURANT_LON) 
          };
        }
        
        const calc = await DeliveryService.calculateDeliveryTime({ 
          latitude: order.deliveryInfo.location.latitude, 
          longitude: order.deliveryInfo.location.longitude 
        }, order.items, origin);
        
        if (calc?.totalTime) {
          etaText = `${calc.totalTime} daqiqa`;
        }
      }
    } catch (error) {
      console.error('❌ ETA calculation error:', error);
    }
    
    // Default ETA
    if (!etaText && order.deliveryMeta?.etaMinutes) {
      etaText = `${order.deliveryMeta.etaMinutes} daqiqa`;
    }
    if (!etaText) {
      etaText = 'taxminan 30-45 daqiqa';
    }
    
    // Xabar tayyorlash
    const courierName = `${order.deliveryInfo?.courier?.firstName || ''} ${order.deliveryInfo?.courier?.lastName || ''}`.trim();
    const courierPhone = order.deliveryInfo?.courier?.phone || '';
    const text = `🚚 Buyurtmangiz yetkazilmoqda\n\nKuryer: ${courierName || '—'}\nTelefon: ${courierPhone || '—'}\nETA: ${etaText}`;
    
    // Bot orqali xabar yuborish
    const SingletonManager = require('../../../../utils/SingletonManager');
    const bot = SingletonManager.getBotInstance();
    if (bot) {
      await bot.telegram.sendMessage(order.user.telegramId, text);
    }
    
  } catch (error) {
    console.error('❌ Customer notification error:', error);
  }
}

module.exports = {
  assignCourier
};