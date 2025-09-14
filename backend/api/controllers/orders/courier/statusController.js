/**
 * Courier Status Controller
 * Kuryer buyurtma holatini yangilash operatsiyalari
 */

const { Order, User, Branch } = require('../../../../models');
const SocketManager = require('../../../../config/socketConfig');
const { calculateDistance } = require('./locationController');

/**
 * Kuryer buyurtmani qabul qiladi
 * PATCH /api/orders/:orderId/courier-accept
 */
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
    } catch (error) {
      console.error('❌ Socket emit error:', error);
    }
    
    res.json({ 
      success: true, 
      message: 'Buyurtma qabul qilindi!' 
    });
    
  } catch (error) {
    console.error('❌ Courier accept order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Buyurtmani qabul qilishda xatolik!' 
    });
  }
}

/**
 * Kuryer buyurtmani olib ketdi
 * PATCH /api/orders/:orderId/courier-picked-up
 */
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
    
    // Restoranga yaqinlikni tekshirish
    const distanceCheck = await checkDistanceToRestaurant(order, latitude, longitude);
    if (distanceCheck.warning) {
      return res.json(distanceCheck);
    }
    
    // Status yangilash
    await updateOrderStatus(order._id, 'on_delivery', {
      message: 'Kuryer buyurtmani olib ketdi',
      updatedBy: req.user.id,
      pickedUpAt: new Date(),
      courierLocation: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: new Date()
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Buyurtma olib ketildi!' 
    });
    
  } catch (error) {
    console.error('❌ Courier picked up order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Buyurtmani olib ketishda xatolik!' 
    });
  }
}

/**
 * Kuryer yo'lda
 * PATCH /api/orders/:orderId/courier-on-way
 */
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
    
    if (order.status !== 'on_delivery') {
      return res.status(400).json({ 
        success: false, 
        message: 'Buyurtma hali yo\'lda emas!' 
      });
    }
    
    // Kuryer lokatsiyasini yangilash
    order.courierFlow = order.courierFlow || {};
    order.courierFlow.currentLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date()
    };
    
    await order.save();
    
    // Real-time yangilash
    SocketManager.emitOrderStatusUpdateToBranch(order.branch, {
      orderId: order._id,
      status: 'on_delivery',
      courierLocation: order.courierFlow.currentLocation,
      updatedAt: new Date()
    });
    
    res.json({ 
      success: true, 
      message: 'Lokatsiya yangilandi!' 
    });
    
  } catch (error) {
    console.error('❌ Courier on way error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lokatsiya yangilashda xatolik!' 
    });
  }
}

/**
 * Kuryer yetkazdi
 * PATCH /api/orders/:orderId/courier-delivered
 */
async function courierDeliveredOrder(req, res) {
  try {
    const { orderId } = req.params;
    const { latitude, longitude, deliveryPhoto } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Buyurtma topilmadi!' 
      });
    }
    
    if (order.status !== 'on_delivery') {
      return res.status(400).json({ 
        success: false, 
        message: 'Buyurtma hali yetkazilmoqda!' 
      });
    }
    
    // Mijozga yaqinlikni tekshirish
    const distanceCheck = await checkDistanceToCustomer(order, latitude, longitude);
    if (distanceCheck.warning) {
      return res.json(distanceCheck);
    }
    
    // Yetkazib berish ma'lumotlarini saqlash
    order.deliveryInfo.deliveredAt = new Date();
    order.deliveryInfo.deliveryLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date()
    };
    
    if (deliveryPhoto) {
      order.deliveryInfo.deliveryPhoto = deliveryPhoto;
    }
    
    await order.save();
    
    // Status yangilash
    await updateOrderStatus(order._id, 'delivered', {
      message: 'Buyurtma yetkazildi',
      updatedBy: req.user.id,
      deliveredAt: new Date(),
      deliveryLocation: order.deliveryInfo.deliveryLocation
    });
    
    res.json({ 
      success: true, 
      message: 'Buyurtma muvaffaqiyatli yetkazildi!' 
    });
    
  } catch (error) {
    console.error('❌ Courier delivered order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Buyurtmani yetkazishda xatolik!' 
    });
  }
}

/**
 * Kuryer bekor qildi
 * PATCH /api/orders/:orderId/courier-cancelled
 */
async function courierCancelledOrder(req, res) {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Buyurtma topilmadi!' 
      });
    }
    
    if (['delivered', 'completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Buyurtma allaqachon yakunlangan!' 
      });
    }
    
    // Status yangilash
    await updateOrderStatus(order._id, 'cancelled', {
      message: 'Kuryer bekor qildi: ' + (reason || 'Sabab ko\'rsatilmagan'),
      updatedBy: req.user.id,
      cancelledAt: new Date(),
      cancelledBy: 'courier',
      cancellationReason: reason
    });
    
    res.json({ 
      success: true, 
      message: 'Buyurtma bekor qilindi!' 
    });
    
  } catch (error) {
    console.error('❌ Courier cancelled order error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Buyurtmani bekor qilishda xatolik!' 
    });
  }
}

/**
 * Restoranga masofani tekshirish
 */
async function checkDistanceToRestaurant(order, latitude, longitude) {
  try {
    const branch = await Branch.findById(order.branch);
    if (branch?.address?.coordinates?.latitude && branch?.address?.coordinates?.longitude) {
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        branch.address.coordinates.latitude,
        branch.address.coordinates.longitude
      );
      
      // 200 metrdan uzoq bo'lsa ogohlantirish
      if (distance > 0.2) {
        return {
          success: false,
          warning: true,
          message: `❌ Restoranga juda uzoqdasiz! Sizdan ${(distance * 1000).toFixed(0)} metr uzoqda.`,
          distance,
          requiredDistance: 0.2
        };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Check distance to restaurant error:', error);
    return { success: true }; // Xatolik bo'lsa ham davom etish
  }
}

/**
 * Mijozga masofani tekshirish
 */
async function checkDistanceToCustomer(order, latitude, longitude) {
  try {
    if (order.deliveryInfo?.location?.latitude && order.deliveryInfo?.location?.longitude) {
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        order.deliveryInfo.location.latitude,
        order.deliveryInfo.location.longitude
      );
      
      // 100 metrdan uzoq bo'lsa ogohlantirish
      if (distance > 0.1) {
        return {
          success: false,
          warning: true,
          message: `❌ Mijozga juda uzoqdasiz! Sizdan ${(distance * 1000).toFixed(0)} metr uzoqda.`,
          distance,
          requiredDistance: 0.1
        };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Check distance to customer error:', error);
    return { success: true };
  }
}

/**
 * Buyurtma status'ini yangilash
 */
async function updateOrderStatus(orderId, status, details) {
  try {
    const OrderStatusService = require('../../../../services/orderStatusService');
    await OrderStatusService.updateStatus(orderId, status, details);
  } catch (error) {
    console.error('❌ Update order status error:', error);
  }
}

module.exports = {
  courierAcceptOrder,
  courierPickedUpOrder,
  courierOnWay,
  courierDeliveredOrder,
  courierCancelledOrder
};