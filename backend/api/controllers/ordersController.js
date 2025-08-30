/**
 * Orders Controller - Main Entry Point
 * Buyurtmalar boshqaruvi - asosiy kirish nuqtasi
 * 
 * Bu fayl barcha order operatsiyalarini import qilib, bitta interfeys taqdim etadi
 */

// Import from orders module
const ordersModule = require('./orders');

// Re-export all functions for backward compatibility
module.exports = ordersModule;