const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const CouriersController = require('../controllers/couriersController');

const router = express.Router();

// Apply authentication
router.use(authenticateToken);

// ==============================================
// 🚚 COURIER MANAGEMENT (Admin only)
// ==============================================

// Get couriers for admin's branch
router.get('/', requireAdmin, CouriersController.list);

// Get courier details
router.get('/:id', requireAdmin, CouriersController.getOne);

// Get available couriers for order assignment
router.get('/available/for-order', requireAdmin, CouriersController.availableForOrder);

// Update courier status (Admin can force offline)
router.patch('/:id/status', requireAdmin, CouriersController.updateStatus);

// Advanced analytics
router.get('/heatmap', requireAdmin, CouriersController.heatmap);
router.get('/zones', requireAdmin, CouriersController.zones);
router.get('/suggest/:id', requireAdmin, CouriersController.suggestForOrder);

module.exports = router;