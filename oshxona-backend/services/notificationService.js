const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.telegramChatId = process.env.TELEGRAM_CHAT_ID || '';
  }

  async sendTestNotification() {
    console.log('Test notification sent');
    return true;
  }
}

module.exports = new NotificationService();
