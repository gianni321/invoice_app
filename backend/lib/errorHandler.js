const logger = require('./logger');

/**
 * Standard error response structure
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error response formatter
 */
class ErrorHandler {
  /**
   * Create a standardized error response
   * @param {Error} error 
   * @param {Object} req 
   * @param {Object} res 
   * @param {Function} next 
   */
  static handleError(error, req, res, next) {
    const { statusCode = 500, message } = error;
    
    // Log the error
    logger.logError(error, req, {
      body: req.body,
      params: req.params,
      query: req.query
    });

    // Sanitize error message for production
    const sanitizedMessage = ErrorHandler.sanitizeError(error, req);
    
    // Send error response
    res.status(statusCode).json({
      success: false,
      error: {
        message: sanitizedMessage,
        statusCode,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      },
      // Include stack trace only in development
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        originalMessage: message 
      })
    });
  }

  /**
   * Sanitize error messages to avoid exposing sensitive information
   * @param {Error} error 
   * @param {Object} req 
   * @returns {string}
   */
  static sanitizeError(error, req) {
    const isProduction = process.env.NODE_ENV === 'production';
    const { statusCode = 500, message } = error;

    // In production, sanitize error messages
    if (isProduction) {
      // Client errors (4xx) - usually safe to show
      if (statusCode >= 400 && statusCode < 500) {
        // Still sanitize some specific cases
        if (message.includes('SQLITE_') || message.includes('SQL')) {
          return 'Invalid request';
        }
        if (message.includes('JWT') || message.includes('token')) {
          return 'Authentication required';
        }
        if (message.includes('password') || message.includes('pin')) {
          return 'Authentication failed';
        }
        return message;
      }
      
      // Server errors (5xx) - hide details in production
      return 'Internal server error';
    }

    // Development - show original message
    return message;
  }

  /**
   * Catch async errors and pass to error handler
   * @param {Function} fn 
   * @returns {Function}
   */
  static catchAsync(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Create standardized validation error
   * @param {string} message 
   * @param {Object} details 
   * @returns {ApiError}
   */
  static validationError(message, details = {}) {
    const error = new ApiError(400, message);
    error.details = details;
    return error;
  }

  /**
   * Create standardized authentication error
   * @param {string} message 
   * @returns {ApiError}
   */
  static authenticationError(message = 'Authentication required') {
    return new ApiError(401, message);
  }

  /**
   * Create standardized authorization error
   * @param {string} message 
   * @returns {ApiError}
   */
  static authorizationError(message = 'Insufficient permissions') {
    return new ApiError(403, message);
  }

  /**
   * Create standardized not found error
   * @param {string} resource 
   * @returns {ApiError}
   */
  static notFoundError(resource = 'Resource') {
    return new ApiError(404, `${resource} not found`);
  }

  /**
   * Create standardized conflict error
   * @param {string} message 
   * @returns {ApiError}
   */
  static conflictError(message) {
    return new ApiError(409, message);
  }

  /**
   * Create standardized rate limit error
   * @param {string} message 
   * @returns {ApiError}
   */
  static rateLimitError(message = 'Too many requests') {
    return new ApiError(429, message);
  }

  /**
   * Create standardized database error
   * @param {string} operation 
   * @param {Error} originalError 
   * @returns {ApiError}
   */
  static databaseError(operation, originalError) {
    logger.error('Database Error', {
      operation,
      error: originalError.message,
      stack: originalError.stack
    });

    // Sanitize database-specific error messages
    let message = 'Database operation failed';
    
    if (originalError.message.includes('UNIQUE constraint failed')) {
      message = 'Record already exists';
    } else if (originalError.message.includes('FOREIGN KEY constraint failed')) {
      message = 'Invalid reference to related record';
    } else if (originalError.message.includes('NOT NULL constraint failed')) {
      message = 'Required field is missing';
    }

    return new ApiError(500, message);
  }

  /**
   * Handle database constraint errors
   * @param {Error} error 
   * @returns {ApiError}
   */
  static handleDatabaseConstraintError(error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      if (error.message.includes('users.name')) {
        return new ApiError(409, 'User with this name already exists');
      }
      return new ApiError(409, 'Record already exists');
    }
    
    if (error.message.includes('FOREIGN KEY constraint failed')) {
      return new ApiError(400, 'Invalid reference to related record');
    }
    
    if (error.message.includes('NOT NULL constraint failed')) {
      const field = error.message.match(/NOT NULL constraint failed: \w+\.(\w+)/)?.[1];
      return new ApiError(400, `${field || 'Required field'} is required`);
    }

    return new ApiError(500, 'Database operation failed');
  }
}

