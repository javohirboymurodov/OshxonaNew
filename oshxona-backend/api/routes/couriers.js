const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const CouriersController = require('../controllers/couriersController');
const SecurityService = require('../../middleware/security');
const validationSchemas = require('../../middleware/validationSchemas');

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

// 🔧 YANGI: Real-time courier locations update
router.post('/locations/refresh', requireAdmin, CouriersController.refreshLocations);

// Courier location update (for courier app/bot)
router.post('/location/update', 
  SecurityService.requestValidator(validationSchemas.updateCourierLocation),
  CouriersController.updateLocation
);

// Advanced analytics
router.get('/heatmap', requireAdmin, CouriersController.heatmap);
router.get('/zones', requireAdmin, CouriersController.zones);
router.get('/suggest/:id', requireAdmin, CouriersController.suggestForOrder);

module.exports = router;