const { Order } = require('../../../models');

/**
 * Admin Order Controller
 * Admin buyurtma operatsiyalari
 */

/**
 * Buyurtmalar ro'yxatini olish (admin scope)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getOrders(req, res) {
  try {
    const { page = 1, limit = 15, status, orderType, dateFrom, dateTo, search } = req.query;
    const query = {};
    
    // Adminlar faqat o'z filialidagi buyurtmalarni ko'rishi kerak
    if (req.user.role === 'admin' && req.user.branch) {
      query.branch = req.user.branch;
    }
    // Superadmin barcha filiallarni ko'ra oladi (branch filter yo'q)
    
    if (status && status !== 'all') query.status = status;
    if (orderType && orderType !== 'all') query.orderType = orderType;
    
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
        { 'customerInfo.phone': { $regex: regex } } 
      ];
    }
    
    const orders = await Order.find(query)
      .populate('user', 'firstName lastName phone')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await Order.countDocuments(query);

    res.json({ 
      success: true, 
      data: { 
        orders, 
        pagination: { 
          current: parseInt(page), 
          pageSize: parseInt(limit), 
          total, 
          pages: Math.ceil(total / limit) 
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
}

/**
 * Buyurtma statistikalarini olish
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getOrdersStats(req, res) {
  try {
    const matchQuery = {};
    
    // Adminlar faqat o'z filialidagi buyurtma statistikasini ko'rishi kerak
    if (req.user.role === 'admin' && req.user.branch) {
      matchQuery.branch = req.user.branch;
    }
    // Superadmin barcha filiallarni ko'ra oladi
    
    const result = await Order.aggregate([
      { $match: matchQuery },
      { 
        $group: { 
          _id: null, 
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }, 
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } }, 
          preparing: { $sum: { $cond: [{ $eq: ['$status', 'preparing'] }, 1, 0] } }, 
          ready: { $sum: { $cond: [{ $eq: ['$status', 'ready'] }, 1, 0] } }, 
          delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'completed', 'picked_up', 'on_delivery']] }, 1, 0] } }, 
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } } 
        } 
      }
    ]);
    
    const stats = result[0] || { 
      pending: 0, 
      confirmed: 0, 
      preparing: 0, 
      ready: 0, 
      delivered: 0, 
      cancelled: 0 
    };
    
    res.json({ 
      success: true, 
      data: { stats } 
    });
  } catch (error) {
    console.error('Orders stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Buyurtma statistikasini olishda xatolik!' 
    });
  }
}

module.exports = {
  getOrders,
  getOrdersStats
};