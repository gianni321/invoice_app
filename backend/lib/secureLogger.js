const winston = require('winston');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Secure logging system with data sanitization and correlation IDs
 * Prevents logging of sensitive information while maintaining audit trail
 */
class SecureLogger {
  constructor() {
    this.sensitiveFields = [
      'password', 'pin', 'pin_hash', 'token', 'jwt', 'authorization',
      'cookie', 'session', 'secret', 'key', 'auth', 'bearer',
      'ssn', 'social_security', 'credit_card', 'ccn'
    ];

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'invoice-app' },
      transports: [
        // Error log - errors only
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        // Combined log - all levels
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });

    // Add console transport in development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  /**
   * Generate correlation ID for request tracking
   */
  generateCorrelationId() {
    return uuidv4();
  }

  /**
   * Sanitize object by removing sensitive fields
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.sensitiveFields.some(field => 
        lowerKey.includes(field)
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Log authentication events
   */
  logAuth(level, message, metadata = {}) {
    const correlationId = metadata.correlationId || this.generateCorrelationId();
    
    this.logger.log(level, message, {
      ...this.sanitizeData(metadata),
      correlationId,
      category: 'auth',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log API requests with sanitized data
   */
  logRequest(req, res, duration) {
    const correlationId = req.correlationId || this.generateCorrelationId();
    
    const requestData = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      correlationId
    };

    // Only log request body for certain endpoints and sanitize it
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      requestData.body = this.sanitizeData(req.body);
    }

    this.logger.info('API Request', requestData);
  }

  /**
   * Log database operations
   */
  logDatabase(operation, query, params, metadata = {}) {
    const correlationId = metadata.correlationId || this.generateCorrelationId();

    this.logger.info('Database Operation', {
      operation,
      query: query.substring(0, 200), // Limit query length
      paramCount: params?.length || 0,
      userId: metadata.userId,
      correlationId,
      category: 'database'
    });
  }

  /**
   * Log security events
   */
  logSecurity(level, event, metadata = {}) {
    const correlationId = metadata.correlationId || this.generateCorrelationId();

    this.logger.log(level, `Security Event: ${event}`, {
      ...this.sanitizeData(metadata),
      correlationId,
      category: 'security',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log business operations
   */
  logBusiness(level, operation, metadata = {}) {
    const correlationId = metadata.correlationId || this.generateCorrelationId();

    this.logger.log(level, `Business Operation: ${operation}`, {
      ...this.sanitizeData(metadata),
      correlationId,
      category: 'business',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log errors with stack trace but sanitized data
   */
  logError(error, metadata = {}) {
    const correlationId = metadata.correlationId || this.generateCorrelationId();

    this.logger.error('Application Error', {
      message: error.message,
      stack: error.stack,
      ...this.sanitizeData(metadata),
      correlationId,
      category: 'error'
    });
  }

  /**
   * Standard log levels
   */
  info(message, metadata = {}) {
    this.logger.info(message, this.sanitizeData(metadata));
  }

  warn(message, metadata = {}) {
    this.logger.warn(message, this.sanitizeData(metadata));
  }

  error(message, metadata = {}) {
    this.logger.error(message, this.sanitizeData(metadata));
  }

  debug(message, metadata = {}) {
    this.logger.debug(message, this.sanitizeData(metadata));
  }
}

// Create singleton instance
const secureLogger = new SecureLogger();

module.exports = secureLogger;