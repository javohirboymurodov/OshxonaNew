const express = require('express');
const { authenticateToken, requireAdmin, requireRole } = require('../middleware/auth');
const AdminController = require('../controllers/adminController');
const { uploadSingle, handleUploadError } = require('../../config/localUploadConfig');
const Branch = require('../../models/Branch');
const Product = require('../../models/Product');
const BranchProduct = require('../../models/BranchProduct');
// remove incorrect auth import; we use authenticateToken/requireRole/requireAdmin

const router = express.Router();

// Apply Admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// ==============================================
// 📊 ADMIN DASHBOARD
// ==============================================

// Dashboard stats for specific branch
router.get('/dashboard', AdminController.getDashboard);

// Admin branches listing (admin → only own branch, superadmin → all)
router.get('/branches', AdminController.getBranches);

// ==============================================
// 📦 PRODUCT MANAGEMENT
// ==============================================

// Get products for admin's branch
router.get('/products', AdminController.getProducts);

// Toggle product active status
router.patch('/products/:id/toggle-status', AdminController.toggleProductStatus);

// Create product
router.post('/products', uploadSingle, handleUploadError, AdminController.createProduct);

// Delete product
router.delete('/products/:id', AdminController.deleteProduct);

// Update product
router.put('/products/:id', uploadSingle, handleUploadError, AdminController.updateProduct);

// 📋 CATEGORY MANAGEMENT

// Get categories
router.get('/categories', AdminController.getCategories);

// Create category
router.post('/categories', AdminController.createCategory);

// Update category
router.put('/categories/:id', AdminController.updateCategory);

// ==============================================
// 📦 ORDER MANAGEMENT
// ==============================================

// Get orders for admin's branch
router.get('/orders', AdminController.getOrders);

// Orders stats
router.get('/orders/stats', AdminController.getOrdersStats);

// Settings routes
router.get('/settings', AdminController.getSettings);

// ==============================
// 📦 INVENTORY (BRANCH-PRODUCT)
// ==============================
// Filial bo'yicha mahsulot availability/inventar boshqaruvi
// PATCH /api/admin/branches/:branchId/products/:productId
router.patch('/branches/:branchId/products/:productId', AdminController.updateInventory);

// GET inventory for a branch (optionally filter by productIds)
router.get('/branches/:branchId/inventory', AdminController.getInventory);

// Promo/discount endpoints for BranchProduct
router.patch('/branches/:branchId/products/:productId/promo', requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { branchId, productId } = req.params;
    const { discountType, discountValue, promoStart, promoEnd, isPromoActive } = req.body;

    // Filial va mahsulot mavjudligini tekshirish
    const [branch, product] = await Promise.all([
      Branch.findById(branchId),
      Product.findById(productId)
    ]);

    if (!branch || !product) {
      return res.status(404).json({ success: false, message: 'Filial yoki mahsulot topilmadi!' });
    }

    // BranchProduct ni topish yoki yaratish
    let branchProduct = await BranchProduct.findOne({ branch: branchId, product: productId });
    
    if (!branchProduct) {
      branchProduct = new BranchProduct({
        branch: branchId,
        product: productId,
        isAvailable: true
      });
    }

    // Promo ma'lumotlarini yangilash
    branchProduct.discountType = discountType;
    branchProduct.discountValue = discountValue;
    branchProduct.promoStart = promoStart;
    branchProduct.promoEnd = promoEnd;
    branchProduct.isPromoActive = isPromoActive;

    await branchProduct.save();

    res.json({ success: true, message: 'Promo muvaffaqiyatli yangilandi!' });
  } catch (error) {
    console.error('Promo update error:', error);
    res.status(500).json({ success: false, message: 'Promo yangilashda xatolik!' });
  }
});

// Barcha filiallarga promo qo'llash (superadmin uchun)
router.post('/products/:productId/promo-all-branches', requireRole(['superadmin']), async (req, res) => {
  try {
    const { productId } = req.params;
    const { discountType, discountValue, promoStart, promoEnd, isPromoActive } = req.body;

    // Mahsulot mavjudligini tekshirish
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi!' });
    }

    // Barcha faol filiallarni topish
    const branches = await Branch.find({ isActive: true });
    
    // Har bir filial uchun BranchProduct yaratish yoki yangilash
    const operations = branches.map(branch => {
      return BranchProduct.findOneAndUpdate(
        { branch: branch._id, product: productId },
        {
          discountType,
          discountValue,
          promoStart,
          promoEnd,
          isPromoActive,
          isAvailable: true
        },
        { upsert: true, new: true }
      );
    });

    await Promise.all(operations);

    res.json({ 
      success: true, 
      message: `${branches.length} ta filialga promo muvaffaqiyatli qo'llandi!` 
    });
  } catch (error) {
    console.error('Promo all branches error:', error);
    res.status(500).json({ success: false, message: 'Barcha filiallarga promo qo\'llashda xatolik!' });
  }
});

module.exports = router;