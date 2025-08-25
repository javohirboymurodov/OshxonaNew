console.log('Bot is starting...');
require('dotenv').config();
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Test handler
bot.action('start_order', async (ctx) => {
  console.log('✅ start_order action received!');
  await ctx.answerCbQuery('Buyurtma boshlanmoqda...');
  await ctx.reply('Buyurtma berish tugmasi ishladi! ✅');
});

bot.on('callback_query', async (ctx) => {
  console.log('Callback query received:', ctx.callbackQuery.data);
});

bot.launch().then(() => {
  console.log('Test bot launched!');
});
