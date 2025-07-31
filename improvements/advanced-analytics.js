// Advanced Analytics va Business Intelligence
class AdvancedAnalytics {
  // Revenue Analytics
  static async getRevenueAnalytics(period = 'month') {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        endDate = new Date();
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
    }

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === 'day' ? '%H' : period === 'week' ? '%u' : period === 'month' ? '%d' : '%m',
              date: '$createdAt'
            }
          },
          totalRevenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$total' }
        }
      },
      { $sort: { '_id': 1 } }
    ];

    const data = await Order.aggregate(pipeline);

    return {
      period,
      data,
      summary: {
        totalRevenue: data.reduce((sum, item) => sum + item.totalRevenue, 0),
        totalOrders: data.reduce((sum, item) => sum + item.orderCount, 0),
        avgOrderValue: data.length > 0 ? data.reduce((sum, item) => sum + item.avgOrderValue, 0) / data.length : 0
      }
    };
  }

  // Customer Segmentation
  static async getCustomerSegmentation() {
    const pipeline = [
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'user',
          as: 'orders'
        }
      },
      {
        $addFields: {
          totalSpent: { $sum: '$orders.total' },
          orderCount: { $size: '$orders' },
          lastOrderDate: { $max: '$orders.createdAt' }
        }
      },
      {
        $addFields: {
          daysSinceLastOrder: {
            $divide: [
              { $subtract: [new Date(), '$lastOrderDate'] },
              1000 * 60 * 60 * 24
            ]
          },
          avgOrderValue: {
            $cond: [
              { $gt: ['$orderCount', 0] },
              { $divide: ['$totalSpent', '$orderCount'] },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          segment: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [
                      { $gte: ['$totalSpent', 500000] },
                      { $gte: ['$orderCount', 20] },
                      { $lte: ['$daysSinceLastOrder', 30] }
                    ]
                  },
                  then: 'VIP'
                },
                {
                  case: {
                    $and: [
                      { $gte: ['$totalSpent', 200000] },
                      { $gte: ['$orderCount', 10] },
                      { $lte: ['$daysSinceLastOrder', 60] }
                    ]
                  },
                  then: 'Loyal'
                },
                {
                  case: {
                    $and: [
                      { $gte: ['$totalSpent', 50000] },
                      { $gte: ['$orderCount', 3] },
                      { $lte: ['$daysSinceLastOrder', 90] }
                    ]
                  },
                  then: 'Regular'
                },
                {
                  case: { $lte: ['$daysSinceLastOrder', 30] },
                  then: 'New'
                }
              ],
              default: 'At Risk'
            }
          }
        }
      },
      {
        $group: {
          _id: '$segment',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalSpent' },
          avgSpent: { $avg: '$totalSpent' },
          avgOrders: { $avg: '$orderCount' }
        }
      }
    ];

    return await User.aggregate(pipeline);
  }

  // Product Performance Analysis
  static async getProductAnalytics(period = 'month') {
    const startDate = this.getStartDate(period);

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$productInfo.name' },
          category: { $first: '$productInfo.categoryId' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
          orderCount: { $sum: 1 },
          avgPrice: { $avg: '$items.price' }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $addFields: {
          categoryName: { $first: '$categoryInfo.name' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ];

    return await Order.aggregate(pipeline);
  }

  // Peak Hours Analysis
  static async getPeakHoursAnalysis(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            dayOfWeek: { $dayOfWeek: '$createdAt' }
          },
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' }
        }
      },
      {
        $group: {
          _id: '$_id.hour',
          weekdayOrders: {
            $sum: {
              $cond: [{ $lte: ['$_id.dayOfWeek', 5] }, '$orderCount', 0]
            }
          },
          weekendOrders: {
            $sum: {
              $cond: [{ $gt: ['$_id.dayOfWeek', 5] }, '$orderCount', 0]
            }
          },
          totalOrders: { $sum: '$orderCount' },
          avgRevenue: { $avg: '$totalRevenue' }
        }
      },
      { $sort: { '_id': 1 } }
    ];

    return await Order.aggregate(pipeline);
  }

  // Churn Analysis
  static async getChurnAnalysis() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const pipeline = [
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'user',
          as: 'orders'
        }
      },
      {
        $addFields: {
          lastOrderDate: { $max: '$orders.createdAt' },
          orderCount: { $size: '$orders' },
          totalSpent: { $sum: '$orders.total' }
        }
      },
      {
        $addFields: {
          churnRisk: {
            $switch: {
              branches: [
                {
                  case: { $lt: ['$lastOrderDate', ninetyDaysAgo] },
                  then: 'High'
                },
                {
                  case: { $lt: ['$lastOrderDate', sixtyDaysAgo] },
                  then: 'Medium'
                },
                {
                  case: { $lt: ['$lastOrderDate', thirtyDaysAgo] },
                  then: 'Low'
                }
              ],
              default: 'Active'
            }
          }
        }
      },
      {
        $group: {
          _id: '$churnRisk',
          count: { $sum: 1 },
          avgOrderCount: { $avg: '$orderCount' },
          avgSpent: { $avg: '$totalSpent' }
        }
      }
    ];

    return await User.aggregate(pipeline);
  }

  // Marketing Campaign Analysis
  static async getCampaignAnalysis(campaignId) {
    const pipeline = [
      {
        $match: {
          'marketing.campaignId': campaignId
        }
      },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'user',
          as: 'orders'
        }
      },
      {
        $addFields: {
          ordersAfterCampaign: {
            $filter: {
              input: '$orders',
              cond: { $gte: ['$$this.createdAt', '$marketing.joinDate'] }
            }
          }
        }
      },
      {
        $addFields: {
          conversionValue: { $sum: '$ordersAfterCampaign.total' },
          conversionOrders: { $size: '$ordersAfterCampaign' }
        }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          convertedUsers: {
            $sum: { $cond: [{ $gt: ['$conversionOrders', 0] }, 1, 0] }
          },
          totalRevenue: { $sum: '$conversionValue' },
          totalOrders: { $sum: '$conversionOrders' }
        }
      },
      {
        $addFields: {
          conversionRate: {
            $multiply: [
              { $divide: ['$convertedUsers', '$totalUsers'] },
              100
            ]
          },
          avgRevenuePerUser: { $divide: ['$totalRevenue', '$totalUsers'] },
          roi: {
            $subtract: [
              { $divide: ['$totalRevenue', '$totalUsers'] },
              100 // Assuming $1 cost per user
            ]
          }
        }
      }
    ];

    return await User.aggregate(pipeline);
  }

  // Predictive Analytics
  static async predictOrderDemand(date) {
    // Historical data ni olish
    const historicalData = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days back
            $lt: date
          },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$createdAt' },
            hour: { $hour: '$createdAt' }
          },
          avgOrders: { $avg: 1 },
          count: { $sum: 1 }
        }
      }
    ]);

    const targetDayOfWeek = date.getDay() + 1; // MongoDB uses 1-7
    const targetHour = date.getHours();

    const prediction = historicalData.find(d => 
      d._id.dayOfWeek === targetDayOfWeek && 
      d._id.hour === targetHour
    );

    return {
      predictedOrders: Math.round(prediction?.avgOrders || 0),
      confidence: prediction?.count > 4 ? 'High' : prediction?.count > 1 ? 'Medium' : 'Low',
      historicalAverage: prediction?.avgOrders || 0
    };
  }

  // Helper function
  static getStartDate(period) {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.setMonth(now.getMonth() - 1));
    }
  }
}

// Export qilish
module.exports = AdvancedAnalytics;
