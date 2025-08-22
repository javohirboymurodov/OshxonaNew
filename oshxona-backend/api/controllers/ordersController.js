const { Order, User, Branch } = require('../../models');
const DeliveryService = require('../../services/deliveryService');
const SocketManager = require('../../config/socketConfig');

function getStatusMessage(status) {
  const messages = {
    pending: 'Buyurtmangiz kutilmoqda',
    confirmed: 'Buyurtmangiz tasdiqlandi',
    preparing: 'Buyurtmangiz tayyorlanmoqda',
    ready: 'Buyurtmangiz tayyor!',
    on_delivery: 'Buyurtmangiz yetkazilmoqda',
    delivered: 'Buyurtmangiz yetkazildi',
    picked_up: 'Buyurtmangiz olib ketildi',
    completed: 'Buyurtmangiz yakunlandi',
    cancelled: 'Buyurtmangiz bekor qilindi'
  };
  return messages[status] || 'Status yangilandi';
}

function getStatusEmoji(status) {
  const emojis = {
    pending: '⏳',
    confirmed: '✅',
    preparing: '👨‍🍳',
    ready: '🍽️',
    on_delivery: '🚚',
    delivered: '✅',
    picked_up: '📦',
    completed: '🎉',
    cancelled: '❌'
  };
  return emojis[status] || '📋';
}

function getEstimatedTime(status, orderType) {
  if (status === 'confirmed') return orderType === 'delivery' ? '30-45 daqiqa' : '15-25 daqiqa';
  if (status === 'preparing') return orderType === 'delivery' ? '20-30 daqiqa' : '10-15 daqiqa';
  if (status === 'ready' && orderType !== 'delivery') return 'Olib ketishingiz mumkin';
  return null;
}

// GET /api/orders
async function listOrders(req, res) {
  try {
    const Helpers = require('../../utils/helpers');
    const { page, limit, skip } = Helpers.getPaginationParams(req.query);
    const { status, orderType, dateFrom, dateTo, search, courier, branch: branchFilter } = req.query;

    let query = {};
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    if (branchId) query.branch = branchId;
    if (req.user.role === 'superadmin' && branchFilter) query.branch = branchFilter;
    if (status) query.status = status;
    if (orderType) query.orderType = orderType;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    if (search && String(search).trim().length > 0) {
      const text = String(search).trim();
      const regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { orderId: { $regex: regex } },
        { orderNumber: { $regex: regex } },
        { 'customerInfo.name': { $regex: regex } },
        { 'customerInfo.phone': { $regex: regex } },
      ];
    }

    let orders = await Order.find(query)
      .populate('user', 'firstName lastName phone')
      .populate('deliveryInfo.courier', 'firstName lastName phone courierInfo')
      .populate('items.product', 'name price')
      .populate('branch', 'name title address')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    if (courier === 'assigned') query['deliveryInfo.courier'] = { $ne: null };
    else if (courier === 'unassigned') query['deliveryInfo.courier'] = { $in: [null, undefined] };

    const total = await Order.countDocuments(query);

    try {
      let origin = null;
      if (req.user.role !== 'superadmin' && req.user.branch) {
        const branch = await Branch.findById(req.user.branch);
        if (branch?.address?.coordinates?.latitude && branch?.address?.coordinates?.longitude) {
          origin = { lat: branch.address.coordinates.latitude, lon: branch.address.coordinates.longitude };
        }
      }
      if (!origin && process.env.DEFAULT_RESTAURANT_LAT && process.env.DEFAULT_RESTAURANT_LON) {
        origin = { lat: parseFloat(process.env.DEFAULT_RESTAURANT_LAT), lon: parseFloat(process.env.DEFAULT_RESTAURANT_LON) };
      }
      const enriched = [];
      for (const o of orders) {
        const obj = o.toObject();
        if (obj.orderType === 'delivery' && obj.deliveryInfo?.location?.latitude && obj.deliveryInfo?.location?.longitude) {
          const calc = await DeliveryService.calculateDeliveryTime({ latitude: obj.deliveryInfo.location.latitude, longitude: obj.deliveryInfo.location.longitude }, obj.items, origin);
          const fee = await DeliveryService.calculateDeliveryFee({ latitude: obj.deliveryInfo.location.latitude, longitude: obj.deliveryInfo.location.longitude }, obj.total ?? obj.totalAmount ?? 0);
          obj.deliveryMeta = {
            distanceKm: calc?.distance ?? null,
            etaMinutes: calc?.totalTime ?? null,
            preparationMinutes: calc?.preparationTime ?? null,
            deliveryMinutes: calc?.deliveryTime ?? null,
            deliveryFee: fee?.fee ?? null,
            isFreeDelivery: fee?.isFreeDelivery ?? false
          };
        }
        enriched.push(obj);
      }
      orders = enriched;
    } catch (enrichErr) {
      console.error('Order enrichment error:', enrichErr);
    }

    res.json({ success: true, data: { orders, pagination: Helpers.buildPagination(total, page, limit) } });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Buyurtmalarni olishda xatolik!' });
  }
}

