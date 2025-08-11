const express = require('express');
const { Category, Product } = require('../../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public routes (authentication kerak emas)
// Get all active categories (bot va frontend uchun)
router.get('/public', async (req, res) => {
  try {
    const categories = await Category.find({ 
      isActive: true,
      isVisible: true 
    })
    .select('name nameRu nameEn emoji description descriptionRu descriptionEn sortOrder')
    .sort({ sortOrder: 1, createdAt: -1 });

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Get public categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriyalarni olishda xatolik!'
    });
  }
});

// Admin routes (authentication kerak)
router.use(authenticateToken);
router.use(requireAdmin);

// Get all categories with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 15, search } = req.query;

    let query = {};
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { nameUz: { $regex: search.trim(), $options: 'i' } },
        { nameRu: { $regex: search.trim(), $options: 'i' } },
        { nameEn: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const categories = await Category.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Category.countDocuments(query);

    // 🔥 REAL-TIME STATISTICS CALCULATION
    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        // Real-time product count
        const [totalProducts, activeProducts] = await Promise.all([
          Product.countDocuments({ categoryId: category._id }),
          Product.countDocuments({ categoryId: category._id, isActive: true })
        ]);

        // Real-time order stats (agar Order model mavjud bo'lsa)
        let totalOrders = 0;
        let totalRevenue = 0;
        try {
          const Order = require('../../models/Order');
          const orderStats = await Order.aggregate([
            {
              $unwind: '$items'
            },
            {
              $lookup: {
                from: 'products',
                localField: 'items.product',
                foreignField: '_id',
                as: 'productInfo'
              }
            },
            {
              $unwind: '$productInfo'
            },
            {
              $match: {
                'productInfo.categoryId': category._id,
                status: 'completed'
              }
            },
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$items.totalPrice' }
              }
            }
          ]);

          if (orderStats.length > 0) {
            totalOrders = orderStats[0].totalOrders;
            totalRevenue = orderStats[0].totalRevenue;
          }
        } catch (error) {
          // Order model mavjud emas, default values
          console.log('Order model not found, using default values');
        }

        // Stats yangilash (agar farq bo'lsa)
        const needsUpdate = (
          category.stats.totalProducts !== totalProducts ||
          category.stats.activeProducts !== activeProducts ||
          category.stats.totalOrders !== totalOrders
        );

        if (needsUpdate) {
          await Category.findByIdAndUpdate(category._id, {
            'stats.totalProducts': totalProducts,
            'stats.activeProducts': activeProducts,
            'stats.totalOrders': totalOrders,
            'stats.totalRevenue': totalRevenue,
            'stats.popularityScore': totalOrders * 0.4 + category.stats.totalViews * 0.3 + activeProducts * 0.3
          });
        }

        return {
          ...category.toObject(),
          // Real-time ma'lumotlar
          currentStats: {
            totalProducts,
            activeProducts,
            totalOrders,
            totalRevenue,
            totalViews: category.stats.totalViews || 0,
            popularityScore: Math.round(totalOrders * 0.4 + (category.stats.totalViews || 0) * 0.3 + activeProducts * 0.3)
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        items: categoriesWithStats,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
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

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategoriya topilmadi!'
      });
    }

    // Kategoriya ichidagi mahsulotlar sonini olish
    const productCount = await Product.countDocuments({
      categoryId: category._id,
      isActive: true
    });

    res.json({
      success: true,
      data: {
        ...category.toObject(),
        productCount
      }
    });

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriyani olishda xatolik!'
    });
  }
});

// Create new category
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, nameUz, nameRu, nameEn, emoji, description, isActive, sortOrder } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Kategoriya nomi kiritilishi shart!'
      });
    }

    if (!nameUz || !nameUz.trim()) {
      return res.status(400).json({
        success: false,
        message: 'O\'zbek tilida nom kiritilishi shart!'
      });
    }

    // Check if category with same name exists
    const existingCategory = await Category.findOne({
      $or: [
        { name: name.trim() },
        { nameUz: nameUz.trim() }
      ]
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Bunday nomli kategoriya allaqachon mavjud!'
      });
    }

    // Create category
    const categoryData = {
      name: name.trim(),
      nameUz: nameUz.trim(),
      nameRu: nameRu?.trim() || '',
      nameEn: nameEn?.trim() || '',
      emoji: emoji || '🍽️',
      description: description?.trim() || '',
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0
    };

    const category = await Category.create(categoryData);

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
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, nameUz, nameRu, nameEn, emoji, description, isActive, sortOrder } = req.body;

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategoriya topilmadi!'
      });
    }

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Kategoriya nomi kiritilishi shart!'
      });
    }

    if (!nameUz || !nameUz.trim()) {
      return res.status(400).json({
        success: false,
        message: 'O\'zbek tilida nom kiritilishi shart!'
      });
    }

    // Check for duplicate names (excluding current category)
    const existingCategory = await Category.findOne({
      _id: { $ne: id },
      $or: [
        { name: name.trim() },
        { nameUz: nameUz.trim() }
      ]
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Bunday nomli kategoriya allaqachon mavjud!'
      });
    }

    // Update category
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        nameUz: nameUz.trim(),
        nameRu: nameRu?.trim() || '',
        nameEn: nameEn?.trim() || '',
        emoji: emoji || category.emoji,
        description: description?.trim() || '',
        isActive: isActive !== undefined ? isActive : category.isActive,
        sortOrder: sortOrder !== undefined ? sortOrder : category.sortOrder
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Kategoriya muvaffaqiyatli yangilandi!',
      data: updatedCategory
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriya yangilashda xatolik!'
    });
  }
});

