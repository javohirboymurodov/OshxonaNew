/**
 * Admin Controller - Main Entry Point
 * Admin controlleri - asosiy kirish nuqtasi
 * 
 * Bu fayl barcha admin operatsiyalarini import qilib, bitta interfeys taqdim etadi
 */

// Import from admin module
const adminModule = require('./admin');

// Re-export all functions for backward compatibility
module.exports = adminModule;