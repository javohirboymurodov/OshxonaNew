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

    // Search functionality
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { nameRu: { $regex: search.trim(), $options: 'i' } },
        { nameEn: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const categories = await Category.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Category.countDocuments(query);

    // Har bir kategoriya uchun mahsulotlar sonini olish
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({
          categoryId: category._id,
          isActive: true
        });
        
        return {
          ...category.toObject(),
          productCount
        };
      })
    );

    res.json({
      success: true,
      data: {
        items: categoriesWithCount,
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
      category: category._id,
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
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      nameRu, 
      nameEn, 
      emoji, 
      description, 
      descriptionRu, 
      descriptionEn,
      sortOrder
    } = req.body;

    // Nom tekshirish
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Kategoriya nomi kamida 2 ta belgidan iborat bo\'lishi kerak!'
      });
    }

    // Takroriy nom tekshirish
    const existingCategory = await Category.findOne({
      name: name.trim()
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Bu nomli kategoriya allaqachon mavjud!'
      });
    }

    // Tartib raqami (agar berilmagan bo'lsa, oxirgi bo'lsin)
    let orderNumber = parseInt(sortOrder) || 0;
    if (!orderNumber) {
      const lastCategory = await Category.findOne()
        .sort({ sortOrder: -1 });
      orderNumber = lastCategory ? lastCategory.sortOrder + 1 : 1;
    }

    const category = new Category({
      name: name.trim(),
      nameRu: nameRu?.trim() || '',
      nameEn: nameEn?.trim() || '',
      emoji: emoji?.trim() || '🍽️',
      description: description?.trim() || '',
      descriptionRu: descriptionRu?.trim() || '',
      descriptionEn: descriptionEn?.trim() || '',
      sortOrder: orderNumber,
      isActive: true,
      isVisible: true,
      stats: {
        totalProducts: 0,
        totalOrders: 0,
        totalViews: 0
      }
    });

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
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      nameRu, 
      nameEn, 
      emoji, 
      description, 
      descriptionRu, 
      descriptionEn,
      sortOrder,
      isActive,
      isVisible
    } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategoriya topilmadi!'
      });
    }

    // Nom tekshirish
    if (name && name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Kategoriya nomi kamida 2 ta belgidan iborat bo\'lishi kerak!'
      });
    }

    // Takroriy nom tekshirish (o'zidan boshqasi bilan)
    if (name && name.trim() !== category.name) {
      const existingCategory = await Category.findOne({
        name: name.trim(),
        _id: { $ne: id }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Bu nomli kategoriya allaqachon mavjud!'
        });
      }
    }

    // Yangilanishi kerak bo'lgan maydonlar
    const updateData = {};
    
    if (name) updateData.name = name.trim();
    if (nameRu !== undefined) updateData.nameRu = nameRu.trim();
    if (nameEn !== undefined) updateData.nameEn = nameEn.trim();
    if (emoji) updateData.emoji = emoji.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (descriptionRu !== undefined) updateData.descriptionRu = descriptionRu.trim();
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn.trim();
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder) || category.sortOrder;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (isVisible !== undefined) updateData.isVisible = Boolean(isVisible);

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updateData,
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
      message: 'Kategoriyani yangilashda xatolik!'
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
        { category: id },
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
      category: id,
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
            foreignField: 'category',
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