// Centralized Error Handler - Barcha xatoliklarni boshqarish
const Logger = require('./logger');

/**
 * Error types classification
 */
const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR', 
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  TELEGRAM_API_ERROR: 'TELEGRAM_API_ERROR',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Error severity levels
 */
const ERROR_SEVERITY = {
  LOW: 'LOW',           // User input errors, minor issues
  MEDIUM: 'MEDIUM',     // Business logic errors, temporary failures  
  HIGH: 'HIGH',         // Database errors, service failures
  CRITICAL: 'CRITICAL'  // System-wide failures, security breaches
};

/**
 * Centralized Error Handler Class
 */
class ErrorHandler {
  
  /**
   * Bot error handling
   * @param {Error} error - Error object
   * @param {Object} ctx - Telegraf context
   * @param {Object} options - Additional options
   */
  static async handleBotError(error, ctx, options = {}) {
    try {
      const errorInfo = this.analyzeError(error);
      const userMessage = this.getUserFriendlyMessage(errorInfo);
      
      // Log the error
      await this.logError(error, {
        ...errorInfo,
        userId: ctx.from?.id,
        username: ctx.from?.username,
        chatId: ctx.chat?.id,
        messageText: ctx.message?.text,
        callbackData: ctx.callbackQuery?.data,
        ...options
      });
      
      // Send user-friendly message
      await this.sendUserMessage(ctx, userMessage, errorInfo.severity);
      
      // Alert admins for high/critical errors
      if (errorInfo.severity === ERROR_SEVERITY.HIGH || errorInfo.severity === ERROR_SEVERITY.CRITICAL) {
        await this.alertAdmins(error, errorInfo, ctx);
      }
      
    } catch (handlingError) {
      console.error('❌ Error handler failed:', handlingError);
      // Fallback to basic error response
      this.sendBasicErrorMessage(ctx);
    }
  }

