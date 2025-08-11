const userKeyboard = require('./userKeyboards');
const adminKeyboard = require('./adminKeyboards');

module.exports = {
  ...userKeyboard,
  ...adminKeyboard
};