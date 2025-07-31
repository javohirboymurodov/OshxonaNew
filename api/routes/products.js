// api/routes/products.js
const express = require('express');
const { Product, Category, Branch } = require('../../models');
const { authenticateToken, requireRole, requireAdmin } = require('../middleware/auth');
const { 
  CloudinaryService, 
  uploadSingle, 
  uploadMultiple, 
  handleUploadError 
} = require('../../config/cloudinaryConfig');
const { CacheHelper } = require('../../services/cacheService');

const router = express.Router();

// GET /api/products - Get all products with pagination and caching
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const { category, branch, isActive, search } = req.query;
    
    // Build filter
    const filter = {};
    
    if (category) filter.category = category;
    if (branch) filter.branch = branch;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameUz: { $regex: search, $options: 'i' } },
        { nameRu: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter)
      .populate('category', 'name nameUz nameRu')
      .populate('branch', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: {
        items: products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
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

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name nameUz nameRu')
      .populate('branch', 'name code');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Mahsulot topilmadi!'
      });
    }

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Mahsulotni olishda xatolik!'
    });
  }
});

// POST /api/products - Create new product
// POST /api/products - Create new product with Cloudinary upload
router.post('/', authenticateToken, requireRole(['superadmin', 'admin']), uploadSingle, handleUploadError, async (req, res) => {
  try {
    const {
      name,
      nameUz,
      nameRu,
      description,
      price,
      category,
      branch,
      ingredients,
      preparationTime
    } = req.body;

    // Validation
    if (!name || !price || !category || !branch) {
      return res.status(400).json({
        success: false,
        message: 'Majburiy maydonlar: name, price, category, branch'
      });
    }

    // Check if category and branch exist
    const categoryExists = await Category.findById(category);
    const branchExists = await Branch.findById(branch);

    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Kategoriya topilmadi!'
      });
    }

    if (!branchExists) {
      return res.status(400).json({
        success: false,
        message: 'Filial topilmadi!'
      });
    }

    // Cloudinary upload
    let imageData = null;
    if (req.file) {
      console.log('📸 Uploading image to Cloudinary...', req.file.originalname);
      imageData = {
        url: req.file.path, // Cloudinary URL
        publicId: req.file.filename, // Cloudinary public ID
        originalName: req.file.originalname
      };
    }

    const product = new Product({
      name,
      nameUz: nameUz || name,
      nameRu: nameRu || name,
      description,
      price: parseFloat(price),
      category,
      branch,
      ingredients: ingredients ? ingredients.split(',').map(i => i.trim()) : [],
      preparationTime: parseInt(preparationTime) || 15,
      image: imageData ? imageData.url : undefined,
      imagePublicId: imageData ? imageData.publicId : undefined
    });

    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name nameUz nameRu')
      .populate('branch', 'name code');

    res.status(201).json({
      success: true,
      message: 'Mahsulot muvaffaqiyatli yaratildi!',
      data: populatedProduct
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Mahsulot yaratishda xatolik!'
    });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', authenticateToken, requireRole(['superadmin', 'admin']), uploadSingle, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Mahsulot topilmadi!'
      });
    }

    const updateData = { ...req.body };

    if (req.file) {
      updateData.image = `/uploads/products/${req.file.filename}`;
    }

    if (updateData.ingredients && typeof updateData.ingredients === 'string') {
      updateData.ingredients = updateData.ingredients.split(',').map(i => i.trim());
    }

    if (updateData.price) {
      updateData.price = parseFloat(updateData.price);
    }

    if (updateData.preparationTime) {
      updateData.preparationTime = parseInt(updateData.preparationTime);
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('category', 'name nameUz nameRu')
     .populate('branch', 'name code');

    res.json({
      success: true,
      message: 'Mahsulot muvaffaqiyatli yangilandi!',
      data: updatedProduct
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Mahsulotni yangilashda xatolik!'
    });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', authenticateToken, requireRole(['superadmin', 'admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Mahsulot topilmadi!'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Mahsulot muvaffaqiyatli o\'chirildi!'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Mahsulotni o\'chirishda xatolik!'
    });
  }
});

module.exports = router;