/**
 * Centralized Error Handler
 * Markaziy xatolik boshqaruvi
 */

const isDebug = process.env.NODE_ENV === 'development' || process.env.API_DEBUG === 'true';

class ErrorHandler {
  /**
   * Xatolik turlari
   */
  static ERROR_TYPES = {
    VALIDATION: 'VALIDATION_ERROR',
    DATABASE: 'DATABASE_ERROR', 
    AUTHENTICATION: 'AUTHENTICATION_ERROR',
    AUTHORIZATION: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND_ERROR',
    BUSINESS_LOGIC: 'BUSINESS_LOGIC_ERROR',
    EXTERNAL_SERVICE: 'EXTERNAL_SERVICE_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
  };

  /**
   * Xatolikni loglash
   */
  static log(error, context = {}) {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      message: error.message,
      stack: error.stack,
      type: this.getErrorType(error),
      context
    };

    if (isDebug) {
      console.error('🚨 ERROR LOG:', errorInfo);
    } else {
      console.error(`🚨 ${errorInfo.type}: ${errorInfo.message}`);
    }

    // Bu yerda external logging service'ga yuborish mumkin
    // await this.sendToLoggingService(errorInfo);
  }

  /**
   * Xatolik turini aniqlash
   */
  static getErrorType(error) {
    if (error.name === 'ValidationError') return this.ERROR_TYPES.VALIDATION;
    if (error.name === 'CastError') return this.ERROR_TYPES.DATABASE;
    if (error.name === 'MongoError' || error.name === 'MongooseError') return this.ERROR_TYPES.DATABASE;
    if (error.name === 'JsonWebTokenError') return this.ERROR_TYPES.AUTHENTICATION;
    if (error.message?.includes('not found')) return this.ERROR_TYPES.NOT_FOUND;
    if (error.message?.includes('permission') || error.message?.includes('access')) return this.ERROR_TYPES.AUTHORIZATION;
    
    return this.ERROR_TYPES.UNKNOWN;
  }

  /**
   * Xatolikni formatlash (API uchun)
   */
  static formatApiError(error, req = null) {
    const type = this.getErrorType(error);
    const timestamp = new Date().toISOString();
    
    const response = {
      success: false,
      error: {
        type,
        message: this.getUserFriendlyMessage(error),
        timestamp,
        requestId: req?.id || 'unknown'
      }
    };

    // Debug rejimida qo'shimcha ma'lumot
    if (isDebug) {
      response.error.details = {
        originalMessage: error.message,
        stack: error.stack,
        path: req?.path,
        method: req?.method
      };
    }

    return response;
  }

  /**
   * Foydalanuvchi uchun tushunarli xabar
   */
  static getUserFriendlyMessage(error) {
    const type = this.getErrorType(error);
    
    switch (type) {
      case this.ERROR_TYPES.VALIDATION:
        return 'Kiritilgan ma\'lumotlar noto\'g\'ri!';
      case this.ERROR_TYPES.DATABASE:
        return 'Ma\'lumotlar bazasida xatolik!';
      case this.ERROR_TYPES.AUTHENTICATION:
        return 'Autentifikatsiya xatoligi!';
      case this.ERROR_TYPES.AUTHORIZATION:
        return 'Ruxsat yo\'q!';
      case this.ERROR_TYPES.NOT_FOUND:
        return 'Ma\'lumot topilmadi!';
      case this.ERROR_TYPES.BUSINESS_LOGIC:
        return error.message || 'Biznes logikasi xatoligi!';
      default:
        return 'Ichki server xatoligi!';
    }
  }

  /**
   * HTTP status kodini aniqlash
   */
  static getHttpStatus(error) {
    const type = this.getErrorType(error);
    
    switch (type) {
      case this.ERROR_TYPES.VALIDATION:
        return 400;
      case this.ERROR_TYPES.AUTHENTICATION:
        return 401;
      case this.ERROR_TYPES.AUTHORIZATION:
        return 403;
      case this.ERROR_TYPES.NOT_FOUND:
        return 404;
      case this.ERROR_TYPES.DATABASE:
        return 500;
      case this.ERROR_TYPES.EXTERNAL_SERVICE:
        return 502;
      default:
        return 500;
    }
  }

  /**
   * Express middleware uchun error handler
   */
  static expressErrorHandler() {
    return (error, req, res, next) => {
      this.log(error, {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        params: req.params,
        query: req.query
      });

      const status = this.getHttpStatus(error);
      const response = this.formatApiError(error, req);

      res.status(status).json(response);
    };
  }

  /**
   * Bot uchun error handler
   */
  static async botErrorHandler(error, ctx, customMessage = null) {
    this.log(error, {
      telegramId: ctx?.from?.id,
      chatId: ctx?.chat?.id,
      message: ctx?.message?.text,
      callbackData: ctx?.callbackQuery?.data
    });

    const message = customMessage || this.getUserFriendlyMessage(error);
    
    try {
      if (ctx?.answerCbQuery) {
        await ctx.answerCbQuery(message);
      } else if (ctx?.reply) {
        await ctx.reply(message);
      }
    } catch (replyError) {
      console.error('❌ Bot reply error:', replyError);
    }
  }

  /**
   * Async function uchun wrapper
   */
  static async safeExecute(asyncFn, context = {}) {
    try {
      return await asyncFn();
    } catch (error) {
      this.log(error, context);
      throw error;
    }
  }

  /**
   * Database operatsiyalari uchun wrapper
   */
  static async safeDatabaseOperation(operation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      this.log(error, {
        ...context,
        operation: 'database'
      });
      
      // Database xatoligini qayta throw qilish
      throw new Error(this.getUserFriendlyMessage(error));
    }
  }

  /**
   * Validation error'ni formatlash
   */
  static formatValidationError(validationError) {
    const errors = [];
    
    if (validationError.errors) {
      Object.keys(validationError.errors).forEach(field => {
        errors.push({
          field,
          message: validationError.errors[field].message
        });
      });
    }
    
    return {
      success: false,
      error: {
        type: this.ERROR_TYPES.VALIDATION,
        message: 'Validation error',
        details: errors
      }
    };
  }

  /**
   * Xatolik statistikasi
   */
  static getErrorStats() {
    // Bu yerda error statistikalarini qaytarish mumkin
    return {
      totalErrors: 0,
      errorsByType: {},
      recentErrors: []
    };
  }
}

module.exports = ErrorHandler;