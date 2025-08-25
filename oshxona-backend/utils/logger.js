// utils/logger.js
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Custom format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  ),
);

// Console transport for development
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
});

// File transports
const errorFileTransport = new DailyRotateFile({
  filename: path.join(__dirname, '../logs/error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '14d',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
});

const combinedFileTransport = new DailyRotateFile({
  filename: path.join(__dirname, '../logs/combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'oshxona-backend' },
  transports: [
    errorFileTransport,
    combinedFileTransport
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(consoleTransport);
}

// HTTP request logging
logger.http = (message, meta = {}) => {
  logger.log('http', message, meta);
};

// Bot activity logging
logger.bot = (message, meta = {}) => {
  logger.info(`[BOT] ${message}`, meta);
};

// Database activity logging
logger.db = (message, meta = {}) => {
  logger.info(`[DB] ${message}`, meta);
};

// API activity logging
logger.api = (message, meta = {}) => {
  logger.info(`[API] ${message}`, meta);
};

// Socket activity logging
logger.socket = (message, meta = {}) => {
  logger.info(`[SOCKET] ${message}`, meta);
};

// Authentication logging
logger.auth = (message, meta = {}) => {
  logger.info(`[AUTH] ${message}`, meta);
};

// Security logging
logger.security = (message, meta = {}) => {
  logger.warn(`[SECURITY] ${message}`, meta);
};

module.exports = logger;