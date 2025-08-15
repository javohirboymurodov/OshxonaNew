const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const DashboardController = require('../controllers/dashboardController');

const router = express.Router();
router.use(authenticateToken);
router.use(requireAdmin);

// ==============================================
// 📊 ANALYTICS & REPORTS
// ==============================================

// Sales analytics
router.get('/analytics/sales', DashboardController.analyticsSales);

// Order statistics
router.get('/analytics/orders', DashboardController.analyticsOrders);

// Simple chart data for dashboard (revenue or orders count)
router.get('/chart-data', DashboardController.chartData);

// Yo'q bo'lgan route qo'shish
router.get('/stats', DashboardController.stats);

module.exports = router;