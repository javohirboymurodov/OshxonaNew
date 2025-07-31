const axios = require('axios');
require('dotenv').config();

class WebhookManager {
  static async setWebhook() {
    try {
      const botToken = process.env.BOT_TOKEN;
      const webhookUrl = process.env.WEBHOOK_URL;
      
      if (!botToken) {
        throw new Error('BOT_TOKEN environment variable not found');
      }
      
      if (!webhookUrl) {
        throw new Error('WEBHOOK_URL environment variable not found');
      }
      
      const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
      const fullWebhookUrl = `${webhookUrl}/webhook`;
      
      console.log('🌐 Webhook o\'rnatilmoqda...');
      console.log(`📡 URL: ${fullWebhookUrl}`);
      
      const response = await axios.post(url, {
        url: fullWebhookUrl,
        allowed_updates: [
          'message',
          'callback_query',
          'inline_query',
          'pre_checkout_query',
          'shipping_query'
        ]
      });
      
      if (response.data.ok) {
        console.log('✅ Webhook muvaffaqiyatli o\'rnatildi!');
        console.log('📋 Ma\'lumot:', response.data.description);
      } else {
        console.error('❌ Webhook o\'rnatishda xatolik:', response.data);
      }
      
    } catch (error) {
      console.error('❌ Webhook xatosi:', error.message);
    }
  }
  
  static async deleteWebhook() {
    try {
      const botToken = process.env.BOT_TOKEN;
      
      if (!botToken) {
        throw new Error('BOT_TOKEN environment variable not found');
      }
      
      const url = `https://api.telegram.org/bot${botToken}/deleteWebhook`;
      
      console.log('🗑️  Webhook o\'chirilmoqda...');
      
      const response = await axios.post(url);
      
      if (response.data.ok) {
        console.log('✅ Webhook muvaffaqiyatli o\'chirildi!');
      } else {
        console.error('❌ Webhook o\'chirishda xatolik:', response.data);
      }
      
    } catch (error) {
      console.error('❌ Webhook o\'chirish xatosi:', error.message);
    }
  }
  
  static async getWebhookInfo() {
    try {
      const botToken = process.env.BOT_TOKEN;
      
      if (!botToken) {
        throw new Error('BOT_TOKEN environment variable not found');
      }
      
      const url = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;
      
      console.log('📊 Webhook ma\'lumotlari olinmoqda...');
      
      const response = await axios.get(url);
      
      if (response.data.ok) {
        const info = response.data.result;
        
        console.log('📋 Webhook ma\'lumotlari:');
        console.log(`   URL: ${info.url || 'O\'rnatilmagan'}`);
        console.log(`   Holat: ${info.url ? '✅ Faol' : '❌ Nofaol'}`);
        console.log(`   So\'nggi xatolik: ${info.last_error_message || 'Yo\'q'}`);
        console.log(`   So\'nggi yangilanish: ${info.last_update || 'Yo\'q'}`);
        console.log(`   Kutilayotgan yangilanishlar: ${info.pending_update_count || 0}`);
      } else {
        console.error('❌ Ma\'lumot olishda xatolik:', response.data);
      }
      
    } catch (error) {
      console.error('❌ Webhook ma\'lumot xatosi:', error.message);
    }
  }
}

// Command line argumentlariga qarab ishga tushirish
const command = process.argv[2];

switch (command) {
  case 'set':
    WebhookManager.setWebhook();
    break;
  case 'delete':
    WebhookManager.deleteWebhook();
    break;
  case 'info':
    WebhookManager.getWebhookInfo();
    break;
  default:
    console.log('📋 Foydalanish:');
    console.log('   node scripts/setWebhook.js set     - Webhook o\'rnatish');
    console.log('   node scripts/setWebhook.js delete  - Webhook o\'chirish');
    console.log('   node scripts/setWebhook.js info    - Webhook ma\'lumotlari');
}