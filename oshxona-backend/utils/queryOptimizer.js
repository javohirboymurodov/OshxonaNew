// utils/queryOptimizer.js
const logger = require('./logger');

class QueryOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Optimized order queries
  static getOrdersQuery(filters = {}) {
    const {
      branch,
      status,
      orderType,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      courierId
    } = filters;

    const query = {};
    const sort = { createdAt: -1 };

    // Branch filter (most selective)
    if (branch) query.branch = branch;

    // Status filter
    if (status) query.status = status;

    // Order type filter
    if (orderType) query.orderType = orderType;

    // Courier filter
    if (courierId) query['deliveryInfo.courier'] = courierId;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (page - 1) * limit;

    return {
      query,
      sort,
      skip,
      limit: parseInt(limit),
      // Optimize population
      populate: [
        { path: 'user', select: 'firstName lastName phone' },
        { path: 'branch', select: 'name address' },
        { path: 'deliveryInfo.courier', select: 'firstName lastName phone' }
      ]
    };
  }

  // Optimized product queries
  static getProductsQuery(filters = {}) {
    const {
      branch,
      category,
      isActive = true,
      isPopular,
      search,
      page = 1,
      limit = 20
    } = filters;

    const query = {};
    const sort = { sortOrder: 1, createdAt: -1 };

    // Branch filter (most selective)
    if (branch) query.branch = branch;

    // Active filter
    query.isActive = isActive;

    // Category filter
    if (category) query.categoryId = category;

    // Popular filter
    if (isPopular !== undefined) query.isPopular = isPopular;

    // Text search
    if (search) {
      query.$text = { $search: search };
      sort.score = { $meta: 'textScore' };
    }

    const skip = (page - 1) * limit;

    return {
      query,
      sort,
      skip,
      limit: parseInt(limit),
      populate: [
        { path: 'categoryId', select: 'name' }
      ]
    };
  }

  // Optimized branch products with promo
  static getBranchProductsQuery(branchId, filters = {}) {
    const { category, isAvailable = true } = filters;

    const pipeline = [
      // Match branch products
      {
        $match: {
          branch: branchId,
          isAvailable: isAvailable
        }
      },
      // Lookup product details
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $unwind: '$productDetails'
      },
      // Filter by category if specified
      ...(category ? [
        {
          $match: {
            'productDetails.categoryId': category
          }
        }
      ] : []),
      // Add computed fields
      {
        $addFields: {
          finalPrice: {
            $cond: {
              if: { $and: ['$isPromoActive', { $lte: [new Date(), '$promoEnd'] }] },
              then: {
                $cond: {
                  if: { $eq: ['$discountType', 'percent'] },
                  then: {
                    $subtract: [
                      { $ifNull: ['$priceOverride', '$productDetails.price'] },
                      {
                        $multiply: [
                          { $ifNull: ['$priceOverride', '$productDetails.price'] },
                          { $divide: ['$discountValue', 100] }
                        ]
                      }
                    ]
                  },
                  else: {
                    $subtract: [
                      { $ifNull: ['$priceOverride', '$productDetails.price'] },
                      '$discountValue'
                    ]
                  }
                }
              },
              else: { $ifNull: ['$priceOverride', '$productDetails.price'] }
            }
          },
          hasActivePromo: {
            $and: [
              '$isPromoActive',
              { $lte: [new Date(), '$promoEnd'] }
            ]
          }
        }
      },
      // Sort by product order
      {
        $sort: {
          'productDetails.sortOrder': 1,
          'productDetails.name': 1
        }
      }
    ];

    return pipeline;
  }

  // Cache management
  getCachedQuery(key) {
    const cached = this.queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedQuery(key, data) {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean old cache entries
    if (this.queryCache.size > 100) {
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }
  }

  // Query performance monitoring
  static async executeWithLogging(query, operation = 'query') {
    const startTime = Date.now();
    
    try {
      const result = await query;
      const duration = Date.now() - startTime;
      
      if (duration > 1000) { // Log slow queries
        logger.warn('Slow query detected', {
          operation,
          duration: `${duration}ms`,
          query: query.getQuery?.() || 'aggregation'
        });
      }
      
      return result;
    } catch (error) {
      logger.error('Query execution failed', {
        operation,
        error: error.message,
        duration: `${Date.now() - startTime}ms`
      });
      throw error;
    }
  }

  // Aggregation helpers
  static createMatchStage(filters) {
    const match = {};
    
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== undefined && value !== null && value !== '') {
        match[key] = value;
      }
    });
    
    return Object.keys(match).length > 0 ? { $match: match } : null;
  }

  static createSortStage(sortOptions) {
    const sort = {};
    
    if (typeof sortOptions === 'string') {
      const [field, order] = sortOptions.split(':');
      sort[field] = order === 'desc' ? -1 : 1;
    } else if (typeof sortOptions === 'object') {
      Object.assign(sort, sortOptions);
    } else {
      sort.createdAt = -1; // Default sort
    }
    
    return { $sort: sort };
  }

  static createPaginationStages(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return [
      { $skip: skip },
      { $limit: parseInt(limit) }
    ];
  }
}

module.exports = QueryOptimizer;