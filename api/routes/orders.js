const express = require('express');
const { Order, User, Branch } = require('../../models');
const DeliveryService = require('../../services/deliveryService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const SocketManager = require('../../config/socketConfig');

const router = express.Router();

// Apply authentication
router.use(authenticateToken);


// 📋 ORDER MANAGEMENT


// Get orders for admin's branch + search
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      orderType, 
      dateFrom, 
      dateTo, 
      search,
      courier
    } = req.query;

    let query = {};
    // Branch scope: superadmin ko'radi hammasini, admin faqat o'z filialini
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    if (branchId) query.branch = branchId;
    
    if (status) query.status = status;
    if (orderType) query.orderType = orderType;
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Live search: orderId, orderNumber, user's name, phone
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
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Courier filter (assigned/unassigned)
    if (courier === 'assigned') {
      query['deliveryInfo.courier'] = { $ne: null };
    } else if (courier === 'unassigned') {
      query['deliveryInfo.courier'] = { $in: [null, undefined] };
    }

    const total = await Order.countDocuments(query);

    // Enrich with delivery metadata for delivery orders
    try {
      // Determine restaurant/branch coordinates
      let origin = null;
      if (req.user.role !== 'superadmin' && req.user.branch) {
        const branch = await Branch.findById(req.user.branch);
        if (branch?.address?.coordinates?.latitude && branch?.address?.coordinates?.longitude) {
          origin = {
            lat: branch.address.coordinates.latitude,
            lon: branch.address.coordinates.longitude
          };
        }
      }
      // Fallback to env
      if (!origin && process.env.DEFAULT_RESTAURANT_LAT && process.env.DEFAULT_RESTAURANT_LON) {
        origin = {
          lat: parseFloat(process.env.DEFAULT_RESTAURANT_LAT),
          lon: parseFloat(process.env.DEFAULT_RESTAURANT_LON)
        };
      }

      const enriched = [];
      for (const o of orders) {
        const obj = o.toObject();
        if (obj.orderType === 'delivery' && obj.deliveryInfo?.location?.latitude && obj.deliveryInfo?.location?.longitude) {
          const calc = await DeliveryService.calculateDeliveryTime(
            {
              latitude: obj.deliveryInfo.location.latitude,
              longitude: obj.deliveryInfo.location.longitude
            },
            obj.items,
            origin
          );
          const fee = await DeliveryService.calculateDeliveryFee(
            {
              latitude: obj.deliveryInfo.location.latitude,
              longitude: obj.deliveryInfo.location.longitude
            },
            obj.total ?? obj.totalAmount ?? 0
          );
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

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Buyurtmalarni olishda xatolik!'
    });
  }
});

// Orders stats (for dashboard/cards)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Branch scope
    const match = {};
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    if (branchId) match.branch = branchId;

    const result = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          preparing: { $sum: { $cond: [{ $eq: ['$status', 'preparing'] }, 1, 0] } },
          ready: { $sum: { $cond: [{ $eq: ['$status', 'ready'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'completed', 'picked_up', 'on_delivery']] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        }
      }
    ]);

    const stats = result[0] || { pending: 0, confirmed: 0, preparing: 0, ready: 0, delivered: 0, cancelled: 0 };

    res.json({ success: true, data: { stats } });
  } catch (error) {
    console.error('Orders stats error:', error);
    res.status(500).json({ success: false, message: 'Buyurtma statistikasini olishda xatolik!' });
  }
});

// Get single order
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;

    // SuperAdmin uchun branch filter yo'q
    const query = { _id: id };
    if (branchId) {
      query.branch = branchId;
    }

    const orderDoc = await Order.findOne(query)
      .populate('user', 'firstName lastName phone address')
      .populate('deliveryInfo.courier', 'firstName lastName phone courierInfo')
      .populate('items.product', 'name price description');

    if (!orderDoc) {
      return res.status(404).json({
        success: false,
        message: 'Buyurtma topilmadi!'
      });
    }

    // Enrich single order with delivery metadata if applicable
    let order = orderDoc.toObject();
    try {
      if (order.orderType === 'delivery' && order.deliveryInfo?.location?.latitude && order.deliveryInfo?.location?.longitude) {
        let origin = null;
        if (branchId) {
          const branch = await Branch.findById(branchId);
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
        const calc = await DeliveryService.calculateDeliveryTime(
          {
            latitude: order.deliveryInfo.location.latitude,
            longitude: order.deliveryInfo.location.longitude
          },
          order.items,
          origin
        );
        const fee = await DeliveryService.calculateDeliveryFee(
          {
            latitude: order.deliveryInfo.location.latitude,
            longitude: order.deliveryInfo.location.longitude
          },
          order.total ?? order.totalAmount ?? 0
        );
        order.deliveryMeta = {
          distanceKm: calc?.distance ?? null,
          etaMinutes: calc?.totalTime ?? null,
          preparationMinutes: calc?.preparationTime ?? null,
          deliveryMinutes: calc?.deliveryTime ?? null,
          deliveryFee: fee?.fee ?? null,
          isFreeDelivery: fee?.isFreeDelivery ?? false
        };
      }
    } catch (singleEnrichErr) {
      console.error('Order single enrichment error:', singleEnrichErr);
    }

    res.json({
      success: true,
      data: { order }
    });

  } catch (error) {
    console.error('Get single order error:', error);
    res.status(500).json({
      success: false,
      message: 'Buyurtma ma\'lumotlarini olishda xatolik!'
    });
  }
});

