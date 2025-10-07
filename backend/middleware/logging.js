const { v4: uuidv4 } = require('uuid');
const logger = require('../lib/logger');
const { ErrorHandler } = require('../lib/errorHandler');

/**
 * Middleware to add request ID to all requests
 */
const requestId = (req, res, next) => {
  req.requestId = req.get('X-Request-ID') || uuidv4();
  res.set('X-Request-ID', req.requestId);
  next();
};

/**
 * Middleware for HTTP request logging
 */
const requestLogging = (req, res, next) => {
  const start = Date.now();
  
  // Log request start
  logger.debug('Request Started', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id
  });

  // Override res.end to log when response is complete
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - start;
    
    // Log the completed request
    logger.logRequest(req, res, responseTime);
    
    // Call the original end method
    originalEnd.apply(this, args);
  };

  next();
};

/**
 * Middleware for performance monitoring
 */
const performanceMonitoring = (req, res, next) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
    
    // Log slow requests (over 1 second)
    if (duration > 1000) {
      logger.warn('Slow Request Detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        userId: req.user?.id
      });
    }
  });

  next();
};

/**
 * Enhanced error handling middleware with structured logging
 */
const errorLogging = (err, req, res, next) => {
  // Use the centralized error handler
  ErrorHandler.handleError(err, req, res, next);
};

/**
 * 404 handler with logging
 */
const notFoundHandler = (req, res) => {
  logger.warn('Route Not Found', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id
  });

  res.status(404).json({
    success: false,
    error: {
      message: 'Not found',
      statusCode: 404,
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = {
  requestId,
  requestLogging,
  performanceMonitoring,
  errorLogging,
  notFoundHandler
};