/**
 * Orders Controller - Main Entry Point
 * Buyurtmalar boshqaruvi - asosiy kirish nuqtasi
 * 
 * Bu fayl barcha order operatsiyalarini import qilib, bitta interfeys taqdim etadi
 */

// Import specialized controllers
const adminController = require('./orders/adminController');
const courierController = require('./orders/courierController');
const statusController = require('./orders/statusController');
const statsController = require('./orders/statsController');

// Re-export all functions for backward compatibility
module.exports = {
  // Admin operations
  listOrders: adminController.listOrders,
  getOrder: adminController.getOrder,
  getOrderById: adminController.getOrderById,
  
  // Status management
  updateStatus: statusController.updateStatus,
  getStatusMessage: statusController.getStatusMessage,
  getStatusEmoji: statusController.getStatusEmoji,
  getEstimatedTime: statusController.getEstimatedTime,
  
  // Statistics
  getStats: statsController.getStats,
  
  // Courier operations
  assignCourier: courierController.assignCourier,
  courierAcceptOrder: courierController.courierAcceptOrder,
  courierPickedUpOrder: courierController.courierPickedUpOrder,
  courierOnWay: courierController.courierOnWay,
  courierDeliveredOrder: courierController.courierDeliveredOrder,
  courierCancelledOrder: courierController.courierCancelledOrder,
  updateCourierLocation: courierController.updateCourierLocation,
  checkCourierDistance: courierController.checkCourierDistance,
  
  // Utility functions
  calculateDistance: courierController.calculateDistance
};