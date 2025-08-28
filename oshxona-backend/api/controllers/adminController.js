const fs = require('fs');
const path = require('path');
const { User, Product, Order, Category, Branch } = require('../../models');
const BranchProduct = require('../../models/BranchProduct');

// 📊 ADMIN DASHBOARD
async function getDashboard(req, res) {
  try {
    const adminUser = req.user;
    const branchId = adminUser.branch;
    if (!branchId) return res.status(400).json({ success: false, message: 'Admin filiala biriktirilmagan!' });
    const [ totalOrders, pendingOrders, completedOrders, totalRevenue, totalProducts, activeProducts ] = await Promise.all([
      Order.countDocuments({ branch: branchId }),
      Order.countDocuments({ branch: branchId, status: 'pending' }),
      Order.countDocuments({ branch: branchId, status: 'completed' }),
      Order.aggregate([{ $match: { branch: branchId, status: 'completed' } },{ $group: { _id: null, total: { $sum: '$totalPrice' } } }]),
      Product.countDocuments({ branch: branchId }),
      Product.countDocuments({ branch: branchId, isActive: true })
    ]);
    const recentOrders = await Order.find({ branch: branchId }).populate('user', 'firstName lastName phone').sort({ createdAt: -1 }).limit(10);
    res.json({ success: true, data: { stats: { totalOrders, pendingOrders, completedOrders, totalRevenue: totalRevenue[0]?.total || 0, totalProducts, activeProducts }, recentOrders } });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, message: 'Dashboard ma\'lumotlarini olishda xatolik!' });
  }
}

// 🏢 BRANCHES for Admin/SuperAdmin (scoped)
async function getBranches(req, res) {
  try {
    let branches;
    if (req.user.role === 'superadmin') {
      branches = await Branch.find({}).sort({ createdAt: -1 });
    } else {
      if (!req.user.branch) return res.json({ success: true, data: { branches: [] } });
      const b = await Branch.findById(req.user.branch);
      branches = b ? [b] : [];
    }
    res.json({ success: true, data: { branches } });
  } catch (error) {
    console.error('Get admin branches error:', error);
    res.status(500).json({ success: false, message: 'Filiallarni olishda xatolik!' });
  }
}

// 📦 PRODUCT MANAGEMENT
async function getProducts(req, res) {
  try {
    const { page = 1, limit = 20, category, search, branch } = req.query;
    const branchId = req.user.role === 'superadmin' ? null : req.user.branch;
    const query = {};
    if (branchId) query.$or = [{ branch: branchId }, { branch: { $exists: false } }, { branch: null }];
    // Superadmin uchun Product ro'yxatini filial bo'yicha FILTRLAMAYMIZ.
    // `branch` parametri faqat promo/chegirma hisoblash (BranchProduct) uchun ishlatiladi.
    if (category) query.categoryId = category;
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    
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
    res.status(500).json({ success: false, message: 'Mahsulotlarni olishda xatolik!' });
  }
}

async function toggleProductStatus(req, res) {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Mahsulot topilmadi!' });
    product.isActive = !product.isActive;
    await product.save();
    res.json({ success: true, message: `Mahsulot ${product.isActive ? 'faollashtirildi' : 'faolsizlashtirildi'}!`, data: { product } });
  } catch (error) {
    console.error('Toggle product status error:', error);
    res.status(500).json({ success: false, message: 'Mahsulot holatini o\'zgartirishda xatolik!' });
  }
}