// Update order status
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message: customMessage } = req.body;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;

    const validStatuses = ['pending', 'confirmed', 'ready', 'on_delivery', 'delivered', 'picked_up', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri status!'
      });
    }

    // SuperAdmin uchun branch filter yo'q
    const query = { _id: id };
    if (branchId) {
      query.branch = branchId;
    }

    const order = await Order.findOneAndUpdate(
      query,
      { 
        status,
        updatedAt: new Date(),
        $push: {
          statusHistory: {
            status,
            message: customMessage || getStatusMessage(status),
            timestamp: new Date(),
            updatedBy: req.user._id
          }
        }
      },
      { new: true }
    ).populate('user', 'firstName lastName phone telegramId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Buyurtma topilmadi!'
      });
    }

    // Socket.IO orqali real-time yangilanish
    try {
      const statusMessage = customMessage || getStatusMessage(status);
      
      // Foydalanuvchiga Socket.IO orqali yuborish
      SocketManager.emitStatusUpdate(order.user._id, {
        orderId: order._id,
        orderNumber: order.orderId,
        status: status,
        message: statusMessage,
        updatedAt: new Date(),
        estimatedTime: getEstimatedTime(status, order.orderType)
      });

      // Telegram bot orqali notification
      if (order.user.telegramId) {
        const { bot } = require('../../index');
        const statusEmoji = getStatusEmoji(status);
        let botMessage = `${statusEmoji} **Buyurtma №${order.orderId}**\n\n📍 **Holat:** ${statusMessage}\n📅 **Vaqt:** ${new Date().toLocaleString('uz-UZ')}`;
        
        if (getEstimatedTime(status, order.orderType)) {
          botMessage += `\n⏰ **Kutilayotgan vaqt:** ${getEstimatedTime(status, order.orderType)}`;
        }

        try {
          await bot.telegram.sendMessage(
            order.user.telegramId,
            botMessage,
            { parse_mode: 'Markdown' }
          );
          console.log(`📱 Telegram notification sent to user ${order.user.telegramId}`);
        } catch (telegramError) {
          console.error('Telegram notification error:', telegramError);
        }
      }

      console.log(`📡 Status update events sent for order ${order.orderId}: ${status}`);
    } catch (notificationError) {
      console.error('Notification error:', notificationError);
      // Notification xatosi API javobini buzmasin
    }

    res.json({
      success: true,
      message: 'Buyurtma holati yangilandi!',
      data: { order }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Buyurtma holatini yangilashda xatolik!'
    });
  }
});

// Helper funksiyalar
function getStatusMessage(status) {
  const messages = {
    pending: 'Buyurtmangiz kutilmoqda',
    confirmed: 'Buyurtmangiz tasdiqlandi',
    preparing: 'Buyurtmangiz tayyorlanmoqda',
    ready: 'Buyurtmangiz tayyor!',
    delivered: 'Buyurtmangiz yetkazildi',
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
    delivered: '🚚',
    cancelled: '❌'
  };
  return emojis[status] || '📋';
}

function getEstimatedTime(status, orderType) {
  if (status === 'confirmed') {
    return orderType === 'delivery' ? '30-45 daqiqa' : '15-25 daqiqa';
  }
  if (status === 'preparing') {
    return orderType === 'delivery' ? '20-30 daqiqa' : '10-15 daqiqa';
  }
  if (status === 'ready' && orderType !== 'delivery') {
    return 'Olib ketishingiz mumkin';
  }
  return null;
}

// Assign courier to order
router.patch('/:id/assign-courier', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { courierId } = req.body;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;

    // Check if courier exists and is available
    const courier = await User.findOne({
      _id: courierId,
      role: 'courier',
      isActive: true
    });

    if (!courier) {
      return res.status(400).json({
        success: false,
        message: 'Haydovchi topilmadi yoki mavjud emas!'
      });
    }

    const query = { _id: id };
    if (branchId) query.branch = branchId;
    const order = await Order.findOneAndUpdate(
      query,
      { 
        'deliveryInfo.courier': courierId,
        status: 'assigned',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('deliveryInfo.courier', 'firstName lastName phone courierInfo');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Buyurtma topilmadi!'
      });
    }

    // TODO: Send notification to courier via Telegram

    res.json({
      success: true,
      message: 'Haydovchi tayinlandi!',
      data: { order }
    });

  } catch (error) {
    console.error('Assign courier error:', error);
    res.status(500).json({
      success: false,
      message: 'Haydovchi tayinlashda xatolik!'
    });
  }
});

module.exports = router;