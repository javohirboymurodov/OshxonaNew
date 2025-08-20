const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const AdminController = require('../controllers/adminController');
const { uploadSingle, handleUploadError } = require('../../config/localUploadConfig');

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
router.patch('/branches/:branchId/products/:productId/promo', async (req, res) => {
  try {
    const { branchId, productId } = req.params;
    const { discountType, discountValue, promoStart, promoEnd, isPromoActive } = req.body || {};
    if (req.user.role === 'admin' && String(req.user.branch) !== String(branchId)) {
      return res.status(403).json({ success: false, message: 'Ushbu filial uchun ruxsat yo\'q' });
    }
    const BranchProduct = require('../../models/BranchProduct');
    const update = { };
    if (discountType !== undefined) update.discountType = discountType || null;
    if (discountValue !== undefined) update.discountValue = discountValue === '' ? null : Number(discountValue);
    if (promoStart !== undefined) update.promoStart = promoStart ? new Date(promoStart) : null;
    if (promoEnd !== undefined) update.promoEnd = promoEnd ? new Date(promoEnd) : null;
    if (isPromoActive !== undefined) update.isPromoActive = Boolean(isPromoActive);
    const doc = await BranchProduct.findOneAndUpdate({ branch: branchId, product: productId }, { $set: update, $setOnInsert: { branch: branchId, product: productId } }, { new: true, upsert: true });
    res.json({ success: true, message: 'Promo yangilandi', data: doc });
  } catch (e) {
    console.error('Promo update error:', e);
    res.status(500).json({ success: false, message: 'Promo yangilashda xatolik' });
  }
});

module.exports = router;