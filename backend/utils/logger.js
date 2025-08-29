const fs = require('fs');
const path = require('path');

/**
 * Simple logger utility for the application
 */

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  writeToFile(filename, content) {
    try {
      const filePath = path.join(this.logDir, filename);
      fs.appendFileSync(filePath, content + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message, meta = {}) {
    const formatted = this.formatMessage('info', message, meta);
    console.log(`ℹ️  ${formatted}`);
    this.writeToFile('app.log', formatted);
  }

  warn(message, meta = {}) {
    const formatted = this.formatMessage('warn', message, meta);
    console.warn(`⚠️  ${formatted}`);
    this.writeToFile('app.log', formatted);
  }

  error(message, meta = {}) {
    const formatted = this.formatMessage('error', message, meta);
    console.error(`❌ ${formatted}`);
    this.writeToFile('error.log', formatted);
    this.writeToFile('app.log', formatted);
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      const formatted = this.formatMessage('debug', message, meta);
      console.log(`🐛 ${formatted}`);
      this.writeToFile('debug.log', formatted);
    }
  }

  // Telegram specific logging
  telegram(message, meta = {}) {
    const formatted = this.formatMessage('telegram', message, meta);
    console.log(`📱 ${formatted}`);
    this.writeToFile('telegram.log', formatted);
  }

  // Database specific logging
  database(message, meta = {}) {
    const formatted = this.formatMessage('database', message, meta);
    console.log(`🗄️  ${formatted}`);
    this.writeToFile('database.log', formatted);
  }

  // API specific logging
  api(message, meta = {}) {
    const formatted = this.formatMessage('api', message, meta);
    console.log(`🌐 ${formatted}`);
    this.writeToFile('api.log', formatted);
  }

  // Performance logging
  performance(message, meta = {}) {
    const formatted = this.formatMessage('performance', message, meta);
    console.log(`⚡ ${formatted}`);
    this.writeToFile('performance.log', formatted);
  }

  // Log cleanup (optional - removes old logs)
  cleanup(daysToKeep = 7) {
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old log file: ${file}`);
        }
      });
    } catch (error) {
      console.error('Log cleanup failed:', error);
    }
  }
}

// Export singleton instance
module.exports = new Logger();