/**
 * Error Middleware
 * Xatolik middleware'lari
 */

const ErrorHandler = require('../utils/ErrorHandler');

/**
 * 404 Not Found middleware
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

/**
 * Async error wrapper
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Bot async error wrapper
 */
function botAsyncHandler(fn) {
  return async (ctx, next) => {
    try {
      await fn(ctx, next);
    } catch (error) {
      await ErrorHandler.botErrorHandler(error, ctx);
    }
  };
}

/**
 * Validation error handler
 */
function validationErrorHandler(error, req, res, next) {
  if (error.name === 'ValidationError') {
    const response = ErrorHandler.formatValidationError(error);
    return res.status(400).json(response);
  }
  next(error);
}

/**
 * JWT error handler
 */
function jwtErrorHandler(error, req, res, next) {
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        type: 'AUTHENTICATION_ERROR',
        message: 'Invalid token'
      }
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        type: 'AUTHENTICATION_ERROR',
        message: 'Token expired'
      }
    });
  }
  
  next(error);
}

/**
 * MongoDB error handler
 */
function mongoErrorHandler(error, req, res, next) {
  if (error.name === 'MongoError' || error.name === 'MongooseError') {
    ErrorHandler.log(error, {
      url: req.url,
      method: req.method,
      mongoError: true
    });
    
    return res.status(500).json({
      success: false,
      error: {
        type: 'DATABASE_ERROR',
        message: 'Database error occurred'
      }
    });
  }
  
  next(error);
}

/**
 * Rate limiting error handler
 */
function rateLimitErrorHandler(error, req, res, next) {
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      error: {
        type: 'RATE_LIMIT_ERROR',
        message: 'Too many requests. Please try again later.',
        retryAfter: error.retryAfter
      }
    });
  }
  
  next(error);
}

/**
 * Final error handler
 */
const finalErrorHandler = ErrorHandler.expressErrorHandler();

module.exports = {
  notFoundHandler,
  asyncHandler,
  botAsyncHandler,
  validationErrorHandler,
  jwtErrorHandler,
  mongoErrorHandler,
  rateLimitErrorHandler,
  finalErrorHandler
};