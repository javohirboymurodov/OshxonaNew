const express = require('express');
const CategoriesController = require('../controllers/categoriesController');
const { Category } = require('../../models');
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

// Get all categories with pagination (migrated to controller)
router.get('/', CategoriesController.list);

router.get('/:id', CategoriesController.getOne);

// Create new category
router.post('/', authenticateToken, requireAdmin, CategoriesController.create);

// Update category
router.put('/:id', authenticateToken, requireAdmin, CategoriesController.update);

// Toggle category status
router.patch('/:id/toggle-status', CategoriesController.toggleStatus);

// Toggle category visibility
router.patch('/:id/toggle-visibility', CategoriesController.toggleVisibility);

// Delete category
router.delete('/:id', CategoriesController.remove);

// Reorder categories
router.post('/reorder', CategoriesController.reorder);

// Update category stats (mahsulot qo'shilganda ishlatiladi)
router.patch('/:id/update-stats', CategoriesController.updateStats);

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