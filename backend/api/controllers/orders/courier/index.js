/**
 * Courier Controllers Index
 * Barcha kuryer controller'larini birlashtirish
 */

const locationController = require('./locationController');
const assignmentController = require('./assignmentController');
const statusController = require('./statusController');

module.exports = {
  // Location & Distance
  calculateDistance: locationController.calculateDistance,
  updateCourierLocation: locationController.updateCourierLocation,
  checkCourierDistance: locationController.checkCourierDistance,
  
  // Assignment
  assignCourier: assignmentController.assignCourier,
  
  // Status Updates
  courierAcceptOrder: statusController.courierAcceptOrder,
  courierPickedUpOrder: statusController.courierPickedUpOrder,
  courierOnWay: statusController.courierOnWay,
  courierDeliveredOrder: statusController.courierDeliveredOrder,
  courierCancelledOrder: statusController.courierCancelledOrder
};