const { Order, User, Product, Category, Branch } = require('../../models');

async function analyticsSales(req, res) {
  try {
    const { period = '7d' } = req.query;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    let dateRange; const now = new Date();
    switch (period) {
      case '30d': dateRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '3m': dateRange = new Date(now.setMonth(now.getMonth() - 3)); break;
      case '1y': dateRange = new Date(now.setFullYear(now.getFullYear() - 1)); break;
      default: dateRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    const baseFilter = { status: 'delivered', createdAt: { $gte: dateRange } };
    if (branchId) baseFilter.branch = branchId;
    const salesByDay = await Order.aggregate([
      { $match: baseFilter },
      { $group: { _id: { day: { $dayOfMonth: '$createdAt' }, month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, totalSales: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    const topProducts = await Order.aggregate([
      { $match: baseFilter },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', totalQuantity: { $sum: '$items.quantity' }, totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } } } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } }
    ]);
    res.json({ success: true, data: { salesByDay, topProducts } });
  } catch (e) { res.status(500).json({ success: false, message: 'Sotuv analitikasini olishda xatolik!' }); }
}

async function analyticsOrders(req, res) {
  try {
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    const today = new Date(); today.setHours(0,0,0,0);
    const baseFilter = branchId ? { branch: branchId } : {};
    const todayFilter = { ...baseFilter, createdAt: { $gte: today } };
    const weeklyFilter = { ...baseFilter, createdAt: { $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) } };
    const monthlyFilter = { ...baseFilter, createdAt: { $gte: new Date(today.getFullYear(), today.getMonth(), 1) } };
    const [ todayOrders, todayRevenue, weeklyOrders, monthlyOrders, ordersByStatus, ordersByType ] = await Promise.all([
      Order.countDocuments(todayFilter),
      Order.aggregate([{ $match: { ...todayFilter, status: 'delivered' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Order.countDocuments(weeklyFilter),
      Order.countDocuments(monthlyFilter),
      Order.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: baseFilter }, { $group: { _id: '$orderType', count: { $sum: 1 } } }])
    ]);
    res.json({ success: true, data: { todayOrders, todayRevenue: todayRevenue[0]?.total || 0, weeklyOrders, monthlyOrders, ordersByStatus, ordersByType } });
  } catch (e) { res.status(500).json({ success: false, message: 'Buyurtma analitikasini olishda xatolik!' }); }
}

async function chartData(req, res) {
  try {
    const { startDate, endDate, type = 'revenue', branch } = req.query;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date(); end.setHours(23,59,59,999);
    const match = { createdAt: { $gte: start, $lte: end } };
    if (branchId) Object.assign(match, { branch: branchId });
    if (req.user.role === 'superadmin' && branch) Object.assign(match, { branch });
    const pipeline = [ { $match: match }, { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } }, value: type === 'revenue' ? { $sum: '$total' } : { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } } ];
    const rows = await Order.aggregate(pipeline);
    const data = rows.map(r => { const y = `${r._id.year}`.padStart(4,'0'); const m = `${r._id.month}`.padStart(2,'0'); const d = `${r._id.day}`.padStart(2,'0'); return { date: `${y}-${m}-${d}`, value: r.value }; });
    res.json({ success: true, data });
  } catch (e) { res.status(404).json({ success: false, message: 'Chart data not found' }); }
}

async function stats(req, res) {
  try {
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    const today = new Date(); today.setHours(0,0,0,0);
    const baseFilter = branchId ? { branch: branchId } : {};
    const { dateFrom, dateTo, branch } = req.query;
    const rangeFilter = { ...baseFilter };
    if (req.user.role === 'superadmin' && branch) rangeFilter.branch = branch;
    if (dateFrom || dateTo) { rangeFilter.createdAt = {}; if (dateFrom) rangeFilter.createdAt.$gte = new Date(dateFrom); if (dateTo) rangeFilter.createdAt.$lte = new Date(dateTo); }
    const [ totalOrders, todayOrders, totalRevenue, todayRevenue, totalUsers, totalProducts, ordersByStatus, ordersByType, categoriesCount, branchesCount, avgDeliveryTime, ordersByHour, byBranch, courierAgg, categoryShareRaw ] = await Promise.all([
      Order.countDocuments(baseFilter),
      Order.countDocuments({ ...baseFilter, createdAt: { $gte: today } }),
      Order.aggregate([{ $match: { ...baseFilter, status: 'delivered' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.aggregate([{ $match: { ...baseFilter, status: 'delivered', createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      User.countDocuments({ role: 'user' }),
      Product.countDocuments({ isActive: true }),
      Order.aggregate([{ $match: rangeFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: rangeFilter }, { $group: { _id: '$orderType', count: { $sum: 1 } } }]),
      Category.countDocuments({}),
      Branch.countDocuments({}),
      Order.aggregate([{ $match: { ...baseFilter, orderType: 'delivery', 'deliveryMeta.etaMinutes': { $gt: 0 } } }, { $group: { _id: null, avgEta: { $avg: '$deliveryMeta.etaMinutes' } } }]),
      // Orders by hour
      Order.aggregate([
        { $match: rangeFilter },
        { $group: { _id: { hour: { $hour: '$createdAt' } }, count: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $project: { _id: 0, hour: '$_id.hour', count: 1, revenue: 1 } },
        { $sort: { hour: 1 } }
      ]),
      // Branch segmentation
      Order.aggregate([
        { $match: rangeFilter },
        { $group: { _id: '$branch', orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branch' } },
        { $project: { branchId: '$_id', name: { $ifNull: [{ $arrayElemAt: ['$branch.name', 0] }, 'Unknown'] }, orders: 1, revenue: 1, _id: 0 } },
        { $sort: { revenue: -1 } }
      ]),
      // Courier durations for avg/min/max/median
      Order.aggregate([
        { $match: { ...rangeFilter, orderType: 'delivery', status: { $in: ['delivered', 'completed'] }, 'deliveryInfo.courier': { $ne: null } } },
        { $addFields: { deliveredAt: { $ifNull: ['$actualDeliveryTime', '$updatedAt'] }, startedAt: '$createdAt' } },
        { $addFields: { durationMinutes: { $divide: [{ $subtract: ['$deliveredAt', '$startedAt'] }, 1000 * 60] } } },
        { $group: { _id: '$deliveryInfo.courier', durations: { $push: '$durationMinutes' }, avgMinutes: { $avg: '$durationMinutes' }, minMinutes: { $min: '$durationMinutes' }, maxMinutes: { $max: '$durationMinutes' }, orders: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'courier' } },
        { $project: { courierId: '$_id', name: { $concat: [{ $ifNull: [{ $arrayElemAt: ['$courier.firstName', 0] }, '' ] }, ' ', { $ifNull: [{ $arrayElemAt: ['$courier.lastName', 0] }, '' ] }] }, avgMinutes: 1, minMinutes: 1, maxMinutes: 1, orders: 1, durations: 1, _id: 0 } }
      ]),
      // Category share by revenue and quantity
      Order.aggregate([
        { $match: rangeFilter },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
        { $addFields: { categoryId: { $arrayElemAt: ['$prod.categoryId', 0] }, itemRevenue: { $ifNull: ['$items.totalPrice', { $multiply: ['$items.quantity', '$items.price'] }] } } },
        { $group: { _id: '$categoryId', quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$itemRevenue' } } },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
        { $project: { categoryId: '$_id', name: { $ifNull: [{ $arrayElemAt: ['$cat.name', 0] }, 'Unknown'] }, quantity: 1, revenue: 1, _id: 0 } },
        { $sort: { revenue: -1 } }
      ])
    ]);
    const statusCounts = ordersByStatus.reduce((a, i) => (a[i._id] = i.count, a), {});
    const typeCounts = ordersByType.reduce((a, i) => (a[i._id] = i.count, a), {});
    // Compute median for couriers in JS
    const courierPerformance = (courierAgg || []).map(c => {
      const arr = Array.isArray(c.durations) ? [...c.durations].sort((a,b) => a - b) : [];
      const mid = arr.length ? (arr.length - 1) / 2 : 0;
      const median = arr.length ? (arr.length % 2 ? arr[Math.floor(mid)] : (arr[Math.floor(mid)] + arr[Math.ceil(mid)]) / 2) : 0;
      return {
        courierId: c.courierId,
        name: c.name?.trim?.() || 'Courier',
        orders: c.orders || 0,
        avgMinutes: Number((c.avgMinutes || 0).toFixed ? (c.avgMinutes).toFixed(1) : c.avgMinutes),
        minMinutes: Math.round(c.minMinutes || 0),
        maxMinutes: Math.round(c.maxMinutes || 0),
        medianMinutes: Number(median.toFixed ? median.toFixed(1) : median)
      };
    }).sort((a,b) => a.avgMinutes - b.avgMinutes);
    const totalCategoryRevenue = (categoryShareRaw || []).reduce((s, c) => s + (c.revenue || 0), 0) || 1;
    const categoryShare = (categoryShareRaw || []).map(c => ({ ...c, percent: Math.round(((c.revenue || 0) / totalCategoryRevenue) * 100) }));
    const data = {
      orders: {
        total: totalOrders,
        today: todayOrders,
        growth: 12.5,
        byStatus: {
          pending: statusCounts.pending || 0,
          confirmed: statusCounts.confirmed || 0,
          preparing: statusCounts.preparing || 0,
          ready: statusCounts.ready || 0,
          delivered: statusCounts.delivered || 0,
          cancelled: statusCounts.cancelled || 0
        },
        byType: {
          delivery: typeCounts.delivery || 0,
          pickup: typeCounts.pickup || 0,
          dine_in: typeCounts.dine_in || 0,
          table: typeCounts.table || 0
        },
        byHour: ordersByHour
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        today: todayRevenue[0]?.total || 0,
        growth: 8.2,
        average: totalOrders > 0 ? Math.round((totalRevenue[0]?.total || 0) / totalOrders) : 0
      },
      users: {
        total: totalUsers,
        active: Math.round(totalUsers * 0.85),
        new: Math.round(totalUsers * 0.05),
        growth: 15.3
      },
      products: {
        total: totalProducts,
        active: totalProducts,
        lowStock: 0,
        popular: []
      },
      meta: {
        categories: categoriesCount,
        branches: branchesCount,
        avgDeliveryEtaMinutes: avgDeliveryTime?.[0]?.avgEta ? Math.round(avgDeliveryTime[0].avgEta) : null
      },
      byBranch,
      courierPerformance,
      categoryShare
    };
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: 'Dashboard statistikasini olishda xatolik!' }); }
}

module.exports = { analyticsSales, analyticsOrders, chartData, stats };