async function createProduct(req, res) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Mahsulot qo\'shish faqat SuperAdmin uchun!' });
    const { name, description, price, originalPrice, categoryId, preparationTime, ingredients, allergens, tags, weight, unit, minOrderQuantity, maxOrderQuantity, isActive, isPopular, isFeatured, isNewProduct } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Mahsulot nomi kiritilishi shart!' });
    if (!price || price <= 0) return res.status(400).json({ success: false, message: 'Mahsulot narxi kiritilishi shart!' });
    if (!categoryId) return res.status(400).json({ success: false, message: 'Kategoriya tanlanishi shart!' });
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) return res.status(400).json({ success: false, message: 'Bunday kategoriya topilmadi!' });
    let imageUrl = null; let imageFileName = null;
    if (req.file) { imageUrl = `/uploads/${req.file.filename}`; imageFileName = req.file.filename; }
    const productData = {
      name: name.trim(), description: description?.trim(), price: parseFloat(price), originalPrice: originalPrice ? parseFloat(originalPrice) : undefined, categoryId,
      preparationTime: preparationTime ? parseInt(preparationTime) : 15,
      ingredients: ingredients ? (typeof ingredients === 'string' ? ingredients.split(',').map(i => i.trim()).filter(Boolean) : ingredients) : [],
      allergens: allergens ? (typeof allergens === 'string' ? allergens.split(',').map(a => a.trim()).filter(Boolean) : allergens) : [],
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags) : [],
      weight: weight ? parseFloat(weight) : undefined, unit: unit || 'portion', minOrderQuantity: minOrderQuantity ? parseInt(minOrderQuantity) : 1, maxOrderQuantity: maxOrderQuantity ? parseInt(maxOrderQuantity) : 50,
      isActive: isActive !== undefined ? isActive === 'true' : true, isPopular: isPopular === 'true', isFeatured: isFeatured === 'true', isNewProduct: isNewProduct === 'true',
      image: imageUrl, imageFileName
    };
    if (req.user.role === 'superadmin') { if (req.body.branch) productData.branch = req.body.branch; } else { productData.branch = req.user.branch || undefined; }
    const product = new Product(productData);
    await product.save();
    await product.populate('categoryId', 'name nameUz nameRu nameEn emoji');
    res.status(201).json({ success: true, message: 'Mahsulot muvaffaqiyatli yaratildi!', data: product });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: 'Ma\'lumotlarda xatolik!', errors });
    }
    res.status(500).json({ success: false, message: 'Mahsulot yaratishda xatolik!' });
  }
}

async function deleteProduct(req, res) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Mahsulotni o\'chirish faqat SuperAdmin uchun!' });
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Mahsulot topilmadi!' });
    if (product.image || product.imageFileName) {
      try {
        let imagePath;
        if (product.imageFileName) imagePath = path.join(__dirname, '../../uploads', product.imageFileName);
        else if (product.image && product.image.startsWith('/uploads/')) {
          const fileName = product.image.replace('/uploads/', '');
          imagePath = path.join(__dirname, '../../uploads', fileName);
        }
        if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      } catch (imageError) { console.error('Image delete error:', imageError); }
    }
    await Product.findByIdAndDelete(productId);
    res.json({ success: true, message: 'Mahsulot va rasm muvaffaqiyatli o\'chirildi!' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Mahsulotni o\'chirishda xatolik!' });
  }
}

async function updateProduct(req, res) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Mahsulotni tahrirlash faqat SuperAdmin uchun!' });
    const productId = req.params.id;
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) return res.status(404).json({ success: false, message: 'Mahsulot topilmadi!' });
    const { name, description, price, originalPrice, categoryId, preparationTime, ingredients, allergens, tags, weight, unit, minOrderQuantity, maxOrderQuantity, isActive, isPopular, isFeatured, isNewProduct } = req.body;
    const updateData = {
      name: name?.trim(), description: description?.trim(), price: price ? parseFloat(price) : existingProduct.price, originalPrice: originalPrice ? parseFloat(originalPrice) : existingProduct.originalPrice, categoryId: categoryId || existingProduct.categoryId, preparationTime: preparationTime ? parseInt(preparationTime) : existingProduct.preparationTime,
      ingredients: ingredients ? (typeof ingredients === 'string' ? ingredients.split(',').map(i => i.trim()).filter(Boolean) : ingredients) : existingProduct.ingredients,
      allergens: allergens ? (typeof allergens === 'string' ? allergens.split(',').map(a => a.trim()).filter(Boolean) : allergens) : existingProduct.allergens,
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags) : existingProduct.tags,
      weight: weight ? parseFloat(weight) : existingProduct.weight, unit: unit || existingProduct.unit, minOrderQuantity: minOrderQuantity ? parseInt(minOrderQuantity) : existingProduct.minOrderQuantity, maxOrderQuantity: maxOrderQuantity ? parseInt(maxOrderQuantity) : existingProduct.maxOrderQuantity,
      isActive: isActive !== undefined ? isActive === 'true' : existingProduct.isActive, isPopular: isPopular === 'true', isFeatured: isFeatured === 'true', isNewProduct: isNewProduct === 'true', updatedAt: new Date()
    };
    if (req.file) {
      try {
        let oldImagePath;
        if (existingProduct.imageFileName) oldImagePath = path.join(__dirname, '../../uploads', existingProduct.imageFileName);
        else if (existingProduct.image && existingProduct.image.startsWith('/uploads/')) {
          const fileName = existingProduct.image.replace('/uploads/', '');
          oldImagePath = path.join(__dirname, '../../uploads', fileName);
        }
        if (oldImagePath && fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      } catch (deleteError) { console.error('Delete old image error:', deleteError); }
      updateData.image = `/uploads/${req.file.filename}`;
      updateData.imageFileName = req.file.filename;
    }
    const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true, runValidators: true });
    await updatedProduct.populate('categoryId', 'name nameUz nameRu nameEn emoji');
    res.json({ success: true, message: 'Mahsulot muvaffaqiyatli yangilandi!', data: updatedProduct });
  } catch (error) {
    console.error('Update product error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, message: 'Ma\'lumotlarda xatolik!', errors });
    }
    res.status(500).json({ success: false, message: 'Mahsulotni yangilashda xatolik!' });
  }
}