// GET /api/orders/:id
async function getOrder(req, res) {
  try {
    const { id } = req.params;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    const query = { _id: id };
    if (branchId) query.branch = branchId;
    const orderDoc = await Order.findOne(query)
      .populate('user', 'firstName lastName phone address')
      .populate('deliveryInfo.courier', 'firstName lastName phone courierInfo')
      .populate('items.product', 'name price description')
      .populate('branch', 'name title address');
    if (!orderDoc) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi!' });
    let order = orderDoc.toObject();
    try {
      if (order.orderType === 'delivery' && order.deliveryInfo?.location?.latitude && order.deliveryInfo?.location?.longitude) {
        let origin = null;
        if (branchId) {
          const branch = await Branch.findById(branchId);
          if (branch?.address?.coordinates?.latitude && branch?.address?.coordinates?.longitude) {
            origin = { lat: branch.address.coordinates.latitude, lon: branch.address.coordinates.longitude };
          }
        }
        if (!origin && process.env.DEFAULT_RESTAURANT_LAT && process.env.DEFAULT_RESTAURANT_LON) {
          origin = { lat: parseFloat(process.env.DEFAULT_RESTAURANT_LAT), lon: parseFloat(process.env.DEFAULT_RESTAURANT_LON) };
        }
        const calc = await DeliveryService.calculateDeliveryTime({ latitude: order.deliveryInfo.location.latitude, longitude: order.deliveryInfo.location.longitude }, order.items, origin);
        const fee = await DeliveryService.calculateDeliveryFee({ latitude: order.deliveryInfo.location.latitude, longitude: order.deliveryInfo.location.longitude }, order.total ?? order.totalAmount ?? 0);
        order.deliveryMeta = {
          distanceKm: calc?.distance ?? null,
          etaMinutes: calc?.totalTime ?? null,
          preparationMinutes: calc?.preparationTime ?? null,
          deliveryMinutes: calc?.deliveryTime ?? null,
          deliveryFee: fee?.fee ?? null,
          isFreeDelivery: fee?.isFreeDelivery ?? false
        };
      }
    } catch (e) {}
    res.json({ success: true, data: { order } });
  } catch (error) {
    console.error('Get single order error:', error);
    res.status(500).json({ success: false, message: 'Buyurtma ma\'lumotlarini olishda xatolik!' });
  }
}

// GET /api/orders/stats
async function getStats(req, res) {
  try {
    const match = {};
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    if (branchId) match.branch = branchId;
    if (req.user.role === 'superadmin' && req.query.branch) match.branch = req.query.branch;
    const result = await Order.aggregate([
      { $match: match },
      { $group: {
        _id: null,
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        preparing: { $sum: { $cond: [{ $eq: ['$status', 'preparing'] }, 1, 0] } },
        ready: { $sum: { $cond: [{ $eq: ['$status', 'ready'] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'completed', 'picked_up', 'on_delivery']] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      } }
    ]);
    const stats = result[0] || { pending: 0, confirmed: 0, preparing: 0, ready: 0, delivered: 0, cancelled: 0 };
    res.json({ success: true, data: { stats } });
  } catch (error) {
    console.error('Orders stats error:', error);
    res.status(500).json({ success: false, message: 'Buyurtma statistikasini olishda xatolik!' });
  }
}

// PATCH /api/orders/:id/status
async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, message: customMessage } = req.body;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    const validStatuses = ['pending', 'confirmed', 'ready', 'assigned', 'on_delivery', 'delivered', 'picked_up', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Noto\'g\'ri status!' });
    const existing = await Order.findById(id).populate('user', 'firstName lastName phone telegramId');
    if (!existing) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi!' });
    if (branchId) {
      if (existing.branch && String(existing.branch) !== String(branchId)) return res.status(403).json({ success: false, message: 'Bu buyurtmani o\'zgartirish huquqi yo\'q' });
    }
    if (!existing.branch && branchId) existing.branch = branchId;
    existing.status = status;
    existing.updatedAt = new Date();
    existing.statusHistory = existing.statusHistory || [];
    
    // 🔧 FIX: Status history ga qo'shish
    const statusMessage = customMessage || getStatusMessage(status);
    existing.statusHistory.push({ 
      status, 
      message: statusMessage, 
      timestamp: new Date(), 
      updatedBy: req.user._id 
    });
    
    const order = await existing.save();
    // Socket events
    try {
      SocketManager.emitStatusUpdate(order.user._id, { orderId: order._id, orderNumber: order.orderId, status, message: statusMessage, updatedAt: new Date(), estimatedTime: getEstimatedTime(status, order.orderType) });
    } catch (e) {}
    res.json({ success: true, message: 'Buyurtma holati yangilandi!', data: { order } });
    try {
      if (status === 'picked_up' && order.orderType === 'pickup') {
        const idForTimer = String(order._id);
        setTimeout(async () => {
          try {
            const fresh = await Order.findById(idForTimer);
            if (fresh && fresh.status === 'picked_up') {
              fresh.status = 'completed';
              fresh.updatedAt = new Date();
              await fresh.save();
              SocketManager.emitOrderUpdate(idForTimer, { status: 'completed', branchId: String(fresh.branch || '') });
            }
          } catch {}
        }, 10000);
      }
    } catch {}
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Buyurtma holatini yangilashda xatolik!' });
  }
}

