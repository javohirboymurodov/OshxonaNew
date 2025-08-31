const { Order, Branch } = require('../../../../models');
const SocketManager = require('../../../../config/socketConfig');

/**
 * Courier Delivery Controller
 * Kuryer yetkazish operatsiyalari
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

module.exports = {
  calculateDistance,
  courierPickedUpOrder,
  courierOnWay,
  courierDeliveredOrder,
  courierCancelledOrder
};