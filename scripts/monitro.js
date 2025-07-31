const axios = require('axios');
const nodemailer = require('nodemailer');
require('dotenv').config();

class BotMonitor {
  constructor() {
    this.botUrl = process.env.BOT_URL || 'http://localhost:3000';
    this.checkInterval = 60000; // 1 minut
    this.alerts = {
      email: process.env.ALERT_EMAIL,
      telegram: process.env.ALERT_TELEGRAM_CHAT_ID
    };
    
    this.setupEmailTransporter();
    this.lastAlertTime = {};
  }
  
  setupEmailTransporter() {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }
  
  async checkBotHealth() {
    try {
      const response = await axios.get(`${this.botUrl}/health`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        console.log(`✅ Bot healthy - ${new Date().toISOString()}`);
        return { status: 'healthy', data: response.data };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Bot unhealthy - ${error.message}`);
      await this.sendAlert('bot_down', `Bot is down: ${error.message}`);
      return { status: 'unhealthy', error: error.message };
    }
  }
  
  async checkDatabase() {
    try {
      const response = await axios.get(`${this.botUrl}/api/health/db`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        return { status: 'healthy' };
      } else {
        throw new Error(`Database check failed: HTTP ${response.status}`);
      }
    } catch (error) {
      await this.sendAlert('db_down', `Database is down: ${error.message}`);
      return { status: 'unhealthy', error: error.message };
    }
  }
  
  async checkDiskSpace() {
    const { execSync } = require('child_process');
    
    try {
      const output = execSync('df -h /', { encoding: 'utf-8' });
      const lines = output.split('\n');
      const diskInfo = lines[1].split(/\s+/);
      const usedPercent = parseInt(diskInfo[4]);
      
      if (usedPercent > 85) {
        await this.sendAlert('disk_space', `Disk space usage: ${usedPercent}%`);
        return { status: 'warning', usage: usedPercent };
      }
      
      return { status: 'ok', usage: usedPercent };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
  
  async checkMemoryUsage() {
    const { execSync } = require('child_process');
    
    try {
      const output = execSync('free -m', { encoding: 'utf-8' });
      const lines = output.split('\n');
      const memInfo = lines[1].split(/\s+/);
      const total = parseInt(memInfo[1]);
      const used = parseInt(memInfo[2]);
      const usedPercent = Math.round((used / total) * 100);
      
      if (usedPercent > 90) {
        await this.sendAlert('memory_high', `Memory usage: ${usedPercent}%`);
        return { status: 'warning', usage: usedPercent };
      }
      
      return { status: 'ok', usage: usedPercent };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
  
  async sendAlert(type, message) {
    const now = Date.now();
    const lastAlert = this.lastAlertTime[type] || 0;
    
    // Spam oldini olish (5 minutda bir marta)
    if (now - lastAlert < 300000) {
      return;
    }
    
    this.lastAlertTime[type] = now;
    
    // Email alert
    if (this.emailTransporter && this.alerts.email) {
      try {
        await this.emailTransporter.sendMail({
          from: process.env.SMTP_USER,
          to: this.alerts.email,
          subject: `🚨 Oshxona Bot Alert: ${type}`,
          text: message,
          html: `
            <h2>🚨 Oshxona Bot Alert</h2>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Message:</strong> ${message}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          `
        });
        console.log(`📧 Email alert sent for ${type}`);
      } catch (error) {
        console.error('Email alert failed:', error);
      }
    }
    
    // Telegram alert
    if (this.alerts.telegram && process.env.BOT_TOKEN) {
      try {
        await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
          chat_id: this.alerts.telegram,
          text: `🚨 *Oshxona Bot Alert*\n\n*Type:* ${type}\n*Message:* ${message}\n*Time:* ${new Date().toISOString()}`,
          parse_mode: 'Markdown'
        });
        console.log(`📱 Telegram alert sent for ${type}`);
      } catch (error) {
        console.error('Telegram alert failed:', error);
      }
    }
  }
  
  async runFullCheck() {
    console.log(`🔍 Running full health check - ${new Date().toISOString()}`);
    
    const results = {
      timestamp: new Date().toISOString(),
      bot: await this.checkBotHealth(),
      database: await this.checkDatabase(),
      disk: await this.checkDiskSpace(),
      memory: await this.checkMemoryUsage()
    };
    
    // Log natijalarni saqlash
    const fs = require('fs');
    const logFile = './logs/health-check.log';
    fs.appendFileSync(logFile, JSON.stringify(results) + '\n');
    
    return results;
  }
  
  start() {
    console.log('🔍 Bot monitoring started...');
    
    // Dastlabki tekshiruv
    this.runFullCheck();
    
    // Muntazam tekshiruv
    setInterval(async () => {
      await this.runFullCheck();
    }, this.checkInterval);
  }
}

// Monitor ishga tushirish
if (require.main === module) {
  const monitor = new BotMonitor();
  monitor.start();
}

module.exports = BotMonitor;