// 📋 CATEGORY MANAGEMENT (admin scope)
async function getCategories(req, res) {
  try {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
    res.json({ success: true, data: { items: categories, categories } });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Kategoriyalarni olishda xatolik!' });
  }
}

async function createCategory(req, res) {
  try {
    const categoryData = { ...req.body };
    const category = new Category(categoryData);
    await category.save();
    res.status(201).json({ success: true, message: 'Kategoriya muvaffaqiyatli yaratildi!', data: category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'Kategoriya yaratishda xatolik!' });
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: 'Kategoriya topilmadi!' });
    res.json({ success: true, message: 'Kategoriya muvaffaqiyatli yangilandi!', data: category });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: 'Kategoriya yangilashda xatolik!' });
  }
}

// 📦 ORDER MANAGEMENT (admin scope)
async function getOrders(req, res) {
  try {
    const { page = 1, limit = 15, status, orderType, dateFrom, dateTo, search } = req.query;
    const query = {};
    
    // Debug: Admin user ma'lumotlarini ko'rish
    console.log('🔍 Admin user info:', {
      userId: req.user.userId || req.user.id,
      role: req.user.role,
      branch: req.user.branch,
      branchType: typeof req.user.branch
    });
    
    // Adminlar faqat o'z filialidagi buyurtmalarni ko'rishi kerak
    if (req.user.role === 'admin' && req.user.branch) {
      query.branchId = req.user.branch;
    }
    // Superadmin barcha filiallarni ko'ra oladi (branch filter yo'q)
    
    if (status && status !== 'all') query.status = status;
    if (orderType && orderType !== 'all') query.orderType = orderType;
    if (dateFrom || dateTo) { query.createdAt = {}; if (dateFrom) query.createdAt.$gte = new Date(dateFrom); if (dateTo) query.createdAt.$lte = new Date(dateTo); }
    if (search && String(search).trim().length > 0) {
      const text = String(search).trim();
      const regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [ { orderId: { $regex: regex } }, { orderNumber: { $regex: regex } }, { 'customerInfo.name': { $regex: regex } }, { 'customerInfo.phone': { $regex: regex } } ];
    }
    
    console.log('🔍 Orders query with branch filter:', JSON.stringify(query));
    
    // Debug: Database dagi barcha branchId larni ko'rish
    const allBranchIds = await Order.distinct('branchId');
    console.log('📋 All branchIds in database:', allBranchIds);
    
    // Debug: Jami orders soni
    const totalOrdersCount = await Order.countDocuments({});
    console.log(`📊 Total orders in database: ${totalOrdersCount}`);
    
    // Debug: Birinchi 3 ta order ni ko'rish
    const sampleOrders = await Order.find({}).limit(3).select('_id branchId status orderNumber');
    console.log('📋 Sample orders:', sampleOrders);
    
    // Debug: Agar admin bo'lsa, bu branch uchun orders borligini tekshirish
    if (req.user.role === 'admin' && req.user.branch) {
      const directCount = await Order.countDocuments({ branchId: req.user.branch });
      console.log(`🔎 Direct count for branchId "${req.user.branch}": ${directCount}`);
    }
    
    const orders = await Order.find(query).populate('user', 'firstName lastName phone').populate('items.product', 'name price').sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await Order.countDocuments(query);
    console.log(`📊 Found ${orders.length} orders out of ${total} total for this branch`);
    res.json({ success: true, data: { orders, pagination: { current: parseInt(page), pageSize: parseInt(limit), total, pages: Math.ceil(total / limit) } } });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Buyurtmalarni olishda xatolik!' });
  }
}

