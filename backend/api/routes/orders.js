const express = require('express');
const { authenticateToken, requireAdmin } = require('../../middlewares/apiAuth');
const OrdersController = require('../controllers/ordersController.js.backup');
const CourierController = require('../controllers/orders/courier');
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

// Payment confirmation (admin/internal or webhook with secret header)
const PaymentsController = require('../controllers/paymentsController');
router.post('/:id/paid', PaymentsController.confirmPaid);

// Helper functions are defined in the controller

// Assign courier to order
router.patch('/:id/assign-courier', requireAdmin, CourierController.assignCourier);

// ===============================
// 🚚 COURIER ROUTES
// ===============================

// Courier location updates
router.patch('/courier/location', CourierController.updateCourierLocation);

// Courier order status updates
router.patch('/:orderId/courier-accept', CourierController.courierAcceptOrder);
router.patch('/:orderId/courier-picked-up', CourierController.courierPickedUpOrder);
router.patch('/:orderId/courier-on-way', CourierController.courierOnWay);
router.patch('/:orderId/courier-delivered', CourierController.courierDeliveredOrder);
router.patch('/:orderId/courier-cancelled', CourierController.courierCancelledOrder);

// Courier distance checking
router.get('/:id/check-distance', CourierController.checkCourierDistance);

module.exports = router;