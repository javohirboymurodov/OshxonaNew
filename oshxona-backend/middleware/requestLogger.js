// middleware/requestLogger.js
const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.http(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.method === 'POST' || req.method === 'PUT' ? 
      sanitizeBody(req.body) : undefined
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - start;
    
    logger.http(`Response ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      responseSize: JSON.stringify(body).length
    });

    return originalJson.call(this, body);
  };

  next();
};

// Sanitize sensitive data from logs
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  
  const sensitive = ['password', 'token', 'secret', 'key', 'auth'];
  const sanitized = { ...body };
  
  for (const key in sanitized) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

module.exports = requestLogger;