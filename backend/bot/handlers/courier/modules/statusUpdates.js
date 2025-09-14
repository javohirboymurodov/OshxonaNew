/**
 * Courier Status Updates - OPTIMIZED MODULAR STRUCTURE
 */

const { onWay, delivered, cancelOrder } = require('./statusUpdates/index');

module.exports = {
  onWay,
  delivered,
  cancelOrder
};