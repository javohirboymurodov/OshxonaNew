const { Order, Product } = require('../../../models');

/**
 * Admin Dashboard Controller
 * Admin dashboard operatsiyalari
 */

/**
 * Dashboard statistikalarini olish
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getDashboard(req, res) {
  try {
    const adminUser = req.user;
    const branchId = adminUser.branch;
    
    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin filiala biriktirilmagan!' 
      });
    }
    
    const [ 
      totalOrders, 
      pendingOrders, 
      completedOrders, 
      totalRevenue, 
      totalProducts, 
      activeProducts 
    ] = await Promise.all([
      Order.countDocuments({ branch: branchId }),
      Order.countDocuments({ branch: branchId, status: 'pending' }),
      Order.countDocuments({ branch: branchId, status: 'completed' }),
      Order.aggregate([
        { $match: { branch: branchId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Product.countDocuments({ branch: branchId }),
      Product.countDocuments({ branch: branchId, isActive: true })
    ]);
    
    const recentOrders = await Order.find({ branch: branchId })
      .populate('user', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({ 
      success: true, 
      data: { 
        stats: { 
          totalOrders, 
          pendingOrders, 
          completedOrders, 
          totalRevenue: totalRevenue[0]?.total || 0, 
          totalProducts, 
          activeProducts 
        }, 
        recentOrders 
      } 
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Dashboard ma\'lumotlarini olishda xatolik!' 
    });
  }
}

module.exports = {
  getDashboard
};