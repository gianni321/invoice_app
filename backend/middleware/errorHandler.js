const { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError 
} = require('../lib/errors');
const { secureLogger } = require('../lib/secureLogger');

/**
 * Global error handling middleware
 * Standardizes error responses and logging
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  const errorContext = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
    correlationId: req.correlationId,
    stack: err.stack
  };

  // Mongoose/Database validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ValidationError(message);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = new ConflictError(message);
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    const message = 'Invalid ID format';
    error = new ValidationError(message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new UnauthorizedError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new UnauthorizedError('Token expired');
  }

  // Objection.js errors
  if (err.name === 'ValidationError' && err.type === 'ModelValidation') {
    const messages = Object.values(err.data).flat();
    error = new ValidationError(messages.join(', '));
  }

  if (err.name === 'UniqueViolationError') {
    const field = err.columns?.[0] || 'field';
    error = new ConflictError(`${field} already exists`);
  }

  if (err.name === 'NotFoundError') {
    error = new NotFoundError('Resource not found');
  }

  if (err.name === 'ForeignKeyViolationError') {
    error = new ValidationError('Referenced resource does not exist');
  }

  // Rate limit errors
  if (err.type === 'rate-limit') {
    error = new RateLimitError('Rate limit exceeded');
  }

  // Default to generic AppError if not already an instance
  if (!(error instanceof AppError)) {
    error = new AppError(
      process.env.NODE_ENV === 'production' 
        ? 'Something went wrong' 
        : err.message,
      500,
      'INTERNAL_ERROR'
    );
  }

  // Log based on severity
  if (error.statusCode >= 500) {
    secureLogger.error('Server error', {
      ...errorContext,
      error: {
        name: err.name,
        message: err.message,
        code: error.code,
        statusCode: error.statusCode
      }
    });
  } else if (error.statusCode >= 400) {
    secureLogger.warn('Client error', {
      ...errorContext,
      error: {
        name: err.name,
        message: err.message,
        code: error.code,
        statusCode: error.statusCode
      }
    });
  }

  // Build response
  const response = {
    success: false,
    error: error.message,
    code: error.code
  };

  // Add additional fields for specific error types
  if (error instanceof ValidationError && error.field) {
    response.field = error.field;
  }

  if (error instanceof RateLimitError && error.retryAfter) {
    res.set('Retry-After', error.retryAfter);
    response.retryAfter = error.retryAfter;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Add correlation ID for tracking
  if (req.correlationId) {
    response.correlationId = req.correlationId;
  }

  res.status(error.statusCode || 500).json(response);
};

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Async error wrapper
 * Catches async errors and passes them to error handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};