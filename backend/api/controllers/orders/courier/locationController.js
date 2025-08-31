const { Order } = require('../../../../models');
const SocketManager = require('../../../../config/socketConfig');

/**
 * Courier Location Controller
 * Kuryer joylashuv operatsiyalari
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
  updateCourierLocation,
  checkCourierDistance
};