async function getOrdersStats(req, res) {
  try {
    const matchQuery = {};
    
    // Adminlar faqat o'z filialidagi buyurtma statistikasini ko'rishi kerak
    if (req.user.role === 'admin' && req.user.branch) {
      matchQuery.branchId = req.user.branch;
    }
    // Superadmin barcha filiallarni ko'ra oladi
    
    console.log('🔍 Stats query with branch filter:', JSON.stringify(matchQuery));
    const result = await Order.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }, confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } }, preparing: { $sum: { $cond: [{ $eq: ['$status', 'preparing'] }, 1, 0] } }, ready: { $sum: { $cond: [{ $eq: ['$status', 'ready'] }, 1, 0] } }, delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'completed', 'picked_up', 'on_delivery']] }, 1, 0] } }, cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } } } }
    ]);
    const stats = result[0] || { pending: 0, confirmed: 0, preparing: 0, ready: 0, delivered: 0, cancelled: 0 };
    res.json({ success: true, data: { stats } });
  } catch (error) {
    console.error('Orders stats error:', error);
    res.status(500).json({ success: false, message: 'Buyurtma statistikasini olishda xatolik!' });
  }
}

// ⚙️ SETTINGS
async function getSettings(req, res) {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ success: false, message: 'Sozlamalar faqat SuperAdmin uchun!' });
    res.json({ success: true, data: { appSettings: { restaurantName: 'Oshxona', currency: 'UZS', timezone: 'Asia/Tashkent' }, notifications: { newOrderNotification: true, orderStatusNotification: true } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Sozlamalarni olishda xatolik!' });
  }
}

// 🧾 INVENTORY (Branch-Product state)
async function updateInventory(req, res) {
  try {
    const { branchId, productId } = req.params;
    const { isAvailable, priceOverride } = req.body;
    if (req.user.role === 'admin' && String(req.user.branch) !== String(branchId)) return res.status(403).json({ success: false, message: 'Ushbu filial uchun ruxsat yo\'q' });
    const product = await Product.findById(productId).select('_id isActive');
    if (!product) return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });
    const update = {};
    if (isAvailable !== undefined) update.isAvailable = !!isAvailable;
    if (priceOverride !== undefined) update.priceOverride = priceOverride === null ? null : Number(priceOverride);
    const inv = await BranchProduct.findOneAndUpdate({ branch: branchId, product: productId }, { $set: update, $setOnInsert: { branch: branchId, product: productId } }, { new: true, upsert: true });
    res.json({ success: true, message: 'Inventar yangilandi', data: inv });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ success: false, message: 'Inventarni yangilashda xatolik' });
  }
}

async function getInventory(req, res) {
  try {
    const { branchId } = req.params;
    const productIdsParam = req.query.productIds;
    if (req.user.role === 'admin' && String(req.user.branch) !== String(branchId)) return res.status(403).json({ success: false, message: 'Ushbu filial uchun ruxsat yo\'q' });
    const filter = { branch: branchId };
    if (productIdsParam) {
      let ids = [];
      if (Array.isArray(productIdsParam)) ids = productIdsParam;
      else if (typeof productIdsParam === 'string') ids = productIdsParam.split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length > 0) filter.product = { $in: ids };
    }
    const list = await BranchProduct.find(filter).select('product isAvailable priceOverride');
    res.json({ success: true, data: { items: list } });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ success: false, message: 'Inventarni olishda xatolik' });
  }
}

module.exports = {
  getDashboard,
  getBranches,
  getProducts,
  toggleProductStatus,
  createProduct,
  deleteProduct,
  updateProduct,
  getCategories,
  createCategory,
  updateCategory,
  getOrders,
  getOrdersStats,
  getSettings,
  updateInventory,
  getInventory,
};


