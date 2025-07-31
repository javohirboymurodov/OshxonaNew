const { Telegraf } = require('telegraf');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

// Proxy sozlamalari (agar kerak bo'lsa)
const proxyUrl = process.env.PROXY_URL; // masalan: 'http://proxy.example.com:8080'

const botOptions = {};
if (proxyUrl) {
  botOptions.telegram = {
    agent: new HttpsProxyAgent(proxyUrl)
  };
}

const bot = new Telegraf(process.env.BOT_TOKEN, botOptions);

// Bot kodi...
console.log('🚀 Bot proxy bilan ishga tushmoqda...');

bot.launch()
  .then(() => {
    console.log('✅ Bot muvaffaqiyatli ishga tushdi!');
  })
  .catch((error) => {
    console.error('❌ Bot ishga tushmadi:', error.message);
  });

module.exports = bot;
