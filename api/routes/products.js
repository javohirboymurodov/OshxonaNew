// api/routes/products.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { Product, Category, Branch } = require('../../models');
const { authenticateToken, requireRole, requireAdmin } = require('../middleware/auth');

// Local upload config'dan import qilish
const { 
  uploadSingle, 
  uploadMultiple, 
  handleUploadError 
} = require('../../config/localUploadConfig');

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
    
    if (category) filter.categoryId = category;
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
      .populate('categoryId', 'name nameUz nameRu emoji')
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
      .populate('categoryId', 'name nameUz nameRu emoji')
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

// POST /api/products - Create new product with local upload
router.post('/', authenticateToken, requireRole(['superadmin', 'admin']), uploadSingle, handleUploadError, async (req, res) => {
  try {
    const {
      name,
      nameUz,
      nameRu,
      description,
      price,
      categoryId, // Bu admin.js bilan mos kelishi kerak
      branch,
      ingredients,
      preparationTime
    } = req.body;

    console.log('Products route - received data:', req.body);
    console.log('Products route - received file:', req.file);

    // Validation
    if (!name || !price || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Majburiy maydonlar: name, price, categoryId'
      });
    }

    // Check if category exists
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Kategoriya topilmadi!'
      });
    }

    // Local image upload handling
    let imageUrl = null;
    let imageFileName = null;
    
    if (req.file) {
      console.log('📸 Local image uploaded:', req.file.filename);
      imageUrl = `/uploads/${req.file.filename}`;
      imageFileName = req.file.filename;
    }

    const product = new Product({
      name,
      nameUz: nameUz || name,
      nameRu: nameRu || name,
      description,
      price: parseFloat(price),
      categoryId, // To'g'ri field nomi
      branch,
      ingredients: ingredients ? ingredients.split(',').map(i => i.trim()) : [],
      preparationTime: parseInt(preparationTime) || 15,
      image: imageUrl,
      imageFileName: imageFileName
    });

    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('categoryId', 'name nameUz nameRu emoji')
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

// PUT /api/products/:id - Update product with image replacement
router.put('/:id', authenticateToken, requireRole(['superadmin', 'admin']), uploadSingle, async (req, res) => {
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

    const updateData = { ...req.body };

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

    // Process arrays and numbers
    if (updateData.ingredients && typeof updateData.ingredients === 'string') {
      updateData.ingredients = updateData.ingredients.split(',').map(i => i.trim());
    }

    if (updateData.price) {
      updateData.price = parseFloat(updateData.price);
    }

    if (updateData.preparationTime) {
      updateData.preparationTime = parseInt(updateData.preparationTime);
    }

    // Mahsulotni yangilash
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true }
    ).populate('categoryId', 'name nameUz nameRu emoji')
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

// DELETE /api/products/:id - Delete product with image
router.delete('/:id', authenticateToken, requireRole(['superadmin', 'admin']), async (req, res) => {
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
      message: 'Mahsulotni o\'chirishda xatolik!'
    });
  }
});

module.exports = router;