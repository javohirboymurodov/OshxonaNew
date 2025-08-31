/**
 * Courier Handlers - Main Entry Point
 * Kuryer handlerlari - asosiy kirish nuqtasi
 * 
 * Bu fayl barcha kuryer operatsiyalarini import qilib, bitta interfeys taqdim etadi
 */

// Import from modules
const courierModules = require('./modules');

// Re-export all functions for backward compatibility
module.exports = {
  // Authentication
  start: courierModules.start,
  ensureCourierByTelegram: courierModules.ensureCourierByTelegram,
  bindByPhone: courierModules.bindByPhone,
  normalizePhone: courierModules.normalizePhone,
  
  // Shift Management
  toggleShift: courierModules.toggleShift,
  startWork: courierModules.startWork,
  stopWork: courierModules.stopWork,
  toggleAvailable: courierModules.toggleAvailable,
  
  // Profile & Stats
  activeOrders: courierModules.activeOrders,
  earnings: courierModules.earnings,
  profile: courierModules.profile,
  
  // Order Operations
  acceptOrder: courierModules.acceptOrder,
  onWay: courierModules.onWay,
  delivered: courierModules.delivered,
  cancelOrder: courierModules.cancelOrder,
  orderDetails: courierModules.orderDetails
};

// Additional export for backward compatibility
module.exports.bindByPhone = courierModules.bindByPhone;