// Toggle category status
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategoriya topilmadi!'
      });
    }

    category.isActive = !category.isActive;
    await category.save();

    // Agar kategoriya o'chirilayotgan bo'lsa, uning mahsulotlarini ham o'chirish
    if (!category.isActive) {
      await Product.updateMany(
        { categoryId: id },
        { isActive: false }
      );
    }

    res.json({
      success: true,
      message: `Kategoriya ${category.isActive ? 'faollashtirildi' : 'o\'chirildi'}!`,
      data: category
    });

  } catch (error) {
    console.error('Toggle category status error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriya holatini o\'zgartirishda xatolik!'
    });
  }
});

// Toggle category visibility
router.patch('/:id/toggle-visibility', async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategoriya topilmadi!'
      });
    }

    category.isVisible = !category.isVisible;
    await category.save();

    res.json({
      success: true,
      message: `Kategoriya ${category.isVisible ? 'ko\'rinadigan' : 'yashirildi'}!`,
      data: category
    });

  } catch (error) {
    console.error('Toggle category visibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriya ko\'rinishini o\'zgartirishda xatolik!'
    });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategoriya topilmadi!'
      });
    }

    // Kategoriyada mahsulotlar bor-yo'qligini tekshirish
    const productCount = await Product.countDocuments({
      categoryId: id,
      isActive: true
    });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Bu kategoriyada ${productCount} ta faol mahsulot mavjud. Avval mahsulotlarni o'chiring yoki boshqa kategoriyaga o'tkazing!`
      });
    }

    await Category.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Kategoriya muvaffaqiyatli o\'chirildi!'
    });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriyani o\'chirishda xatolik!'
    });
  }
});

// Reorder categories
router.post('/reorder', async (req, res) => {
  try {
    const { categoryIds } = req.body;

    if (!Array.isArray(categoryIds)) {
      return res.status(400).json({
        success: false,
        message: 'Kategoriya ID\'lari array bo\'lishi kerak!'
      });
    }

    // Batch update qilish
    const updatePromises = categoryIds.map((categoryId, index) =>
      Category.findByIdAndUpdate(
        categoryId,
        { sortOrder: index + 1 }
      )
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Kategoriyalar tartibi yangilandi!'
    });

  } catch (error) {
    console.error('Reorder categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriyalar tartibini yangilashda xatolik!'
    });
  }
});

// Update category stats (mahsulot qo'shilganda ishlatiladi)
router.patch('/:id/update-stats', async (req, res) => {
  try {
    const { id } = req.params;
    const { totalProducts, totalOrders, totalViews } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategoriya topilmadi!'
      });
    }

    const updateData = {};
    if (totalProducts !== undefined) updateData['stats.totalProducts'] = totalProducts;
    if (totalOrders !== undefined) updateData['stats.totalOrders'] = totalOrders;
    if (totalViews !== undefined) updateData['stats.totalViews'] = totalViews;

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { $inc: updateData },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Kategoriya statistikasi yangilandi!',
      data: updatedCategory
    });

  } catch (error) {
    console.error('Update category stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriya statistikasini yangilashda xatolik!'
    });
  }
});

// Get category statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const [
      total,
      active,
      inactive,
      visible,
      hidden,
      categoriesWithProducts
    ] = await Promise.all([
      Category.countDocuments(),
      Category.countDocuments({ isActive: true }),
      Category.countDocuments({ isActive: false }),
      Category.countDocuments({ isVisible: true }),
      Category.countDocuments({ isVisible: false }),
      Category.aggregate([
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: 'categoryId',
            as: 'products'
          }
        },
        {
          $addFields: {
            productCount: { $size: '$products' },
            activeProductCount: {
              $size: {
                $filter: {
                  input: '$products',
                  cond: { $eq: ['$$this.isActive', true] }
                }
              }
            }
          }
        },
        {
          $project: {
            name: 1,
            emoji: 1,
            productCount: 1,
            activeProductCount: 1,
            isActive: 1,
            isVisible: 1,
            stats: 1
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          total,
          active,
          inactive,
          visible,
          hidden,
          withProducts: categoriesWithProducts.filter(cat => cat.productCount > 0).length,
          empty: categoriesWithProducts.filter(cat => cat.productCount === 0).length
        },
        categoriesWithProducts
      }
    });

  } catch (error) {
    console.error('Category stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriya statistikasini olishda xatolik!'
    });
  }
});

module.exports = router;