const logger = require('./logger');

/**
 * Enhanced Error Handler with better categorization and logging
 */

class ErrorCategories {
  static VALIDATION = 'VALIDATION_ERROR';
  static DATABASE = 'DATABASE_ERROR';
  static AUTHENTICATION = 'AUTH_ERROR';
  static AUTHORIZATION = 'AUTHORIZATION_ERROR';
  static NETWORK = 'NETWORK_ERROR';
  static BUSINESS_LOGIC = 'BUSINESS_LOGIC_ERROR';
  static TELEGRAM_API = 'TELEGRAM_API_ERROR';
  static FILE_UPLOAD = 'FILE_UPLOAD_ERROR';
  static EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR';
  static UNKNOWN = 'UNKNOWN_ERROR';
}

class AppError extends Error {
  constructor(message, statusCode = 500, category = ErrorCategories.UNKNOWN, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.category = category;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Enhanced error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    category: error.category || ErrorCategories.UNKNOWN
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Noto\'g\'ri ID format';
    error = new AppError(message, 400, ErrorCategories.VALIDATION);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} allaqachon mavjud`;
    error = new AppError(message, 400, ErrorCategories.DATABASE);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400, ErrorCategories.VALIDATION);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Noto\'g\'ri token';
    error = new AppError(message, 401, ErrorCategories.AUTHENTICATION);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token muddati tugagan';
    error = new AppError(message, 401, ErrorCategories.AUTHENTICATION);
  }

  // Network errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    const message = 'Tashqi xizmatga ulanishda xatolik';
    error = new AppError(message, 503, ErrorCategories.NETWORK);
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'Fayl hajmi juda katta';
    error = new AppError(message, 400, ErrorCategories.FILE_UPLOAD);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Ruxsat etilmagan fayl turi';
    error = new AppError(message, 400, ErrorCategories.FILE_UPLOAD);
  }

  // Send error response
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server xatosi',
    category: error.category || ErrorCategories.UNKNOWN,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error 
    })
  });
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res, next) => {
  const message = `${req.originalUrl} yo'li topilmadi`;
  const error = new AppError(message, 404, ErrorCategories.UNKNOWN);
  
  logger.warn('404 Not Found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  next(error);
};

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Telegram bot error handler
 */
const telegramErrorHandler = (error, ctx) => {
  logger.error('Telegram bot error:', {
    message: error.message,
    stack: error.stack,
    userId: ctx?.from?.id,
    chatId: ctx?.chat?.id,
    updateType: ctx?.updateType,
    timestamp: new Date().toISOString()
  });

  // Don't crash the bot on errors
  try {
    if (ctx && ctx.answerCbQuery) {
      ctx.answerCbQuery('❌ Xatolik yuz berdi', { show_alert: true });
    } else if (ctx && ctx.reply) {
      ctx.reply('❌ Vaqtinchalik xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    }
  } catch (notificationError) {
    logger.error('Failed to send error notification:', notificationError);
  }
};

/**
 * Database connection error handler
 */
const databaseErrorHandler = (error) => {
  logger.error('Database connection error:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // In production, might want to send alerts to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service (e.g., Sentry, LogRocket, etc.)
    console.error('CRITICAL: Database connection failed in production');
  }
};

/**
 * Unhandled promise rejection handler
 */
const unhandledRejectionHandler = (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason.toString(),
    stack: reason.stack,
    promise: promise.toString(),
    timestamp: new Date().toISOString()
  });

  // Graceful shutdown in production
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: Unhandled promise rejection. Shutting down...');
    process.exit(1);
  }
};

/**
 * Uncaught exception handler
 */
const uncaughtExceptionHandler = (error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  console.error('CRITICAL: Uncaught exception. Shutting down...');
  process.exit(1);
};

/**
 * Validation error helper
 */
const createValidationError = (errors) => {
  const message = Array.isArray(errors) ? errors.join(', ') : errors;
  return new AppError(message, 400, ErrorCategories.VALIDATION);
};

/**
 * Business logic error helper
 */
const createBusinessLogicError = (message) => {
  return new AppError(message, 400, ErrorCategories.BUSINESS_LOGIC);
};

/**
 * Authentication error helper
 */
const createAuthError = (message = 'Ruxsat etilmagan') => {
  return new AppError(message, 401, ErrorCategories.AUTHENTICATION);
};

/**
 * Authorization error helper
 */
const createAuthorizationError = (message = 'Yetarli ruxsat yo\'q') => {
  return new AppError(message, 403, ErrorCategories.AUTHORIZATION);
};

/**
 * Setup global error handlers
 */
const setupGlobalErrorHandlers = () => {
  process.on('unhandledRejection', unhandledRejectionHandler);
  process.on('uncaughtException', uncaughtExceptionHandler);
};

module.exports = {
  AppError,
  ErrorCategories,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  telegramErrorHandler,
  databaseErrorHandler,
  createValidationError,
  createBusinessLogicError,
  createAuthError,
  createAuthorizationError,
  setupGlobalErrorHandlers
};
