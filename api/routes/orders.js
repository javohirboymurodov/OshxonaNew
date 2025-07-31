const express = require('express');
const { Order, User } = require('../../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const SocketManager = require('../../config/socketConfig');

const router = express.Router();

// Apply authentication
router.use(authenticateToken);


// 📋 ORDER MANAGEMENT


// Get orders for admin's branch
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      orderType, 
      dateFrom, 
      dateTo 
    } = req.query;
    
    const branchId = req.user.branch;

    let query = { branch: branchId };
    
    if (status) query.status = status;
    if (orderType) query.orderType = orderType;
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const orders = await Order.find(query)
      .populate('user', 'firstName lastName phone')
      // .populate('courier', 'firstName lastName phone courierInfo.vehicleType')
      .populate('branch', 'name address')
      .populate('items.product', 'name price')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(query);

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

// Get single order
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch;

    const order = await Order.findOne({ _id: id, branch: branchId })
      .populate('user', 'firstName lastName phone address')
      .populate('courier', 'firstName lastName phone courierInfo')
      .populate('items.product', 'name price description');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Buyurtma topilmadi!'
      });
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
    const branchId = req.user.branch;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri status!'
      });
    }

    const order = await Order.findOneAndUpdate(
      { _id: id, branch: branchId },
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
        const botMessage = `${statusEmoji} **Buyurtma №${order.orderId}**\n\n📍 **Holat:** ${statusMessage}\n📅 **Vaqt:** ${new Date().toLocaleString('uz-UZ')}`;
        
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
    const branchId = req.user.branch;

    // Check if courier exists and is available
    const courier = await User.findOne({
      _id: courierId,
      role: 'courier',
      'courierInfo.isAvailable': true,
      'courierInfo.isOnline': true
    });

    if (!courier) {
      return res.status(400).json({
        success: false,
        message: 'Haydovchi topilmadi yoki mavjud emas!'
      });
    }

    const order = await Order.findOneAndUpdate(
      { _id: id, branch: branchId },
      { 
        courier: courierId,
        status: 'assigned',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('courier', 'firstName lastName phone');

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