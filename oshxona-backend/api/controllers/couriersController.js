const { User, Order, DeliveryZone } = require('../../models');

async function list(req, res) {
  try {
    const { status } = req.query;
    const query = { role: 'courier' };
    if (status === 'online') query['courierInfo.isOnline'] = true;
    else if (status === 'offline') query['courierInfo.isOnline'] = false;
    else if (status === 'available') { query['courierInfo.isAvailable'] = true; query['courierInfo.isOnline'] = true; }
    const couriers = await User.find(query).select('firstName lastName phone courierInfo createdAt').sort({ 'courierInfo.isOnline': -1, 'courierInfo.rating': -1 });
    res.json({ success: true, data: { couriers } });
  } catch (e) { res.status(500).json({ success: false, message: 'Haydovchilarni olishda xatolik!' }); }
}

async function getOne(req, res) {
  try {
    const { id } = req.params;
    const courier = await User.findOne({ _id: id, role: 'courier' }).select('-password');
    if (!courier) return res.status(404).json({ success: false, message: 'Haydovchi topilmadi!' });
    const recentDeliveries = await Order.find({ courier: id, status: 'delivered' }).populate('user', 'firstName lastName').sort({ deliveredAt: -1 }).limit(10);
    res.json({ success: true, data: { courier, recentDeliveries } });
  } catch (e) { res.status(500).json({ success: false, message: 'Haydovchi ma\'lumotlarini olishda xatolik!' }); }
}

async function availableForOrder(req, res) {
  try {
    const availableCouriers = await User.find({ role: 'courier', 'courierInfo.isOnline': true, 'courierInfo.isAvailable': true, isActive: true }).select('firstName lastName phone courierInfo.vehicleType courierInfo.rating courierInfo.currentLocation').sort({ 'courierInfo.rating': -1 });
    if (!availableCouriers || availableCouriers.length === 0) {
      const allCouriers = await User.find({ role: 'courier', isActive: true }).select('firstName lastName phone courierInfo').sort({ 'courierInfo.isOnline': -1, 'courierInfo.rating': -1, createdAt: -1 });
      return res.json({ success: true, data: { couriers: allCouriers, fallback: true } });
    }
    res.json({ success: true, data: { couriers: availableCouriers, fallback: false } });
  } catch (e) { res.status(500).json({ success: false, message: 'Mavjud haydovchilarni olishda xatolik!' }); }
}

async function updateStatus(req, res) {
  try {
    const { id } = req.params; const { isActive } = req.body;
    const courier = await User.findOneAndUpdate({ _id: id, role: 'courier' }, { isActive }, { new: true }).select('-password');
    if (!courier) return res.status(404).json({ success: false, message: 'Haydovchi topilmadi!' });
    res.json({ success: true, message: `Haydovchi ${isActive ? 'faollashtirildi' : 'faolsizlashtirildi'}!`, data: { courier } });
  } catch (e) { res.status(500).json({ success: false, message: 'Haydovchi holatini yangilashda xatolik!' }); }
}

// 🔧 YANGI: Kuryer lokatsiyalarini real-time'da yangilash
async function refreshLocations(req, res) {
  try {
    const { branchId } = req.user;
    
    // Faqat admin'ning filialidagi kuryerlarni olish
    const query = { role: 'courier' };
    if (branchId && branchId !== 'default') {
      query.branch = branchId;
    }
    
    const couriers = await User.find(query).select('firstName lastName phone branch courierInfo');
    
    // Socket orqali real-time yangilash
    try {
      const SocketManager = require('../../config/socketConfig');
      for (const courier of couriers) {
        const loc = courier.courierInfo?.currentLocation;
        if (loc && loc.latitude && loc.longitude) {
          SocketManager.emitCourierLocationToBranch(courier.branch || branchId, {
            courierId: courier._id,
            firstName: courier.firstName,
            lastName: courier.lastName,
            phone: courier.phone,
            location: { latitude: loc.latitude, longitude: loc.longitude },
            isOnline: Boolean(courier.courierInfo?.isOnline),
            isAvailable: Boolean(courier.courierInfo?.isAvailable),
            updatedAt: loc.updatedAt || new Date()
          });
        }
      }
    } catch (socketError) {
      console.error('Socket error during refresh:', socketError);
    }
    
    res.json({ 
      success: true, 
      message: `${couriers.length} ta kuryer lokatsiyasi yangilandi`,
      data: { 
        totalCouriers: couriers.length,
        updatedAt: new Date()
      }
    });
  } catch (e) { 
    res.status(500).json({ success: false, message: 'Kuryer lokatsiyalarini yangilashda xatolik!' }); 
  }
}

