const express = require('express');
const fs = require('fs');
const path = require('path');
const { User, Product, Order, Category, Review } = require('../../models');
const { authenticateToken, requireAdmin, requireRole } = require('../middleware/auth');

// Use local upload instead of Cloudinary
const { 
  uploadSingle, 
  uploadMultiple, 
  handleUploadError 
} = require('../../config/localUploadConfig');

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
      .populate('categoryId', 'name nameRu nameEn emoji')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        items: products,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
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

// Toggle product active status
router.patch('/products/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Mahsulot topilmadi!'
      });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.json({
      success: true,
      message: `Mahsulot ${product.isActive ? 'faollashtirildi' : 'faolsizlashtirildi'}!`,
      data: { product }
    });

  } catch (error) {
    console.error('Toggle product status error:', error);
    res.status(500).json({
      success: false,
      message: 'Mahsulot holatini o\'zgartirishda xatolik!'
    });
  }
});

// Create product
router.post('/products', uploadSingle, handleUploadError, async (req, res) => {
  try {
    console.log('Received product data:', req.body);
    console.log('Received file:', req.file);

    const {
      name,
      description,
      price,
      originalPrice,
      categoryId,
      preparationTime,
      ingredients,
      allergens,
      tags,
      weight,
      unit,
      minOrderQuantity,
      maxOrderQuantity,
      isActive,
      isAvailable,
      isPopular,
      isFeatured,
      isNewProduct
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Mahsulot nomi kiritilishi shart!'
      });
    }

    if (!price || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mahsulot narxi kiritilishi shart!'
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Kategoriya tanlanishi shart!'
      });
    }

    // Check if category exists
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Bunday kategoriya topilmadi!'
      });
    }

    // Handle local image upload
    let imageUrl = null;
    let imageFileName = null;
    
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      imageFileName = req.file.filename;
    }

    // Create product data
    const productData = {
      name: name.trim(),
      description: description?.trim(),
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      categoryId: categoryId,
      preparationTime: preparationTime ? parseInt(preparationTime) : 15,
      
      // Process arrays
      ingredients: ingredients ? 
        (typeof ingredients === 'string' ? 
          ingredients.split(',').map(i => i.trim()).filter(Boolean) : 
          ingredients) : [],
      allergens: allergens ? 
        (typeof allergens === 'string' ? 
          allergens.split(',').map(a => a.trim()).filter(Boolean) : 
          allergens) : [],
      tags: tags ? 
        (typeof tags === 'string' ? 
          tags.split(',').map(t => t.trim()).filter(Boolean) : 
          tags) : [],

      // Additional fields
      weight: weight ? parseFloat(weight) : undefined,
      unit: unit || 'portion',
      minOrderQuantity: minOrderQuantity ? parseInt(minOrderQuantity) : 1,
      maxOrderQuantity: maxOrderQuantity ? parseInt(maxOrderQuantity) : 50,

      // Status flags
      isActive: isActive !== undefined ? isActive === 'true' : true,
      isAvailable: isAvailable !== undefined ? isAvailable === 'true' : true,
      isPopular: isPopular === 'true',
      isFeatured: isFeatured === 'true',
      isNewProduct: isNewProduct === 'true',

      // Local image data
      image: imageUrl,
      imageFileName: imageFileName
    };

    console.log('Creating product with data:', productData);

    const product = new Product(productData);
    await product.save();

    // Populate category info
    await product.populate('categoryId', 'name nameUz nameRu nameEn emoji');

    res.status(201).json({
      success: true,
      message: 'Mahsulot muvaffaqiyatli yaratildi!',
      data: product
    });

  } catch (error) {
    console.error('Create product error:', error);
    
    // Agar validation error bo'lsa
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Ma\'lumotlarda xatolik!',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Mahsulot yaratishda xatolik!',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Avval mahsulotni topish
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Mahsulot topilmadi!'
      });
    }

    // Agar mahsulotda rasm bo'lsa, uni o'chirish
    if (product.image || product.imageFileName) {
      try {
        let imagePath;
        
        // Image path yaratish
        if (product.imageFileName) {
          imagePath = path.join(__dirname, '../../uploads', product.imageFileName);
        } else if (product.image && product.image.startsWith('/uploads/')) {
          const fileName = product.image.replace('/uploads/', '');
          imagePath = path.join(__dirname, '../../uploads', fileName);
        }

        // Faylni o'chirish
        if (imagePath && fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log('✅ Rasm o\'chirildi:', imagePath);
        } else {
          console.log('⚠️ Rasm fayli topilmadi:', imagePath);
        }
      } catch (imageError) {
        console.error('❌ Rasmni o\'chirishda xatolik:', imageError);
        // Rasm o'chirilmasa ham, mahsulotni o'chirishda davom etish
      }
    }

    // Mahsulotni database'dan o'chirish
    await Product.findByIdAndDelete(productId);

    console.log(`✅ Mahsulot o'chirildi: ${product.name} (ID: ${productId})`);

    res.json({
      success: true,
      message: 'Mahsulot va rasm muvaffaqiyatli o\'chirildi!'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Mahsulotni o\'chirishda xatolik!',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update product
router.put('/products/:id', uploadSingle, handleUploadError, async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Avval mahsulotni topish
    const existingProduct = await Product.findById(productId);
    
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Mahsulot topilmadi!'
      });
    }

    const {
      name,
      description,
      price,
      originalPrice,
      categoryId,
      preparationTime,
      ingredients,
      allergens,
      tags,
      weight,
      unit,
      minOrderQuantity,
      maxOrderQuantity,
      isActive,
      isAvailable,
      isPopular,
      isFeatured,
      isNewProduct
    } = req.body;

    // Update data yaratish
    const updateData = {
      name: name?.trim(),
      description: description?.trim(),
      price: price ? parseFloat(price) : existingProduct.price,
      originalPrice: originalPrice ? parseFloat(originalPrice) : existingProduct.originalPrice,
      categoryId: categoryId || existingProduct.categoryId,
      preparationTime: preparationTime ? parseInt(preparationTime) : existingProduct.preparationTime,
      
      // Process arrays
      ingredients: ingredients ? 
        (typeof ingredients === 'string' ? 
          ingredients.split(',').map(i => i.trim()).filter(Boolean) : 
          ingredients) : existingProduct.ingredients,
      allergens: allergens ? 
        (typeof allergens === 'string' ? 
          allergens.split(',').map(a => a.trim()).filter(Boolean) : 
          allergens) : existingProduct.allergens,
      tags: tags ? 
        (typeof tags === 'string' ? 
          tags.split(',').map(t => t.trim()).filter(Boolean) : 
          tags) : existingProduct.tags,

      // Additional fields
      weight: weight ? parseFloat(weight) : existingProduct.weight,
      unit: unit || existingProduct.unit,
      minOrderQuantity: minOrderQuantity ? parseInt(minOrderQuantity) : existingProduct.minOrderQuantity,
      maxOrderQuantity: maxOrderQuantity ? parseInt(maxOrderQuantity) : existingProduct.maxOrderQuantity,

      // Status flags
      isActive: isActive !== undefined ? isActive === 'true' : existingProduct.isActive,
      isAvailable: isAvailable !== undefined ? isAvailable === 'true' : existingProduct.isAvailable,
      isPopular: isPopular === 'true',
      isFeatured: isFeatured === 'true',
      isNewProduct: isNewProduct === 'true',

      updatedAt: new Date()
    };

    // Agar yangi rasm yuklangan bo'lsa
    if (req.file) {
      // Eski rasmni o'chirish
      if (existingProduct.image || existingProduct.imageFileName) {
        try {
          let oldImagePath;
          
          if (existingProduct.imageFileName) {
            oldImagePath = path.join(__dirname, '../../uploads', existingProduct.imageFileName);
          } else if (existingProduct.image && existingProduct.image.startsWith('/uploads/')) {
            const fileName = existingProduct.image.replace('/uploads/', '');
            oldImagePath = path.join(__dirname, '../../uploads', fileName);
          }

          if (oldImagePath && fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log('✅ Eski rasm o\'chirildi:', oldImagePath);
          }
        } catch (deleteError) {
          console.error('❌ Eski rasmni o\'chirishda xatolik:', deleteError);
        }
      }

      // Yangi rasm ma'lumotlarini qo'shish
      updateData.image = `/uploads/${req.file.filename}`;
      updateData.imageFileName = req.file.filename;
    }

    console.log('Updating product with data:', updateData);

    // Mahsulotni yangilash
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true }
    );

    // Populate category info
    await updatedProduct.populate('categoryId', 'name nameUz nameRu nameEn emoji');

    res.json({
      success: true,
      message: 'Mahsulot muvaffaqiyatli yangilandi!',
      data: updatedProduct
    });

  } catch (error) {
    console.error('Update product error:', error);
    
    // Validation error
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Ma\'lumotlarda xatolik!',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Mahsulotni yangilashda xatolik!',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 📋 CATEGORY MANAGEMENT

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 });

    res.json({
      success: true,
      data: {
        items: categories,
        categories: categories // backward compatibility
      }
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
    const categoryData = { ...req.body };

    const category = new Category(categoryData);
    await category.save();

    res.status(201).json({
      success: true,
      message: 'Kategoriya muvaffaqiyatli yaratildi!',
      data: category
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

    const category = await Category.findByIdAndUpdate(
      id,
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
      data: category
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
    const { page = 1, limit = 15, status, orderType, dateFrom, dateTo, search } = req.query;
    const branchId = req.user.branch;

    let query = {};
    // Branch filter temporarily disabled (Order model may not have branch)
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
        { 'customerInfo.phone': { $regex: regex } },
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
});

// Orders stats
router.get('/orders/stats', async (req, res) => {
  try {
    const branchId = req.user.branch;
    
    const result = await Order.aggregate([
      { $match: {} },
      {
        $group: {
          _id: null,
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          preparing: { $sum: { $cond: [{ $eq: ['$status', 'preparing'] }, 1, 0] } },
          ready: { $sum: { $cond: [{ $eq: ['$status', 'ready'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'completed', 'picked_up', 'on_delivery']] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        }
      }
    ]);

    const stats = result[0] || { pending: 0, confirmed: 0, preparing: 0, ready: 0, delivered: 0, cancelled: 0 };

    res.json({ success: true, data: { stats } });

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

module.exports = router;