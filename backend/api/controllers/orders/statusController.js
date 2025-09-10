const { Order } = require('../../../models');
const SocketManager = require('../../../config/socketConfig');

/**
 * Orders Status Controller
 * Buyurtma holati boshqaruvi
 */

/**
 * Status xabarlarini olish
 * @param {string} status - buyurtma holati
 * @returns {string} - status xabari
 */
function getStatusMessage(status) {
  const messages = {
    pending: 'Buyurtmangiz kutilmoqda',
    confirmed: 'Buyurtmangiz tasdiqlandi',
    ready: 'Buyurtmangiz tayyor!',
    assigned: 'Kuryer tayinlandi',
    on_delivery: 'Buyurtmangiz yetkazilmoqda',
    delivered: 'Buyurtmangiz yetkazildi',
    picked_up: 'Buyurtmangiz olib ketildi',
    completed: 'Buyurtmangiz yakunlandi',
    cancelled: 'Buyurtmangiz bekor qilindi'
  };
  return messages[status] || 'Status yangilandi';
}

/**
 * Status emoji larini olish
 * @param {string} status - buyurtma holati
 * @returns {string} - status emoji
 */
function getStatusEmoji(status) {
  const emojis = {
    pending: '⏳',
    confirmed: '✅',
    ready: '🍽️',
    assigned: '🚚',
    on_delivery: '🚗',
    delivered: '✅',
    picked_up: '📦',
    completed: '🎉',
    cancelled: '❌'
  };
  return emojis[status] || '📋';
}

/**
 * Taxminiy vaqtni olish
 * @param {string} status - buyurtma holati
 * @param {string} orderType - buyurtma turi
 * @returns {string|null} - taxminiy vaqt
 */
function getEstimatedTime(status, orderType) {
  if (status === 'confirmed') return orderType === 'delivery' ? '30-45 daqiqa' : '15-25 daqiqa';
  if (status === 'ready' && orderType !== 'delivery') return 'Olib ketishingiz mumkin';
  if (status === 'assigned' && orderType === 'delivery') return '15-25 daqiqa';
  return null;
}

// PATCH /api/orders/:id/status
async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, message: customMessage } = req.body;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    
    const validStatuses = [
      'pending', 'confirmed', 'ready', 'assigned', 'on_delivery', 
      'delivered', 'picked_up', 'completed', 'cancelled'
    ];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Noto\'g\'ri status!' 
      });
    }
    
    const existing = await Order.findById(id).populate('user', 'firstName lastName phone telegramId');
    if (!existing) {
      return res.status(404).json({ 
        success: false, 
        message: 'Buyurtma topilmadi!' 
      });
    }
    
    if (branchId) {
      if (existing.branch && String(existing.branch) !== String(branchId)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Bu buyurtmani o\'zgartirish huquqi yo\'q' 
        });
      }
    }
    
    if (!existing.branch && branchId) existing.branch = branchId;
    
    // 🔧 FIX: Yetkazib berish holatlarida kuryer tekshiruvi
    if (existing.orderType === 'delivery') {
      // Kuryer tayinlanishi kerak
      if (['on_delivery', 'delivered'].includes(status)) {
        if (!existing.deliveryInfo || !existing.deliveryInfo.courier) {
          return res.status(400).json({ 
            success: false, 
            message: 'Yetkazib berish uchun avval kuryer tayinlash kerak!' 
          });
        }
      }
      
      // 🔧 FIX: Faqat kuryer "delivered" statusni o'zgartira oladi
      if (status === 'delivered') {
        // Admin tomonidan qo'lda delivered qilish taqiqlanadi
        return res.status(400).json({
          success: false,
          message: 'Yetkazib berish buyurtmasini faqat kuryer "Yetkazdim" tugmasi orqali yakunlay oladi!'
        });
      }
      
      // Completed statusga o'tish faqat delivered dan keyin
      if (status === 'completed' && existing.status !== 'delivered') {
        return res.status(400).json({
          success: false,
          message: 'Buyurtmani yakunlash uchun avval kuryer yetkazgan bo\'lishi kerak!'
        });
      }
    }
    
    // Table/dine-in buyurtmalar uchun mijoz kelganligini tekshirish
    if (['table', 'dine_in'].includes(existing.orderType) && status === 'delivered') {
      // Mijoz kelganligini tekshirish - agar mijoz kelgan bo'lmasa, delivered holatiga o'tkazib bo'lmaydi
      const hasArrivedStatus = existing.statusHistory?.some(h => h.status === 'customer_arrived');
      if (!hasArrivedStatus) {
        return res.status(400).json({
          success: false,
          message: 'Mijoz hali kelmagan! Avval mijoz kelganligini tasdiqlang.'
        });
      }
    }
    
    existing.status = status;
    existing.updatedAt = new Date();
    existing.statusHistory = existing.statusHistory || [];
    
    // Status history ga qo'shish
    const statusMessage = customMessage || getStatusMessage(status);
    existing.statusHistory.push({ 
      status, 
      message: statusMessage, 
      timestamp: new Date(), 
      updatedBy: req.user._id 
    });
    
    const order = await existing.save();
    
    // 🔧 DISABLE: Auto-assignment qilinmaydi (manual assignment orqali)
    // Faqat manual kuryer tayinlash admin paneldan
    
    // Socket events
    try {
      SocketManager.emitStatusUpdate(order.user._id, { 
        orderId: order._id, 
        orderNumber: order.orderId, 
        status, 
        message: statusMessage, 
        updatedAt: new Date(), 
        estimatedTime: getEstimatedTime(status, order.orderType) 
      });
    } catch (e) {
      console.error('Socket emit error:', e);
    }
    
    res.json({ 
      success: true, 
      message: 'Buyurtma holati yangilandi!', 
      data: { order } 
    });
    
    // Auto-complete pickup orders after 10 seconds
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
              SocketManager.emitOrderUpdate(idForTimer, { 
                status: 'completed', 
                branchId: String(fresh.branch || '') 
              });
            }
          } catch (e) {
            console.error('Auto-complete pickup error:', e);
          }
        }, 10000);
      }
    } catch (e) {
      console.error('Auto-complete setup error:', e);
    }
    
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Buyurtma holatini yangilashda xatolik!' 
    });
  }
}

module.exports = {
  getStatusMessage,
  getStatusEmoji,
  getEstimatedTime,
  updateStatus
};
