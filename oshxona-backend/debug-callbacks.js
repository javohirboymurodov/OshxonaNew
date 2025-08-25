// Debug script to check callback registration
require('dotenv').config();
const { Telegraf, session } = require('telegraf');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Session
bot.use(session());

// Main menu keyboard
const mainMenuKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '📝 Buyurtma berish', callback_data: 'start_order' }],
      [{ text: '🏪 Filiallar', callback_data: 'show_branches' }],
      [{ text: '📱 Bog\'lanish', callback_data: 'contact' }]
    ]
  }
};

// Start command
bot.start(async (ctx) => {
  console.log('✅ /start command received');
  await ctx.reply('�� Bosh sahifa\n\nKerakli bo\'limni tanlang:', mainMenuKeyboard);
});

// Debug all callbacks
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  console.log('📥 Callback received:', data);
  
  try {
    await ctx.answerCbQuery('✅ Tugma bosildi!');
    
    switch(data) {
      case 'start_order':
        await ctx.reply('📝 Buyurtma berish tanlandi!');
        break;
      case 'show_branches':
        await ctx.reply('🏪 Filiallar tanlandi!');
        break;
      case 'contact':
        await ctx.reply('📱 Bog\'lanish tanlandi!');
        break;
      default:
        await ctx.reply(`❓ Noma'lum tugma: ${data}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
});

bot.launch().then(() => {
  console.log('🚀 Debug bot started!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
