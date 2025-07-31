const profile = require('./profile');
const catalog = require('./catalog');
const cart = require('./cart');
const order = require('./order');
const input = require('./input');
const myOrders = require('./myOrders');
const backToMain = require('./backToMain');

const UserHandlers = {
  // Profile
  ...profile,
  // Catalog
  ...catalog,
  // Cart
  ...cart,
  // Order
  ...order,
  // Input
  ...input,
  // My Orders
  ...myOrders,
  // Back to main
  ...backToMain
};

module.exports = UserHandlers;
