const { Order, User, Branch } = require('../../../models');
const DeliveryService = require('../../../services/deliveryService');
const SocketManager = require('../../../config/socketConfig');

/**
 * Orders Courier Controller
 * Kuryer operatsiyalari boshqaruvi
 */

/**
 * Masofa hisoblash funksiyasi
 * @param {number} lat1 - 1-koordinata latitude
 * @param {number} lon1 - 1-koordinata longitude
 * @param {number} lat2 - 2-koordinata latitude
 * @param {number} lon2 - 2-koordinata longitude
 * @returns {number} - masofa (km)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Yer radiusi (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

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
    const OrderStatusService = require('../../../services/orderStatusService');
    
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
        
        const { bot } = require('../../../index');
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

// Kuryer buyurtmani olib ketdi
async function courierPickedUpOrder(req, res) {
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
    
    if (order.status !== 'ready') {
      return res.status(400).json({ 
        success: false, 
        message: 'Buyurtma hali tayyor emas!' 
      });
    }
    
    // 1️⃣ RESTORANGA YAQINLIKNI TEKSHIRISH
    const branch = await Branch.findById(order.branch);
    if (branch?.address?.coordinates?.latitude && branch?.address?.coordinates?.longitude) {
      const distanceToRestaurant = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        branch.address.coordinates.latitude,
        branch.address.coordinates.longitude
      );
      
      // 200 metrdan uzoq bo'lsa ogohlantirish
      if (distanceToRestaurant > 0.2) { // 0.2 km = 200 metr
        return res.json({
          success: false,
          warning: true,
          message: `❌ Restoranga juda uzoqdasiz! Sizdan ${(distanceToRestaurant * 1000).toFixed(0)} metr uzoqda. Restoranga yaqinroq boring va qaytadan urinib ko'ring.`,
          distance: distanceToRestaurant,
          requiredDistance: 0.2
        });
      }
    }
    
    // Kuryer oqimini yangilash
    order.courierFlow = order.courierFlow || {};
    order.courierFlow.pickedUpAt = new Date();
    order.courierFlow.pickedUpLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };
    order.courierFlow.currentLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date()
    };
    
    // Status yangilash
    order.status = 'picked_up';
    order.statusHistory.push({
      status: 'picked_up',
      timestamp: new Date(),
      note: 'Kuryer buyurtmani olib ketdi',
      updatedBy: 'courier'
    });
    
    await order.save();
    
    // Real-time yangilash
    try {
      SocketManager.emitOrderStatusUpdateToBranch(order.branch, {
        orderId: order._id,
        status: 'picked_up',
        courierPickedUp: true,
        courierLocation: order.courierFlow.pickedUpLocation,
        updatedAt: new Date()
      });
    } catch (e) {
      console.error('Socket emit error:', e);
    }
    
    res.json({ 
      success: true, 
      message: '✅ Buyurtma muvaffaqiyatli olib ketildi!' 
    });
  } catch (error) {
    console.error('Courier picked up order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Buyurtmani olib ketishda xatolik!' 
    });
  }
}

// Kuryer yo'lda
async function courierOnWay(req, res) {
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
    
    if (!['picked_up', 'assigned'].includes(order.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Buyurtma holati noto\'g\'ri!' 
      });
    }
    
    // Kuryer oqimini yangilash
    order.courierFlow = order.courierFlow || {};
    order.courierFlow.onWayAt = new Date();
    order.courierFlow.currentLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date()
    };
    
    // Status yangilash
    if (order.status === 'assigned') {
      order.status = 'on_delivery';
      order.statusHistory.push({
        status: 'on_delivery',
        timestamp: new Date(),
        note: 'Kuryer yo\'lda',
        updatedBy: 'courier'
      });
    }
    
    await order.save();
    
    // Real-time yangilash
    try {
      SocketManager.emitOrderStatusUpdateToBranch(order.branch, {
        orderId: order._id,
        status: order.status,
        courierOnWay: true,
        courierLocation: order.courierFlow.currentLocation,
        updatedAt: new Date()
      });
    } catch (e) {
      console.error('Socket emit error:', e);
    }
    
    res.json({ 
      success: true, 
      message: 'Kuryer yo\'lda!' 
    });
  } catch (error) {
    console.error('Courier on way error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Kuryer holatini yangilashda xatolik!' 
    });
  }
}

// Kuryer yetkazdi
async function courierDeliveredOrder(req, res) {
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
    
    if (!['picked_up', 'on_delivery'].includes(order.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Buyurtma holati noto\'g\'ri!' 
      });
    }
    
    // 2️⃣ MIJOZGA YAQINLIKNI TEKSHIRISH
    if (order.deliveryInfo?.location?.latitude && order.deliveryInfo?.location?.longitude) {
      const distanceToCustomer = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        order.deliveryInfo.location.latitude,
        order.deliveryInfo.location.longitude
      );
      
      // 100 metrdan uzoq bo'lsa ogohlantirish
      if (distanceToCustomer > 0.1) { // 0.1 km = 100 metr
        return res.json({
          success: false,
          warning: true,
          message: `❌ Mijozga juda uzoqdasiz! Sizdan ${(distanceToCustomer * 1000).toFixed(0)} metr uzoqda. Mijozga yaqinroq boring va qaytadan urinib ko'ring.`,
          distance: distanceToCustomer,
          requiredDistance: 0.1
        });
      }
    }
    
    // Kuryer oqimini yangilash
    order.courierFlow = order.courierFlow || {};
    order.courierFlow.deliveredAt = new Date();
    order.courierFlow.deliveredLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };
    order.courierFlow.currentLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date()
    };
    
    // Status yangilash
    order.status = 'delivered';
    order.statusHistory.push({
      status: 'delivered',
      timestamp: new Date(),
      note: 'Kuryer yetkazdi',
      updatedBy: 'courier'
    });
    
    await order.save();
    
    // Real-time yangilash
    try {
      SocketManager.emitOrderStatusUpdateToBranch(order.branch, {
        orderId: order._id,
        status: 'delivered',
        courierDelivered: true,
        courierLocation: order.courierFlow.deliveredLocation,
        updatedAt: new Date()
      });
    } catch (e) {
      console.error('Socket emit error:', e);
    }
    
    res.json({ 
      success: true, 
      message: '✅ Buyurtma muvaffaqiyatli yetkazildi!' 
    });
  } catch (error) {
    console.error('Courier delivered order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Buyurtmani yetkazishda xatolik!' 
    });
  }
}

// Kuryer bekor qildi
async function courierCancelledOrder(req, res) {
  try {
    const { orderId } = req.params;
    const { latitude, longitude, reason } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Buyurtma topilmadi!' 
      });
    }
    
    if (!['assigned', 'picked_up', 'on_delivery'].includes(order.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Buyurtma holati noto\'g\'ri!' 
      });
    }
    
    // Kuryer oqimini yangilash
    order.courierFlow = order.courierFlow || {};
    order.courierFlow.cancelledAt = new Date();
    order.courierFlow.cancelledLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };
    order.courierFlow.currentLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date()
    };
    
    // Status yangilash
    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: `Kuryer bekor qildi: ${reason || 'Sabab ko\'rsatilmagan'}`,
      updatedBy: 'courier'
    });
    
    // Kuryerni olib tashlash
    order.deliveryInfo.courier = null;
    
    await order.save();
    
    // Real-time yangilash
    try {
      SocketManager.emitOrderStatusUpdateToBranch(order.branch, {
        orderId: order._id,
        status: 'cancelled',
        courierCancelled: true,
        courierLocation: order.courierFlow.cancelledLocation,
        updatedAt: new Date()
      });
    } catch (e) {
      console.error('Socket emit error:', e);
    }
    
    res.json({ 
      success: true, 
      message: 'Buyurtma bekor qilindi!' 
    });
  } catch (error) {
    console.error('Courier cancelled order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Buyurtmani bekor qilishda xatolik!' 
    });
  }
}

// Kuryer lokatsiyasini yangilash
async function updateCourierLocation(req, res) {
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
    
    if (!order.deliveryInfo?.courier) {
      return res.status(400).json({ 
        success: false, 
        message: 'Buyurtma kuryerga tayinlanmagan!' 
      });
    }
    
    // Lokatsiyani yangilash
    order.courierFlow = order.courierFlow || {};
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
        courierLocation: order.courierFlow.currentLocation,
        updatedAt: new Date()
      });
    } catch (e) {
      console.error('Socket emit error:', e);
    }
    
    res.json({ 
      success: true, 
      message: 'Lokatsiya yangilandi!' 
    });
  } catch (error) {
    console.error('Update courier location error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lokatsiyani yangilashda xatolik!' 
    });
  }
}

// Masofa tekshirish va ogohlantirish
async function checkCourierDistance(req, res) {
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
    
    if (!order.deliveryInfo?.courier) {
      return res.status(400).json({ 
        success: false, 
        message: 'Buyurtma kuryerga tayinlanmagan!' 
      });
    }
    
    // Masofani hisoblash
    const distance = calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      order.deliveryInfo.location.latitude,
      order.deliveryInfo.location.longitude
    );
    
    // 100 metrdan uzoq bo'lsa ogohlantirish
    if (distance > 0.1) { // 0.1 km = 100 metr
      return res.json({
        success: true,
        warning: true,
        message: `Kuryer sizdan ${(distance * 1000).toFixed(0)} metr uzoqda! Yaqinroq boring.`,
        distance: distance
      });
    }
    
    res.json({
      success: true,
      warning: false,
      message: 'Kuryer yaqin atrofda!',
      distance: distance
    });
  } catch (error) {
    console.error('Check courier distance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Masofani tekshirishda xatolik!' 
    });
  }
}

module.exports = {
  calculateDistance,
  assignCourier,
  courierAcceptOrder,
  courierPickedUpOrder,
  courierOnWay,
  courierDeliveredOrder,
  courierCancelledOrder,
  updateCourierLocation,
  checkCourierDistance
};