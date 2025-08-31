const express = require('express');
const { authenticateToken, requireAdmin } = require('../../middlewares/apiAuth');
const OrdersController = require('../controllers/ordersController.js.backup');
const SecurityService = require('../../middlewares/security');

const router = express.Router();

// Apply authentication
router.use(authenticateToken);

// Apply admin-specific rate limiting for orders
router.use(SecurityService.getAdminRateLimit());


// 📋 ORDER MANAGEMENT


// Get orders for admin's branch + search
router.get('/', requireAdmin, OrdersController.listOrders);

// Orders stats (for dashboard/cards)
router.get('/stats', requireAdmin, OrdersController.getStats);

// Get single order
router.get('/:id', requireAdmin, OrdersController.getOrder);

// Update order status
router.patch('/:id/status', requireAdmin, OrdersController.updateStatus);

// Helper functions are defined in the controller

// Assign courier to order
router.patch('/:id/assign-courier', requireAdmin, OrdersController.assignCourier);

module.exports = router;