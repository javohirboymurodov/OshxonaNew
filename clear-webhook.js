const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

async function clearWebhook() {
  try {
    console.log('Webhook tozalanmoqda...');
    await bot.telegram.deleteWebhook();
    console.log('✅ Webhook tozalandi!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Webhook tozalashda xatolik:', error);
    process.exit(1);
  }
}

clearWebhook();
