const CourierHandlers = require('../handlers/courier/handlers.js.backup');

function registerCourierModule(bot) {
  // ========================================
  // 🚚 COURIER COMMANDS
  // ========================================

  bot.command('courier', CourierHandlers.start);
  
  // 🔧 REMOVED: /start routing moved to user/commands.js to avoid conflict

  console.log('✅ Courier commands registered');
}

module.exports = { registerCourierModule };


