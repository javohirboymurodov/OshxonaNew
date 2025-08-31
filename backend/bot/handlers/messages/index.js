/**
 * Message Handlers Module - Central Export
 * Xabar handlerlari moduli - markaziy export
 * 
 * Bu fayl barcha xabar handlerlarini bitta joydan export qiladi
 */

const contactHandler = require('./contactHandler');
const locationHandler = require('./locationHandler');
const textHandler = require('./textHandler');

/**
 * Barcha message handlerlarini bot ga ulash
 * @param {Object} bot - Telegraf bot instance
 */
function registerMessageHandlers(bot) {
  console.log('🔗 Registering message handlers...');
  
  // Contact handlers
  contactHandler.registerContactHandler(bot);
  
  // Location handlers
  locationHandler.registerLocationHandlers(bot);
  
  // Text handlers
  textHandler.registerTextHandlers(bot);
  
  console.log('✅ All message handlers registered successfully');
}

module.exports = {
  // Main registration function
  registerMessageHandlers,
  
  // Individual handlers
  contact: contactHandler,
  location: locationHandler,
  text: textHandler,
  
  // Direct function access
  handleContact: contactHandler.handleContact,
  handleLocation: locationHandler.handleLocation,
  handleText: textHandler.handleText,
  handleWebAppData: textHandler.handleWebAppData
};