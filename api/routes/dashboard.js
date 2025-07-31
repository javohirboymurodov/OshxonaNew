const express = require('express');
const { Order, User, Product } = require('../../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);
router.use(requireAdmin);

// ==============================================
// 📊 ANALYTICS & REPORTS
// ==============================================

// Sales analytics
router.get('/analytics/sales', async (req, res) => {
  try {
    const { period = '7d' } = req.query; // 7d, 30d, 3m, 1y
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;

    let dateRange;
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3m':
        dateRange = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case '1y':
        dateRange = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        dateRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const baseFilter = {
      status: 'delivered',
      createdAt: { $gte: dateRange }
    };
    if (branchId) baseFilter.branch = branchId;

    // Sales by day
    const salesByDay = await Order.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$createdAt' },
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Top products
    const topProductsFilter = { ...baseFilter };
    const topProducts = await Order.aggregate([
      { $match: topProductsFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        salesByDay,
        topProducts
      }
    });

  } catch (error) {
    console.error('Sales analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Sotuv analitikasini olishda xatolik!'
    });
  }
});

// Order statistics
router.get('/analytics/orders', async (req, res) => {
  try {
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseFilter = branchId ? { branch: branchId } : {};
    const todayFilter = { ...baseFilter, createdAt: { $gte: today } };
    const weeklyFilter = { ...baseFilter, createdAt: { $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) } };
    const monthlyFilter = { ...baseFilter, createdAt: { $gte: new Date(today.getFullYear(), today.getMonth(), 1) } };

    const [
      todayOrders,
      todayRevenue,
      weeklyOrders,
      monthlyOrders,
      ordersByStatus,
      ordersByType
    ] = await Promise.all([
      Order.countDocuments(todayFilter),
      Order.aggregate([
        { 
          $match: { 
            ...todayFilter,
            status: 'delivered'
          } 
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Order.countDocuments(weeklyFilter),
      Order.countDocuments(monthlyFilter),
      Order.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$orderType', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        todayOrders,
        todayRevenue: todayRevenue[0]?.total || 0,
        weeklyOrders,
        monthlyOrders,
        ordersByStatus,
        ordersByType
      }
    });

  } catch (error) {
    console.error('Order analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Buyurtma analitikasini olishda xatolik!'
    });
  }
});

// Yo'q bo'lgan route qo'shish
router.get('/stats', async (req, res) => {
  try {
    // SuperAdmin barcha ma'lumotlarni ko'rishi mumkin, oddiy admin faqat o'z filialini
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Base filter for queries
    const baseFilter = branchId ? { branch: branchId } : {};
    
    const [
      totalOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      totalUsers,
      totalProducts,
      ordersByStatus
    ] = await Promise.all([
      Order.countDocuments(baseFilter),
      Order.countDocuments({ 
        ...baseFilter,
        createdAt: { $gte: today } 
      }),
      Order.aggregate([
        { 
          $match: { 
            ...baseFilter,
            status: 'delivered' 
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$totalAmount' } 
          } 
        }
      ]),
      Order.aggregate([
        { 
          $match: { 
            ...baseFilter,
            status: 'delivered',
            createdAt: { $gte: today }
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$totalAmount' } 
          } 
        }
      ]),
      User.countDocuments({ role: 'user' }),
      Product.countDocuments({ isActive: true }),
      Order.aggregate([
        { $match: baseFilter },
        { 
          $group: { 
            _id: '$status', 
            count: { $sum: 1 } 
          } 
        }
      ])
    ]);

    // Format order status counts
    const statusCounts = ordersByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const stats = {
      orders: {
        total: totalOrders,
        today: todayOrders,
        growth: 12.5, // Mock for now
        byStatus: {
          pending: statusCounts.pending || 0,
          confirmed: statusCounts.confirmed || 0,
          preparing: statusCounts.preparing || 0,
          ready: statusCounts.ready || 0,
          delivered: statusCounts.delivered || 0,
          cancelled: statusCounts.cancelled || 0
        }
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        today: todayRevenue[0]?.total || 0,
        growth: 8.2, // Mock for now
        average: totalOrders > 0 ? Math.round((totalRevenue[0]?.total || 0) / totalOrders) : 0
      },
      users: {
        total: totalUsers,
        active: Math.round(totalUsers * 0.85), // Mock
        new: Math.round(totalUsers * 0.05), // Mock
        growth: 15.3 // Mock
      },
      products: {
        total: totalProducts,
        active: totalProducts,
        lowStock: 0, // Mock
        popular: [] // Mock - qo'shimcha query kerak
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Dashboard statistikasini olishda xatolik!'
    });
  }
});

module.exports = router;