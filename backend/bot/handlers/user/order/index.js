// User Order Handlers Main Export
const OrderFlow = require('./orderFlow');
const PaymentFlow = require('./paymentFlow');
const BaseHandler = require('../../../../utils/BaseHandler');
const { askPhoneInlineKeyboard, requestPhoneReplyKeyboard } = require('../../../user/keyboards');

// Import modules
const orderModules = require('./modules');

/**
 * Unified User Order Handlers Export
 * Bu fayl eski order.js ni almashtiradi
 */
class UserOrderHandlers extends BaseHandler {
  // ===============================
  // ORDER FLOW METHODS
  // ===============================
  
  static async startOrder(ctx) {
    return OrderFlow.startOrder(ctx);
  }

  // ===============================
  // PHONE REQUEST (shared)
  // ===============================

  static async askForPhone(ctx) {
    return orderModules.askForPhone(ctx);
  }

  static async handleOrderType(ctx) {
    return OrderFlow.handleOrderType(ctx);
  }

  static async handleDineInPreorder(ctx) {
    return OrderFlow.handleDineInPreorder(ctx);
  }

  static async askForBranchSelection(ctx, forType) {
    return OrderFlow.askForBranchSelection(ctx, forType);
  }

  static async handleChooseBranch(ctx) {
    return OrderFlow.handleChooseBranch(ctx);
  }

  // ===============================
  // PAYMENT FLOW METHODS
  // ===============================
  
  static async askForPaymentMethod(ctx) {
    return PaymentFlow.askForPaymentMethod(ctx);
  }

  static async handlePaymentMethod(ctx, method) {
    return PaymentFlow.handlePaymentMethod(ctx, method);
  }

  static async finalizeOrder(ctx) {
    return PaymentFlow.finalizeOrder(ctx);
  }

  static async confirmOrder(ctx) {
    return PaymentFlow.finalizeOrder(ctx);
  }

  // ===============================
  // TIME SELECTION METHODS
  // ===============================
  
  static async handleArrivalTime(ctx) {
    return orderModules.handleArrivalTime(ctx);
  }

  // ===============================
  // DINE-IN METHODS
  // ===============================
  
  static async handleDineInTableInput(ctx) {
    return orderModules.handleDineInTableInput(ctx);
  }

  static async handleDineInArrived(ctx) {
    return orderModules.handleDineInArrived(ctx);
  }

  // ===============================
  // LOCATION METHODS
  // ===============================
  
  static async processLocation(ctx, latitude, longitude) {
    return orderModules.processLocation(ctx, latitude, longitude);
  }

  static async findNearestBranch(lat, lon) {
    return orderModules.findNearestBranch(lat, lon);
  }

  // ===============================
  // UTILITY METHODS
  // ===============================
  
  static calculateDistance(lat1, lon1, lat2, lon2) {
    return orderModules.calculateDistance(lat1, lon1, lat2, lon2);
  }

  static deg2rad(deg) {
    return orderModules.deg2rad(deg);
  }
}

module.exports = UserOrderHandlers;