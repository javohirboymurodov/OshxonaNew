const express = require('express');
const { User, Product, Order, Category, Review } = require('../../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply Admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// ==============================================
// 📊 ADMIN DASHBOARD
// ==============================================

// Dashboard stats for specific branch
router.get('/dashboard', async (req, res) => {
  try {
    const adminUser = req.user;
    const branchId = adminUser.branch;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Admin filiala biriktirilmagan!'
      });
    }

    // Get stats for this branch
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

    // Recent orders
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
});

// ==============================================
// 📦 PRODUCT MANAGEMENT
// ==============================================

// Get products for admin's branch
router.get('/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;

    let query = {};
    
    // SuperAdmin barcha mahsulotlarni ko'radi, admin faqat o'z filialini
    if (branchId) {
      query.branch = branchId;
    }
    
    if (category) query.categoryId = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query)
      .populate('categoryId', 'name nameRu nameEn')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        items: products,
        pagination: {
          current: page,
          pageSize: limit,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Mahsulotlarni olishda xatolik!'
    });
  }
});

// Create product
router.post('/products', async (req, res) => {
  try {
    const branchId = req.user.role === 'superadmin' ? req.body.branch : req.user.branch;
    const productData = { ...req.body };
    
    if (branchId) {
      productData.branch = branchId;
    }

    const product = new Product(productData);
    await product.save();

    const savedProduct = await Product.findById(product._id)
      .populate('categoryId', 'name');

    res.status(201).json({
      success: true,
      message: 'Mahsulot muvaffaqiyatli yaratildi!',
      data: { product: savedProduct }
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Mahsulot yaratishda xatolik!'
    });
  }
});

// Update product
router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;

    let query = { _id: id };
    if (branchId) {
      query.branch = branchId;
    }

    const product = await Product.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    ).populate('categoryId', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Mahsulot topilmadi!'
      });
    }

    res.json({
      success: true,
      message: 'Mahsulot muvaffaqiyatli yangilandi!',
      data: { product }
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Mahsulot yangilashda xatolik!'
    });
  }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch;

    const product = await Product.findOneAndUpdate(
      { _id: id, branch: branchId },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Mahsulot topilmadi!'
      });
    }

    res.json({
      success: true,
      message: 'Mahsulot muvaffaqiyatli o\'chirildi!'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Mahsulot o\'chirishda xatolik!'
    });
  }
});


// 📋 CATEGORY MANAGEMENT

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const branchId = req.user.branch;
    
    const categories = await Category.find({ branch: branchId })
      .sort({ sortOrder: 1, createdAt: -1 });

    res.json({
      success: true,
      data: { categories }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriyalarni olishda xatolik!'
    });
  }
});

// Create category
router.post('/categories', async (req, res) => {
  try {
    const branchId = req.user.branch;
    const categoryData = { ...req.body, branch: branchId };

    const category = new Category(categoryData);
    await category.save();

    res.status(201).json({
      success: true,
      message: 'Kategoriya muvaffaqiyatli yaratildi!',
      data: { category }
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriya yaratishda xatolik!'
    });
  }
});

// Update category
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branch;

    const category = await Category.findOneAndUpdate(
      { _id: id, branch: branchId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategoriya topilmadi!'
      });
    }

    res.json({
      success: true,
      message: 'Kategoriya muvaffaqiyatli yangilandi!',
      data: { category }
    });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriya yangilashda xatolik!'
    });
  }
});

// ==============================================
// 📦 ORDER MANAGEMENT
// ==============================================

// Get orders for admin's branch
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 15, status } = req.query;
    const branchId = req.user.branch;

    let query = { branch: branchId };
    if (status && status !== 'all') {
      query.status = status;
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
});

// Orders stats
router.get('/orders/stats', async (req, res) => {
  try {
    const branchId = req.user.branch;
    
    const stats = await Order.aggregate([
      { $match: { branch: branchId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = stats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: { stats: formattedStats }
    });

  } catch (error) {
    console.error('Orders stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Buyurtma statistikasini olishda xatolik!'
    });
  }
});

// Settings routes
router.get('/settings', async (req, res) => {
  try {
    // Mock settings
    res.json({
      success: true,
      data: {
        appSettings: {
          restaurantName: 'Oshxona',
          currency: 'UZS',
          timezone: 'Asia/Tashkent'
        },
        notifications: {
          newOrderNotification: true,
          orderStatusNotification: true
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sozlamalarni olishda xatolik!'
    });
  }
});

router.get('/branches', async (req, res) => {
  try {
    const branches = await Branch.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: { branches }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Filiallarni olishda xatolik!'
    });
  }
});

module.exports = router;