/**
 * Orders Module - Central Export
 * Buyurtmalar moduli - markaziy export
 * 
 * Bu fayl barcha order operatsiyalarini bitta joydan export qiladi
 */

const adminController = require('./adminController');
const courierController = require('./courier'); // Use courier module directly
const statusController = require('./statusController');
const statsController = require('./statsController');

module.exports = {
  // Admin operations - buyurtmalarni ko'rish va boshqarish
  listOrders: adminController.listOrders,
  getOrder: adminController.getOrder,
  getOrderById: adminController.getOrderById,
  
  // Status management - holat boshqaruvi
  updateStatus: statusController.updateStatus,
  getStatusMessage: statusController.getStatusMessage,
  getStatusEmoji: statusController.getStatusEmoji,
  getEstimatedTime: statusController.getEstimatedTime,
  
  // Statistics - statistika
  getStats: statsController.getStats,
  
  // Courier operations - kuryer operatsiyalari
  assignCourier: courierController.assignCourier,
  courierAcceptOrder: courierController.courierAcceptOrder,
  courierPickedUpOrder: courierController.courierPickedUpOrder,
  courierOnWay: courierController.courierOnWay,
  courierDeliveredOrder: courierController.courierDeliveredOrder,
  courierCancelledOrder: courierController.courierCancelledOrder,
  updateCourierLocation: courierController.updateCourierLocation,
  checkCourierDistance: courierController.checkCourierDistance,
  
  // Utility functions - yordamchi funksiyalar
  calculateDistance: courierController.calculateDistance,
  
  // Direct access to controllers - to'g'ridan-to'g'ri kirish
  admin: adminController,
  courier: courierController,
  status: statusController,
  stats: statsController
};