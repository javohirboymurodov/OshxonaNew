/**
 * Message Handlers - Main Entry Point
 * Xabar handlerlari - asosiy kirish nuqtasi
 * 
 * Bu fayl barcha xabar handlerlarini import qilib, bitta interfeys taqdim etadi
 */

// Import from messages module
const messagesModule = require('./messages');

// Re-export main registration function for backward compatibility
const { registerMessageHandlers } = messagesModule;

module.exports = { 
  registerMessageHandlers,
  
  // Direct access to modules
  messages: messagesModule
};