// PATCH /api/orders/:id/assign-courier
async function assignCourier(req, res) {
  try {
    const { id } = req.params;
    const { courierId } = req.body;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    const courier = await User.findOne({ _id: courierId, role: 'courier', isActive: true });
    if (!courier) return res.status(400).json({ success: false, message: 'Haydovchi topilmadi yoki mavjud emas!' });
    const query = { _id: id };
    if (branchId) query.branch = branchId;
    const existingOrder = await Order.findOne(query).select('status deliveryInfo.courier orderId');
    if (!existingOrder) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi!' });
    if (existingOrder.status === 'delivered' || existingOrder.status === 'completed' || existingOrder.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Ushbu buyurtma yakunlangan yoki bekor qilingan.' });
    }
    if (existingOrder.deliveryInfo?.courier && String(existingOrder.deliveryInfo.courier) === String(courierId)) {
      return res.status(409).json({ success: false, message: 'Ushbu kuryer allaqachon tayinlangan.' });
    }
    const update = { 'deliveryInfo.courier': courierId, updatedAt: new Date() };
    // 🔧 FIX: Tayinlanganda holat: assigned (kuryer tayinlandi, lekin hali qabul qilinmagan)
    update.status = 'assigned';
    
    // 🔧 FIX: Status history ga qo'shish
    const order = await Order.findOneAndUpdate(
      query, 
      { 
        ...update,
        $push: { 
          statusHistory: { 
            status: 'assigned', 
            message: `Kuryer tayinlandi: ${courier.firstName} ${courier.lastName}`, 
            timestamp: new Date(), 
            updatedBy: req.user._id 
          } 
        }
      }, 
      { new: true }
    )
      .populate('deliveryInfo.courier', 'firstName lastName phone courierInfo')
      .populate('user', 'firstName lastName phone telegramId')
      .populate('branch', 'address coordinates');
    if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi!' });
    
    // 🔧 FIX: Real-time yangilash admin panelga
    try {
      SocketManager.emitOrderStatusUpdateToBranch(branchId || 'global', {
        orderId: order._id,
        status: 'assigned',
        courierId: courier._id,
        courierName: `${courier.firstName} ${courier.lastName}`,
        updatedAt: new Date()
      });
    } catch (e) {
      console.error('Socket emit error:', e);
    }
    
    try {
      if (courier.telegramId) {
        const { bot } = require('../../index');
        const geoService = require('../../services/geoService');
        const acceptData = `courier_accept_${order._id}`;
        const onwayData = `courier_on_way_${order._id}`;
        let locationLines = '';
        try {
          const loc = order?.deliveryInfo?.location;
          if (loc?.latitude && loc?.longitude) {
            const yandex = geoService.generateMapLink(loc.latitude, loc.longitude);
            locationLines = `\n📍 Manzil (Yandex): ${yandex}`;
          }
        } catch {}
        await bot.telegram.sendMessage(
          courier.telegramId,
          `🚚 Yangi buyurtma tayinlandi\n\n#${order.orderId} – ${order.total?.toLocaleString?.() || 0} so'm${locationLines}`,
          { reply_markup: { inline_keyboard: [[{ text: '✅ Qabul qilaman', callback_data: acceptData }],[{ text: "🚗 Yo'ldaman", callback_data: onwayData }],[{ text: '📦 Yetkazdim', callback_data: `courier_delivered_${order._id}` }]] } }
        );
      }
    } catch {}
    
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
            const calc = await DeliveryService.calculateDeliveryTime({ latitude: order.deliveryInfo.location.latitude, longitude: order.deliveryInfo.location.longitude }, order.items, origin || undefined);
            if (calc?.totalTime) etaText = `${calc.totalTime} daqiqa`;
          }
        } catch {}
        if (!etaText && order.deliveryMeta?.etaMinutes) etaText = `${order.deliveryMeta?.etaMinutes} daqiqa`;
        if (!etaText) etaText = 'taxminan 30-45 daqiqa';
        const courierName = `${order.deliveryInfo?.courier?.firstName || ''} ${order.deliveryInfo?.courier?.lastName || ''}`.trim();
        const courierPhone = order.deliveryInfo?.courier?.phone || '';
        const text = `🚚 Buyurtmangiz yetkazilmoqda\n\nKuryer: ${courierName || '—'}\nTelefon: ${courierPhone || '—'}\nETA: ${etaText}`;
        const { bot } = require('../../index');
        await bot.telegram.sendMessage(order.user.telegramId, text);
      }
    } catch {}
    const changed = existingOrder.deliveryInfo?.courier && String(existingOrder.deliveryInfo.courier) !== String(courierId);
    res.json({ success: true, message: changed ? 'Kuryer o\'zgartirildi!' : 'Haydovchi tayinlandi!', data: { order } });
  } catch (error) {
    console.error('Assign courier error:', error);
    res.status(500).json({ success: false, message: 'Haydovchi tayinlashda xatolik!' });
  }
}

module.exports = { listOrders, getOrder, getStats, updateStatus, assignCourier };


