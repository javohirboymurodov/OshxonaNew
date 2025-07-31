const fs = require('fs');
const path = require('path');
const moment = require('moment');

class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, '../logs');
    this.createLogsDir();
  }
  
  createLogsDir() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }
  
  getLogFileName(type = 'app') {
    const date = moment().format('YYYY-MM-DD');
    return path.join(this.logsDir, `${type}-${date}.log`);
  }
  
  writeLog(level, message, data = null) {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      data
    };
    
    const logString = JSON.stringify(logEntry) + '\n';
    
    // Console ga chiqarish
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
    }
    
    // Faylga yozish
    try {
      fs.appendFileSync(this.getLogFileName(), logString);
    } catch (error) {
      console.error('Log write error:', error);
    }
  }
  
  info(message, data = null) {
    this.writeLog('info', message, data);
  }
  
  error(message, data = null) {
    this.writeLog('error', message, data);
    
    // Error loglarini alohida faylga ham yozish
    try {
      const errorLogString = JSON.stringify({
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        message,
        data,
        stack: data?.stack || null
      }) + '\n';
      
      fs.appendFileSync(this.getLogFileName('error'), errorLogString);
    } catch (err) {
      console.error('Error log write failed:', err);
    }
  }
  
  warn(message, data = null) {
    this.writeLog('warn', message, data);
  }
  
  debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      this.writeLog('debug', message, data);
    }
  }
  
  // Foydalanuvchi faoliyatini loglash
  logUserActivity(userId, action, details = null) {
    this.info(`User activity: ${action}`, {
      userId,
      action,
      details,
      timestamp: moment().toISOString()
    });
    
    // User activity loglarini alohida faylga yozish
    try {
      const activityLog = JSON.stringify({
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        userId,
        action,
        details
      }) + '\n';
      
      fs.appendFileSync(this.getLogFileName('activity'), activityLog);
    } catch (error) {
      console.error('Activity log write error:', error);
    }
  }
  
  // Buyurtma logini yozish
  logOrder(orderId, action, userId, details = null) {
    const logData = {
      orderId,
      action,
      userId,
      details,
      timestamp: moment().toISOString()
    };
    
    this.info(`Order ${action}: ${orderId}`, logData);
    
    try {
      const orderLog = JSON.stringify({
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        ...logData
      }) + '\n';
      
      fs.appendFileSync(this.getLogFileName('orders'), orderLog);
    } catch (error) {
      console.error('Order log write error:', error);
    }
  }
  
  // Xatoliklarni loglash
  logError(error, context = null) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: moment().toISOString()
    };
    
    this.error('Application error', errorData);
  }
  
  // Eski loglarni tozalash (30 kundan eski)
  cleanOldLogs() {
    try {
      const files = fs.readdirSync(this.logsDir);
      const thirtyDaysAgo = moment().subtract(30, 'days');
      
      files.forEach(file => {
        const filePath = path.join(this.logsDir, file);
        const stats = fs.statSync(filePath);
        
        if (moment(stats.mtime).isBefore(thirtyDaysAgo)) {
          fs.unlinkSync(filePath);
          this.info(`Deleted old log file: ${file}`);
        }
      });
    } catch (error) {
      console.error('Clean old logs error:', error);
    }
  }
}

// Singleton pattern
const logger = new Logger();

// Har kun eski loglarni tozalash
setInterval(() => {
  logger.cleanOldLogs();
}, 24 * 60 * 60 * 1000); // 24 soat

module.exports = logger;