  /**
   * API error handling
   * @param {Error} error - Error object
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Object} next - Express next function
   */
  static handleAPIError(error, req, res, next) {
    try {
      const errorInfo = this.analyzeError(error);
      
      // Log the error
      this.logError(error, {
        ...errorInfo,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id,
        body: this.sanitizeRequestBody(req.body)
      });
      
      // Send API response
      const statusCode = this.getHTTPStatusCode(errorInfo.type);
      const response = this.getAPIErrorResponse(errorInfo, req);
      
      res.status(statusCode).json(response);
      
    } catch (handlingError) {
      console.error('❌ API error handler failed:', handlingError);
      // Fallback to basic error response
      res.status(500).json({
        success: false,
        message: 'Serverda xatolik yuz berdi',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Error analysis and classification
   * @param {Error} error - Error object
   * @returns {Object} - Error information
   */
  static analyzeError(error) {
    let type = ERROR_TYPES.UNKNOWN_ERROR;
    let severity = ERROR_SEVERITY.MEDIUM;
    let isRetryable = false;
    let details = {};

    // Classify error by message/type
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      type = ERROR_TYPES.VALIDATION_ERROR;
      severity = ERROR_SEVERITY.LOW;
    } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
      type = ERROR_TYPES.DATABASE_ERROR;
      severity = ERROR_SEVERITY.HIGH;
      isRetryable = error.code === 11000 ? false : true; // duplicate key error not retryable
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      type = ERROR_TYPES.NETWORK_ERROR;
      severity = ERROR_SEVERITY.HIGH;
      isRetryable = true;
    } else if (error.response?.error_code === 401 || error.message.includes('unauthorized')) {
      type = ERROR_TYPES.AUTHENTICATION_ERROR;
      severity = ERROR_SEVERITY.MEDIUM;
    } else if (error.response?.error_code === 403 || error.message.includes('forbidden')) {
      type = ERROR_TYPES.AUTHORIZATION_ERROR;
      severity = ERROR_SEVERITY.MEDIUM;
    } else if (error.response?.error_code === 404 || error.message.includes('not found')) {
      type = ERROR_TYPES.NOT_FOUND_ERROR;
      severity = ERROR_SEVERITY.LOW;
    } else if (error.response?.error_code || error.message.includes('telegram')) {
      type = ERROR_TYPES.TELEGRAM_API_ERROR;
      severity = ERROR_SEVERITY.MEDIUM;
      isRetryable = true;
    } else if (error.message.includes('file') || error.code === 'LIMIT_FILE_SIZE') {
      type = ERROR_TYPES.FILE_UPLOAD_ERROR;
      severity = ERROR_SEVERITY.LOW;
    }

    // Extract additional details
    if (error.response) {
      details.apiResponse = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      };
    }

    if (error.code) {
      details.errorCode = error.code;
    }

    return {
      type,
      severity,
      isRetryable,
      message: error.message,
      stack: error.stack,
      details,
      timestamp: new Date()
    };
  }

  /**
   * Get user-friendly error message
   * @param {Object} errorInfo - Error information
   * @returns {string} - User-friendly message
   */
  static getUserFriendlyMessage(errorInfo) {
    const messages = {
      [ERROR_TYPES.VALIDATION_ERROR]: 'Ma\'lumotlar noto\'g\'ri kiritilgan. Iltimos, qaytadan urinib ko\'ring.',
      [ERROR_TYPES.DATABASE_ERROR]: 'Ma\'lumotlar bazasi bilan bog\'liq muammo. Biroz kuting va qaytadan urinib ko\'ring.',
      [ERROR_TYPES.NETWORK_ERROR]: 'Internet aloqasi bilan muammo. Iltimos, ulanishni tekshiring.',
      [ERROR_TYPES.AUTHENTICATION_ERROR]: 'Tizimga kirish talab qilinadi. Iltimos, qaytadan kiring.',
      [ERROR_TYPES.AUTHORIZATION_ERROR]: 'Sizda bu amalni bajarish huquqi yo\'q.',
      [ERROR_TYPES.NOT_FOUND_ERROR]: 'So\'ralgan ma\'lumot topilmadi.',
      [ERROR_TYPES.TELEGRAM_API_ERROR]: 'Telegram xizmati bilan bog\'liq muammo. Biroz kuting.',
      [ERROR_TYPES.FILE_UPLOAD_ERROR]: 'Fayl yuklashda xatolik. Fayl o\'lchamini tekshiring.',
      [ERROR_TYPES.BUSINESS_LOGIC_ERROR]: 'Amal bajarilmadi. Iltimos, ma\'lumotlarni tekshiring.',
      [ERROR_TYPES.UNKNOWN_ERROR]: 'Kutilmagan xatolik yuz berdi. Iltimos, biroz kuting.'
    };

    let message = messages[errorInfo.type] || messages[ERROR_TYPES.UNKNOWN_ERROR];
    
    // Add retry suggestion for retryable errors
    if (errorInfo.isRetryable) {
      message += ' Biroz kutib qaytadan urinib ko\'ring.';
    }

    return message;
  }

  /**
   * Send user message based on context type
   * @param {Object} ctx - Context (Telegraf or Express)
   * @param {string} message - Message to send
   * @param {string} severity - Error severity
   */
  static async sendUserMessage(ctx, message, severity) {
    try {
      // Add emoji based on severity
      const emoji = {
        [ERROR_SEVERITY.LOW]: '⚠️',
        [ERROR_SEVERITY.MEDIUM]: '❌',
        [ERROR_SEVERITY.HIGH]: '🚨',
        [ERROR_SEVERITY.CRITICAL]: '💥'
      }[severity] || '❌';

      const fullMessage = `${emoji} ${message}`;

      if (ctx.answerCbQuery) {
        await ctx.answerCbQuery(fullMessage);
      } else if (ctx.reply) {
        await ctx.reply(fullMessage);
      } else if (ctx.telegram && ctx.chat?.id) {
        await ctx.telegram.sendMessage(ctx.chat.id, fullMessage);
      }
    } catch (error) {
      console.error('Failed to send user message:', error);
    }
  }

  /**
   * Send basic error message as fallback
   * @param {Object} ctx - Telegraf context
   */
  static async sendBasicErrorMessage(ctx) {
    try {
      const message = '❌ Xatolik yuz berdi!';
      if (ctx.answerCbQuery) {
        await ctx.answerCbQuery(message);
      } else if (ctx.reply) {
        await ctx.reply(message);
      }
    } catch (error) {
      console.error('Failed to send basic error message:', error);
    }
  }

  /**
   * Log error with context
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  static async logError(error, context = {}) {
    try {
      const logData = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        timestamp: new Date().toISOString(),
        ...context
      };

      // Use existing logger if available
      if (Logger && Logger.error) {
        Logger.error('Application Error', logData);
      } else {
        console.error('🚨 ERROR:', JSON.stringify(logData, null, 2));
      }

      // Write to error-specific log file
      const fs = require('fs').promises;
      const path = require('path');
      const logDir = path.join(process.cwd(), 'logs');
      const errorLogFile = path.join(logDir, 'errors.log');

      // Ensure log directory exists
      try {
        await fs.access(logDir);
      } catch {
        await fs.mkdir(logDir, { recursive: true });
      }

      const logEntry = JSON.stringify(logData) + '\n';
      await fs.appendFile(errorLogFile, logEntry);

    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }

  /**
   * Alert admins for critical errors
   * @param {Error} error - Original error
   * @param {Object} errorInfo - Error information
   * @param {Object} ctx - Context
   */
  static async alertAdmins(error, errorInfo, ctx) {
    try {
      const adminIds = process.env.ADMIN_ID ? 
        process.env.ADMIN_ID.split(',').map(id => parseInt(id.trim())) : [];

      if (adminIds.length === 0) return;

      const alertMessage = `
🚨 **CRITICAL ERROR ALERT**

**Type:** ${errorInfo.type}
**Severity:** ${errorInfo.severity}
**Time:** ${errorInfo.timestamp.toLocaleString('uz-UZ')}
**User:** ${ctx.from?.id || 'Unknown'} (${ctx.from?.username || 'No username'})
**Message:** ${error.message}

**Context:**
${ctx.message?.text ? `Text: ${ctx.message.text}` : ''}
${ctx.callbackQuery?.data ? `Callback: ${ctx.callbackQuery.data}` : ''}
      `;

      // Send to admins via bot
      if (global.botInstance) {
        for (const adminId of adminIds) {
          try {
            await global.botInstance.telegram.sendMessage(adminId, alertMessage, {
              parse_mode: 'Markdown'
            });
          } catch (sendError) {
            console.error(`Failed to alert admin ${adminId}:`, sendError);
          }
        }
      }

    } catch (alertError) {
      console.error('Failed to alert admins:', alertError);
    }
  }

  /**
   * Get HTTP status code for API errors
   * @param {string} errorType - Error type
   * @returns {number} - HTTP status code
   */
  static getHTTPStatusCode(errorType) {
    const statusCodes = {
      [ERROR_TYPES.VALIDATION_ERROR]: 400,
      [ERROR_TYPES.AUTHENTICATION_ERROR]: 401,
      [ERROR_TYPES.AUTHORIZATION_ERROR]: 403,
      [ERROR_TYPES.NOT_FOUND_ERROR]: 404,
      [ERROR_TYPES.DATABASE_ERROR]: 500,
      [ERROR_TYPES.NETWORK_ERROR]: 503,
      [ERROR_TYPES.FILE_UPLOAD_ERROR]: 413,
      [ERROR_TYPES.BUSINESS_LOGIC_ERROR]: 422,
      [ERROR_TYPES.TELEGRAM_API_ERROR]: 502,
      [ERROR_TYPES.UNKNOWN_ERROR]: 500
    };

    return statusCodes[errorType] || 500;
  }

  /**
   * Get API error response
   * @param {Object} errorInfo - Error information
   * @param {Object} req - Express request
   * @returns {Object} - API response
   */
  static getAPIErrorResponse(errorInfo, req) {
    const isDev = process.env.NODE_ENV !== 'production';
    
    const response = {
      success: false,
      message: this.getUserFriendlyMessage(errorInfo),
      error: errorInfo.type,
      timestamp: errorInfo.timestamp
    };

    // Include additional details in development
    if (isDev) {
      response.details = {
        stack: errorInfo.stack,
        url: req.url,
        method: req.method,
        ...errorInfo.details
      };
    }

    // Include retry info for retryable errors
    if (errorInfo.isRetryable) {
      response.retryable = true;
      response.retryAfter = 30; // seconds
    }

    return response;
  }

  /**
   * Sanitize request body for logging
   * @param {Object} body - Request body
   * @returns {Object} - Sanitized body
   */
  static sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Create error monitoring middleware for Express
   * @returns {Function} - Express middleware
   */
  static createExpressMiddleware() {
    return (error, req, res, next) => {
      this.handleAPIError(error, req, res, next);
    };
  }

  /**
   * Create error handling wrapper for async functions
   * @param {Function} fn - Async function to wrap
   * @returns {Function} - Wrapped function
   */
  static asyncWrapper(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

module.exports = {
  ErrorHandler,
  ERROR_TYPES,
  ERROR_SEVERITY
};
