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

module.exports = router;