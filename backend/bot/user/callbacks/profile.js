// 📋 PROFILE CALLBACKS - OPTIMIZED MODULAR STRUCTURE
const { registerProfileCallbacks: registerModularProfileCallbacks } = require('./profile');

function registerProfileCallbacks(bot) {
  // Use modular structure
  registerModularProfileCallbacks(bot);
}

module.exports = { registerProfileCallbacks };