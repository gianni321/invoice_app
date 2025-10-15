const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Enhanced security middleware with global rate limiting
 * Protects all endpoints, not just authentication
 */

// General API rate limiting
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development
  skip: () => config.isDevelopment
});

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many login attempts from this IP, please try again in 15 minutes.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skip: () => config.isDevelopment
});

// Very strict rate limiting for admin operations
const adminLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // Limit admin operations
  message: {
    error: 'Too many admin requests from this IP, please try again later.',
    retryAfter: 600
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isDevelopment
});

// Export rate limiting middleware
module.exports = {
  generalLimiter,
  authLimiter,
  adminLimiter
};