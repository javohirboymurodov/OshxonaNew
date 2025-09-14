/**
 * Courier Status Updates - Modular Structure
 */

const { onWay } = require('./onWay');
const { delivered } = require('./delivered');
const { cancelOrder } = require('./cancel');

module.exports = {
  onWay,
  delivered,
  cancelOrder
};