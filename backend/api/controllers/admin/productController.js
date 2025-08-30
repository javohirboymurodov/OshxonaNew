const { Product, Category } = require('../../../models');
const BranchProduct = require('../../../models/BranchProduct');
const fs = require('fs');
const path = require('path');

/**
 * Admin Product Controller
 * Admin mahsulot operatsiyalari
 */

/**
 * Mahsulotlar ro'yxatini olish
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getProducts(req, res) {
  try {
    const { page = 1, limit = 20, category, search, branch } = req.query;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    const query = {};
    
    if (branchId) {
      query.$or = [
        { branch: branchId }, 
        { branch: { $exists: false } }, 
        { branch: null }
      ];
    }
    
    // Superadmin uchun Product ro'yxatini filial bo'yicha FILTRLAMAYMIZ.
    // `branch` parametri faqat promo/chegirma hisoblash (BranchProduct) uchun ishlatiladi.
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
    
    // Promo ma'lumotlarini qo'shish
    const productIds = products.map(p => p._id);
    const targetBranch = branch || branchId || (req.user.role === 'superadmin' ? null : req.user.branch);
    
    let branchProducts = [];
    if (targetBranch) {
      branchProducts = await BranchProduct.find({
        product: { $in: productIds },
        branch: targetBranch
      }).select('product discountType discountValue promoStart promoEnd isPromoActive');
    }
    
    // Promo ma'lumotlarini product'larga birlashtirish
    const productsWithPromo = products.map(product => {
      const branchProduct = branchProducts.find(bp => bp.product.toString() === product._id.toString());
      console.log(`🔍 Product ${product.name} (${product._id}):`, {
        hasBranchProduct: !!branchProduct,
        branchProduct: branchProduct ? {
          discountType: branchProduct.discountType,
          discountValue: branchProduct.discountValue,
          isPromoActive: branchProduct.isPromoActive
        } : null
      });

      if (branchProduct && branchProduct.isPromoActive && branchProduct.discountType && branchProduct.discountValue) {
        const discount = {
          type: branchProduct.discountType,
          value: branchProduct.discountValue
        };

        // Hisoblangan chegirma narxi
        const basePrice = Number(product.price) || 0;
        const discountedPrice = discount.type === 'percent'
          ? Math.max(0, Math.round(basePrice * (1 - discount.value / 100)))
          : Math.max(0, Math.round(basePrice - discount.value));

        console.log(`✅ Promo applied to ${product.name}:`, {
          basePrice,
          discount,
          discountedPrice
        });

        return {
          ...product.toObject(),
          price: discountedPrice,          // joriy ko'rsatiladigan narx
          originalPrice: basePrice,        // ustiga chizilishi uchun
          discount
        };
      }
      return product.toObject();
    });
    
    const total = await Product.countDocuments(query);
    res.json({ 
      success: true, 
      data: { 
        items: productsWithPromo, 
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
}

/**
 * Mahsulot holatini o'zgartirish (active/inactive)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function toggleProductStatus(req, res) {
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
}

/**
 * Yangi mahsulot yaratish
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function createProduct(req, res) {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Mahsulot qo\'shish faqat SuperAdmin uchun!' 
      });
    }
    
    const { 
      name, description, price, originalPrice, categoryId, preparationTime, 
      ingredients, allergens, tags, weight, unit, minOrderQuantity, 
      maxOrderQuantity, isActive, isPopular, isFeatured, isNewProduct 
    } = req.body;
    
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
    
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bunday kategoriya topilmadi!' 
      });
    }
    
    let imageUrl = null;
    let imageFileName = null;
    if (req.file) { 
      imageUrl = `/uploads/${req.file.filename}`; 
      imageFileName = req.file.filename; 
    }
    
    const productData = {
      name: name.trim(), 
      description: description?.trim(), 
      price: parseFloat(price), 
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined, 
      categoryId,
      preparationTime: preparationTime ? parseInt(preparationTime) : 15,
      ingredients: ingredients ? (typeof ingredients === 'string' ? ingredients.split(',').map(i => i.trim()).filter(Boolean) : ingredients) : [],
      allergens: allergens ? (typeof allergens === 'string' ? allergens.split(',').map(a => a.trim()).filter(Boolean) : allergens) : [],
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags) : [],
      weight: weight ? parseFloat(weight) : undefined, 
      unit: unit || 'portion', 
      minOrderQuantity: minOrderQuantity ? parseInt(minOrderQuantity) : 1, 
      maxOrderQuantity: maxOrderQuantity ? parseInt(maxOrderQuantity) : 50,
      isActive: isActive !== undefined ? isActive === 'true' : true, 
      isPopular: isPopular === 'true', 
      isFeatured: isFeatured === 'true', 
      isNewProduct: isNewProduct === 'true',
      image: imageUrl, 
      imageFileName
    };
    
    if (req.user.role === 'superadmin') { 
      if (req.body.branch) productData.branch = req.body.branch; 
    } else { 
      productData.branch = req.user.branch || undefined; 
    }
    
    const product = new Product(productData);
    await product.save();
    await product.populate('categoryId', 'name nameUz nameRu nameEn emoji');
    
    res.status(201).json({ 
      success: true, 
      message: 'Mahsulot muvaffaqiyatli yaratildi!', 
      data: product 
    });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Ma\'lumotlarda xatolik!', 
        errors 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Mahsulot yaratishda xatolik!' 
    });
  }
}

/**
 * Mahsulotni o'chirish
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function deleteProduct(req, res) {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Mahsulotni o\'chirish faqat SuperAdmin uchun!' 
      });
    }
    
    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Mahsulot topilmadi!' 
      });
    }
    
    // Rasm faylini o'chirish
    if (product.image || product.imageFileName) {
      try {
        let imagePath;
        if (product.imageFileName) {
          imagePath = path.join(__dirname, '../../../uploads', product.imageFileName);
        } else if (product.image && product.image.startsWith('/uploads/')) {
          const fileName = product.image.replace('/uploads/', '');
          imagePath = path.join(__dirname, '../../../uploads', fileName);
        }
        
        if (imagePath && fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (imageError) { 
        console.error('Image delete error:', imageError); 
      }
    }
    
    await Product.findByIdAndDelete(productId);
    
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
}

/**
 * Mahsulotni yangilash
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function updateProduct(req, res) {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Mahsulotni tahrirlash faqat SuperAdmin uchun!' 
      });
    }
    
    const productId = req.params.id;
    const existingProduct = await Product.findById(productId);
    
    if (!existingProduct) {
      return res.status(404).json({ 
        success: false, 
        message: 'Mahsulot topilmadi!' 
      });
    }
    
    const { 
      name, description, price, originalPrice, categoryId, preparationTime, 
      ingredients, allergens, tags, weight, unit, minOrderQuantity, 
      maxOrderQuantity, isActive, isPopular, isFeatured, isNewProduct 
    } = req.body;
    
    const updateData = {
      name: name?.trim(), 
      description: description?.trim(), 
      price: price ? parseFloat(price) : existingProduct.price, 
      originalPrice: originalPrice ? parseFloat(originalPrice) : existingProduct.originalPrice, 
      categoryId: categoryId || existingProduct.categoryId, 
      preparationTime: preparationTime ? parseInt(preparationTime) : existingProduct.preparationTime,
      ingredients: ingredients ? (typeof ingredients === 'string' ? ingredients.split(',').map(i => i.trim()).filter(Boolean) : ingredients) : existingProduct.ingredients,
      allergens: allergens ? (typeof allergens === 'string' ? allergens.split(',').map(a => a.trim()).filter(Boolean) : allergens) : existingProduct.allergens,
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags) : existingProduct.tags,
      weight: weight ? parseFloat(weight) : existingProduct.weight, 
      unit: unit || existingProduct.unit, 
      minOrderQuantity: minOrderQuantity ? parseInt(minOrderQuantity) : existingProduct.minOrderQuantity, 
      maxOrderQuantity: maxOrderQuantity ? parseInt(maxOrderQuantity) : existingProduct.maxOrderQuantity,
      isActive: isActive !== undefined ? isActive === 'true' : existingProduct.isActive, 
      isPopular: isPopular === 'true', 
      isFeatured: isFeatured === 'true', 
      isNewProduct: isNewProduct === 'true'
    };
    
    // Rasm yangilanishi
    if (req.file) {
      // Eski rasmni o'chirish
      if (existingProduct.imageFileName) {
        try {
          const oldImagePath = path.join(__dirname, '../../../uploads', existingProduct.imageFileName);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        } catch (imageError) { 
          console.error('Old image delete error:', imageError); 
        }
      }
      
      updateData.image = `/uploads/${req.file.filename}`;
      updateData.imageFileName = req.file.filename;
    }
    
    const product = await Product.findByIdAndUpdate(productId, updateData, { 
      new: true, 
      runValidators: true 
    }).populate('categoryId', 'name nameUz nameRu nameEn emoji');
    
    res.json({ 
      success: true, 
      message: 'Mahsulot muvaffaqiyatli yangilandi!', 
      data: product 
    });
  } catch (error) {
    console.error('Update product error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Ma\'lumotlarda xatolik!', 
        errors 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Mahsulot yangilashda xatolik!' 
    });
  }
}

module.exports = {
  getProducts,
  toggleProductStatus,
  createProduct,
  deleteProduct,
  updateProduct
};