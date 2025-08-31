const { Order } = require('../../../models');

/**
 * Orders Statistics Controller
 * Buyurtma statistikalari boshqaruvi
 */

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
    
    const stats = result[0] || { 
      pending: 0, 
      confirmed: 0, 
      preparing: 0, 
      ready: 0, 
      delivered: 0, 
      cancelled: 0 
    };
    
    res.json({ success: true, data: { stats } });
  } catch (error) {
    console.error('Orders stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Buyurtma statistikasini olishda xatolik!' 
    });
  }
}

module.exports = {
  getStats
};
