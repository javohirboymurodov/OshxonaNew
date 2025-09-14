/**
 * Courier Status Updates - OPTIMIZED MODULAR STRUCTURE
 */

const { onWay, delivered, cancelOrder } = require('./statusUpdates');

module.exports = {
  onWay,
  delivered,
  cancelOrder
};