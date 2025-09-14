/**
 * Courier Location Controller
 * Kuryer lokatsiya va masofa hisoblash operatsiyalari
 */

const { User, Order } = require('../../../../models');
const SocketManager = require('../../../../config/socketConfig');

/**
 * Masofa hisoblash funksiyasi (Haversine formula)
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

/**
 * Kuryer lokatsiyasini yangilash
 * PATCH /api/orders/courier/location
 */
async function updateCourierLocation(req, res) {
  try {
    const { latitude, longitude } = req.body;
    const courierId = req.user.id;

    // Validation
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude va longitude kiritish shart!'
      });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri koordinata qiymatlari!'
      });
    }

    // Kuryer ma'lumotlarini yangilash
    const courier = await User.findByIdAndUpdate(
      courierId,
      {
        'courierInfo.currentLocation': {
          latitude,
          longitude,
          updatedAt: new Date()
        }
      },
      { new: true, select: 'firstName lastName phone courierInfo telegramId' }
    );

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: 'Kuryer topilmadi!'
      });
    }

    // Socket.IO orqali real-time yangilanish
    if (courier.courierInfo?.branch) {
      SocketManager.emitCourierLocationToBranch(courier.courierInfo.branch, {
        courierId: courier._id,
        firstName: courier.firstName,
        lastName: courier.lastName,
        phone: courier.phone,
        location: { latitude, longitude },
        isOnline: courier.courierInfo.isOnline,
        isAvailable: courier.courierInfo.isAvailable,
        updatedAt: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Lokatsiya yangilandi',
      data: {
        location: { latitude, longitude },
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Update courier location error:', error);
    res.status(500).json({
      success: false,
      message: 'Lokatsiya yangilashda xatolik!'
    });
  }
}

/**
 * Kuryer va buyurtma orasidagi masofani tekshirish
 * GET /api/orders/:id/check-distance
 */
async function checkCourierDistance(req, res) {
  try {
    const { id } = req.params;
    const courierId = req.user.id;

    // Buyurtma ma'lumotlarini olish
    const order = await Order.findById(id)
      .populate('user', 'firstName lastName phone')
      .select('deliveryInfo.orderLocation deliveryInfo.restaurantLocation status');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Buyurtma topilmadi!'
      });
    }

    // Kuryer ma'lumotlarini olish
    const courier = await User.findById(courierId)
      .select('courierInfo.currentLocation firstName lastName');

    if (!courier || !courier.courierInfo?.currentLocation) {
      return res.status(400).json({
        success: false,
        message: 'Kuryer lokatsiyasi topilmadi!'
      });
    }

    const courierLoc = courier.courierInfo.currentLocation;
    const orderLoc = order.deliveryInfo.orderLocation;
    const restaurantLoc = order.deliveryInfo.restaurantLocation;

    // Masofalarni hisoblash
    const distanceToRestaurant = restaurantLoc ? 
      calculateDistance(courierLoc.latitude, courierLoc.longitude, restaurantLoc.latitude, restaurantLoc.longitude) : null;
    
    const distanceToCustomer = orderLoc ? 
      calculateDistance(courierLoc.latitude, courierLoc.longitude, orderLoc.latitude, orderLoc.longitude) : null;

    res.json({
      success: true,
      data: {
        courier: {
          name: `${courier.firstName} ${courier.lastName}`,
          location: courierLoc
        },
        distances: {
          toRestaurant: distanceToRestaurant ? Math.round(distanceToRestaurant * 100) / 100 : null,
          toCustomer: distanceToCustomer ? Math.round(distanceToCustomer * 100) / 100 : null
        },
        order: {
          status: order.status,
          customer: order.user
        }
      }
    });

  } catch (error) {
    console.error('❌ Check courier distance error:', error);
    res.status(500).json({
      success: false,
      message: 'Masofa tekshirishda xatolik!'
    });
  }
}

module.exports = {
  calculateDistance,
  updateCourierLocation,
  checkCourierDistance
};