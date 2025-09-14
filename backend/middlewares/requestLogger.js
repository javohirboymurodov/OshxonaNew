const logger = require('../utils/logger');

/**
 * Request Logger Middleware
 * So'rovlarni loglash middleware
 */

const requestLogger = (req, res, next) => {
  const start = Date.now();
  const isDebug = process.env.NODE_ENV === 'development' || process.env.API_DEBUG === 'true';
  
  // Only log in debug mode
  if (isDebug) {
    logger.info(`📥 ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  }

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    // Log slow requests (>2 seconds) or errors
    if (duration > 2000 || res.statusCode >= 400) {
      const logLevel = res.statusCode >= 400 ? 'error' : 'warn';
      logger[logLevel](`🐌 Slow request:`, {
        ip: req.ip,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
    }

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error(`❌ ${req.method} ${req.path}`, {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  next(err);
};

module.exports = {
  requestLogger,
  errorLogger
};