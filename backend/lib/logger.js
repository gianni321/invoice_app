const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(colors);

// Create log format for console (development)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Create log format for files (structured JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create log format for HTTP requests
const httpFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json(),
  winston.format.printf((info) => {
    const {
      timestamp,
      level,
      message,
      requestId,
      method,
      url,
      statusCode,
      responseTime,
      userAgent,
      ip,
      userId,
      ...meta
    } = info;

    return JSON.stringify({
      timestamp,
      level,
      message,
      requestId,
      method,
      url,
      statusCode,
      responseTime,
      userAgent,
      ip,
      userId,
      ...meta
    });
  })
);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Create transports
const transports = [];

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: level(),
      format: consoleFormat
    })
  );
}

// File transports
const logsDir = path.join(__dirname, '../logs');

transports.push(
  // All logs
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    level: 'info',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // Error logs only
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),

  // HTTP access logs
  new winston.transports.File({
    filename: path.join(logsDir, 'access.log'),
    level: 'http',
    format: httpFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
);

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat
    })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat
    })
  ]
});

// Create a stream object for morgan HTTP request logging
logger.stream = {
  write: (message) => logger.http(message.trim())
};

// Helper methods for structured logging
logger.logRequest = (req, res, responseTime) => {
  logger.http('HTTP Request', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id,
    contentLength: res.get('Content-Length')
  });
};

logger.logError = (error, req = null, context = {}) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context
  };

  if (req) {
    errorInfo.requestId = req.requestId;
    errorInfo.method = req.method;
    errorInfo.url = req.originalUrl || req.url;
    errorInfo.userAgent = req.get('User-Agent');
    errorInfo.ip = req.ip || req.connection.remoteAddress;
    errorInfo.userId = req.user?.id;
  }

  logger.error('Application Error', errorInfo);
};

logger.logDatabaseOperation = (operation, table, params = {}, duration = null) => {
  logger.debug('Database Operation', {
    operation,
    table,
    params,
    duration: duration ? `${duration}ms` : undefined
  });
};

logger.logAuthentication = (userId, userName, success, reason = null, req = null) => {
  const logData = {
    userId,
    userName,
    success,
    reason,
    timestamp: new Date().toISOString()
  };

  if (req) {
    logData.requestId = req.requestId;
    logData.ip = req.ip || req.connection.remoteAddress;
    logData.userAgent = req.get('User-Agent');
  }

  logger.info('Authentication Attempt', logData);
};

logger.logInvoiceAction = (action, invoiceId, userId, details = {}) => {
  logger.info('Invoice Action', {
    action,
    invoiceId,
    userId,
    ...details,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;