/**
 * Courier Operations Module - Central Export
 * Kuryer operatsiyalari moduli - markaziy export
 * 
 * Bu fayl barcha kuryer operatsiyalarini bitta joydan export qiladi
 */

const assignmentController = require('./assignmentController');
const deliveryController = require('./deliveryController');
const locationController = require('./locationController');

module.exports = {
  // Assignment operations - tayinlash operatsiyalari
  assignCourier: assignmentController.assignCourier,
  courierAcceptOrder: assignmentController.courierAcceptOrder,
  
  // Delivery operations - yetkazish operatsiyalari
  courierPickedUpOrder: deliveryController.courierPickedUpOrder,
  courierOnWay: deliveryController.courierOnWay,
  courierDeliveredOrder: deliveryController.courierDeliveredOrder,
  courierCancelledOrder: deliveryController.courierCancelledOrder,
  
  // Location operations - joylashuv operatsiyalari
  updateCourierLocation: locationController.updateCourierLocation,
  checkCourierDistance: locationController.checkCourierDistance,
  
  // Utility functions - yordamchi funksiyalar
  calculateDistance: locationController.calculateDistance,
  
  // Direct access to controllers - to'g'ridan-to'g'ri kirish
  assignment: assignmentController,
  delivery: deliveryController,
  location: locationController
};