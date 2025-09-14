/**
 * Courier Modules Index
 * Barcha kuryer modullarini birlashtirish
 */

const orderManagement = require('./orderManagement');
const statusUpdates = require('./statusUpdates');

module.exports = {
  // Order Management
  ensureCourierByTelegram: orderManagement.ensureCourierByTelegram,
  acceptOrder: orderManagement.acceptOrder,
  rejectOrder: orderManagement.rejectOrder,
  orderDetails: orderManagement.orderDetails,
  
  // Status Updates
  onWay: statusUpdates.onWay,
  delivered: statusUpdates.delivered,
  cancelOrder: statusUpdates.cancelOrder
};