// Kuryer lokatsiyasini yangilash (kuryer bot/app dan)
async function updateLocation(req, res) {
  try {
    const { courierId, latitude, longitude, isOnline = true } = req.body;
    
    if (!courierId || latitude == null || longitude == null) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kuryer ID, latitude va longitude majburiy!' 
      });
    }
    
    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ 
        success: false, 
        message: 'Noto\'g\'ri koordinatalar!' 
      });
    }
    
    const courier = await User.findOne({ _id: courierId, role: 'courier' });
    if (!courier) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kuryer topilmadi!' 
      });
    }
    
    // Update courier location and status
    courier.courierInfo.currentLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      updatedAt: new Date()
    };
    courier.courierInfo.isOnline = isOnline;
    
    await courier.save();
    
    // Real-time tracking service orqali yangilash
    const orderTracker = require('../../services/orderTrackingService');
    await orderTracker.updateCourierLocation(courierId, latitude, longitude);
    
    res.json({ 
      success: true, 
      message: 'Lokatsiya muvaffaqiyatli yangilandi',
      data: { 
        courierId,
        location: { latitude, longitude },
        updatedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Courier location update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lokatsiyani yangilashda xatolik!' 
    });
  }
}

module.exports = { list, getOne, availableForOrder, updateStatus, refreshLocations, updateLocation };

// =============== Advanced analytics/endpoints ===============
function haversineKm(a, b) {
  if (!a || !b || a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null;
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function heatmap(req, res) {
  try {
    const couriers = await User.find({ role: 'courier', 'courierInfo.currentLocation.latitude': { $ne: null } }).select('courierInfo.currentLocation courierInfo.isOnline courierInfo.isAvailable');
    const points = couriers.map(c => ({
      lat: c.courierInfo?.currentLocation?.latitude,
      lon: c.courierInfo?.currentLocation?.longitude,
      weight: (c.courierInfo?.isOnline ? 1 : 0) + (c.courierInfo?.isAvailable ? 1 : 0)
    })).filter(p => p.lat != null && p.lon != null);
    res.json({ success: true, data: { points } });
  } catch (e) { res.status(500).json({ success: false, message: 'Heatmap ma\'lumotlarida xatolik' }); }
}

async function zones(req, res) {
  try {
    const zones = await DeliveryZone.find({ isActive: true }).select('name branch polygon');
    res.json({ success: true, data: { zones } });
  } catch (e) { res.status(500).json({ success: false, message: 'Zonalarni olishda xatolik' }); }
}

async function suggestForOrder(req, res) {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).select('deliveryInfo location items branch total orderType');
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
    const target = order.deliveryInfo?.location;
    const candidates = await User.find({ role: 'courier', isActive: true, 'courierInfo.isOnline': true }).select('firstName lastName phone courierInfo');
    const enriched = candidates.map(c => {
      const loc = c.courierInfo?.currentLocation;
      const distanceKm = loc && target ? haversineKm({ latitude: loc.latitude, longitude: loc.longitude }, { latitude: target.latitude, longitude: target.longitude }) : null;
      const rating = c.courierInfo?.rating || 0;
      const isAvailable = !!c.courierInfo?.isAvailable;
      const load = c.courierInfo?.activeDeliveries || 0;
      // Simple scoring: closer (lower km), higher rating, available, lower load
      const score = (distanceKm != null ? -distanceKm : -5) + rating * 1.5 + (isAvailable ? 1 : -1) - load * 0.7;
      return { id: String(c._id), name: `${c.firstName||''} ${c.lastName||''}`.trim(), phone: c.phone, distanceKm: distanceKm != null ? Math.round(distanceKm*10)/10 : null, rating, isAvailable, load, score };
    }).sort((a,b) => b.score - a.score).slice(0, 10);
    res.json({ success: true, data: { suggestions: enriched } });
  } catch (e) { res.status(500).json({ success: false, message: 'Kuryer taklifini hisoblashda xatolik' }); }
}

module.exports.heatmap = heatmap;
module.exports.zones = zones;
module.exports.suggestForOrder = suggestForOrder;


