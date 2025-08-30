/**
 * Courier Controller - Main Entry Point
 * Kuryer operatsiyalari - asosiy kirish nuqtasi
 * 
 * Bu fayl barcha kuryer operatsiyalarini import qilib, bitta interfeys taqdim etadi
 */

// Import from courier module
const courierModule = require('./courier');

// Re-export all functions for backward compatibility
module.exports = courierModule;