/**
 * Success response formatter
 */
class SuccessHandler {
  /**
   * Send standardized success response
   * @param {Object} res 
   * @param {*} data 
   * @param {string} message 
   * @param {number} statusCode 
   */
  static sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send paginated response
   * @param {Object} res 
   * @param {Array} data 
   * @param {Object} pagination 
   * @param {string} message 
   */
  static sendPaginatedResponse(res, data, pagination, message = 'Success') {
    res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || data.length,
        totalPages: Math.ceil((pagination.total || data.length) / (pagination.limit || 10))
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send created response
   * @param {Object} res 
   * @param {*} data 
   * @param {string} message 
   */
  static sendCreated(res, data, message = 'Created successfully') {
    SuccessHandler.sendSuccess(res, data, message, 201);
  }

  /**
   * Send no content response
   * @param {Object} res 
   */
  static sendNoContent(res) {
    res.status(204).send();
  }
}

/**
 * Validation helper
 */
class ValidationHelper {
  /**
   * Validate required fields
   * @param {Object} data 
   * @param {Array} requiredFields 
   * @throws {ApiError}
   */
  static validateRequiredFields(data, requiredFields) {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw ErrorHandler.validationError(
        `Missing required fields: ${missingFields.join(', ')}`,
        { missingFields }
      );
    }
  }

  /**
   * Validate numeric field
   * @param {*} value 
   * @param {string} fieldName 
   * @param {Object} options 
   * @throws {ApiError}
   */
  static validateNumeric(value, fieldName, options = {}) {
    const { min, max, allowZero = true } = options;
    const numValue = Number.parseFloat(value);

    if (!Number.isFinite(numValue)) {
      throw ErrorHandler.validationError(`${fieldName} must be a valid number`);
    }

    if (!allowZero && numValue === 0) {
      throw ErrorHandler.validationError(`${fieldName} cannot be zero`);
    }

    if (numValue < 0) {
      throw ErrorHandler.validationError(`${fieldName} cannot be negative`);
    }

    if (min !== undefined && numValue < min) {
      throw ErrorHandler.validationError(`${fieldName} must be at least ${min}`);
    }

    if (max !== undefined && numValue > max) {
      throw ErrorHandler.validationError(`${fieldName} cannot exceed ${max}`);
    }

    return numValue;
  }

  /**
   * Validate date field
   * @param {*} value 
   * @param {string} fieldName 
   * @throws {ApiError}
   */
  static validateDate(value, fieldName) {
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
      throw ErrorHandler.validationError(`${fieldName} must be a valid date`);
    }

    return date;
  }

  /**
   * Validate enum field
   * @param {*} value 
   * @param {Array} allowedValues 
   * @param {string} fieldName 
   * @throws {ApiError}
   */
  static validateEnum(value, allowedValues, fieldName) {
    if (!allowedValues.includes(value)) {
      throw ErrorHandler.validationError(
        `${fieldName} must be one of: ${allowedValues.join(', ')}`
      );
    }

    return value;
  }
}

module.exports = {
  ApiError,
  ErrorHandler,
  SuccessHandler,
  ValidationHelper
};