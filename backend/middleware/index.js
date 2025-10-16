/**
 * Centralized middleware exports
 * Provides a single point to import all middleware components
 */

const auth = require('./auth');
const { errorHandler, notFoundHandler, asyncHandler } = require('./errorHandler');
const { validateBody, validateQuery, validateParams, validations } = require('./validation');
const logging = require('./logging');

// Export all middleware components
module.exports = {
  // Authentication middleware
  authenticateToken: auth.authenticateToken,
  requireAuth: auth.requireAuth,
  requireAdmin: auth.requireAdmin,
  optionalAuth: auth.optionalAuth,
  
  // Error handling middleware
  errorHandler,
  notFoundHandler,
  asyncHandler,
  
  // Validation middleware
  validateBody,
  validateQuery,
  validateParams,
  validations,
  
  // Logging middleware
  requestLogger: logging.requestLogger,
  correlationId: logging.correlationId,
  
  // Legacy exports for compatibility
  auth,
  logging,
  
  // Rate limiting
  createRateLimit: (options = {}) => {
    const rateLimit = require('express-rate-limit');
    return rateLimit({
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
      max: options.max || 100, // limit each IP to 100 requests per windowMs
      message: options.message || {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      ...options
    });
  },
  
  // Security headers
  securityHeaders: (req, res, next) => {
    // Remove powered by header
    res.removeHeader('X-Powered-By');
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add cache control for sensitive routes
    if (req.path.includes('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  }
};