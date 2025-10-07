const crypto = require('crypto');
const logger = require('./logger');

/**
 * Security configuration validator and utilities
 */
class SecurityConfig {
  /**
   * Validate all security-related environment variables
   */
  static validateEnvironment() {
    const errors = [];
    const warnings = [];

    // JWT Secret validation
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      errors.push('JWT_SECRET is required');
    } else if (jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    } else if (jwtSecret === 'replace_this_with_a_secure_random_string_at_least_32_chars_long_for_production') {
      warnings.push('JWT_SECRET is using the default example value - should be changed for production');
    } else if (/^(.)\1+$/.test(jwtSecret)) {
      warnings.push('JWT_SECRET appears to use repeating characters - consider using a more random value');
    }

    // NODE_ENV validation
    const nodeEnv = process.env.NODE_ENV;
    if (!nodeEnv) {
      warnings.push('NODE_ENV is not set - defaulting to development');
    } else if (!['development', 'production', 'test'].includes(nodeEnv)) {
      warnings.push(`NODE_ENV value "${nodeEnv}" is not standard - should be development, production, or test`);
    }

    // Session secret validation (if sessions are used)
    const sessionSecret = process.env.SESSION_SECRET;
    if (sessionSecret) {
      if (sessionSecret.length < 32) {
        errors.push('SESSION_SECRET must be at least 32 characters long');
      } else if (sessionSecret === 'replace_this_with_another_secure_random_string_for_sessions') {
        warnings.push('SESSION_SECRET is using the default example value');
      }
    }

    // SMTP password validation
    const smtpPass = process.env.SMTP_PASS;
    if (smtpPass && smtpPass === 'your_sendgrid_api_key_here') {
      warnings.push('SMTP_PASS is using the default example value');
    }

    // Database path validation
    const dbPath = process.env.DB_PATH;
    if (!dbPath) {
      warnings.push('DB_PATH is not set - using default timetracker.db');
    }

    // CORS origins validation
    const allowedOrigins = process.env.ALLOWED_ORIGINS;
    if (!allowedOrigins) {
      warnings.push('ALLOWED_ORIGINS is not set - using default localhost origins');
    } else if (nodeEnv === 'production' && allowedOrigins.includes('localhost')) {
      warnings.push('ALLOWED_ORIGINS contains localhost in production environment');
    }

    // Port validation
    const port = process.env.PORT;
    if (port && (isNaN(port) || port < 1 || port > 65535)) {
      errors.push('PORT must be a valid port number (1-65535)');
    }

    // Log results
    if (errors.length > 0) {
      logger.error('Security Configuration Errors:', { errors });
      throw new Error(`Security configuration errors: ${errors.join(', ')}`);
    }

    if (warnings.length > 0) {
      logger.warn('Security Configuration Warnings:', { warnings });
    }

    logger.info('Security configuration validated successfully');
  }

  /**
   * Generate a secure random string for secrets
   * @param {number} length 
   * @returns {string}
   */
  static generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Check if running in production
   * @returns {boolean}
   */
  static isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Check if running in development
   * @returns {boolean}
   */
  static isDevelopment() {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Get sanitized environment info for logging
   * @returns {Object}
   */
  static getEnvironmentInfo() {
    return {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      hasSmtpConfig: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
      allowedOriginsCount: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').length : 0,
      logLevel: process.env.LOG_LEVEL
    };
  }

  /**
   * Get security headers configuration
   * @returns {Object}
   */
  static getSecurityHeaders() {
    const isProduction = SecurityConfig.isProduction();
    
    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: [
            "'self'",
            ...(isProduction ? [] : ["http://localhost:3001", "http://localhost:5173"])
          ],
          scriptSrc: ["'self'", ...(isProduction ? [] : ["'unsafe-inline'"])],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: isProduction ? 31536000 : 0,
        includeSubDomains: isProduction,
        preload: isProduction
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: "no-referrer" },
      xssFilter: true
    };
  }

  /**
   * Get rate limiting configuration
   * @returns {Object}
   */
  static getRateLimitConfig() {
    return {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        statusCode: 429,
        timestamp: new Date().toISOString()
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/api/health';
      }
    };
  }

  /**
   * Validate SMTP configuration
   * @returns {boolean}
   */
  static validateSmtpConfig() {
    const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      logger.warn('SMTP configuration incomplete', { missing });
      return false;
    }
    
    return true;
  }

  /**
   * Get database configuration
   * @returns {Object}
   */
  static getDatabaseConfig() {
    return {
      path: process.env.DB_PATH || 'timetracker.db',
      options: {
        // Enable foreign key constraints
        foreignKeys: true,
        // Set busy timeout
        busyTimeout: 30000,
        // Journal mode for better concurrency
        journalMode: 'WAL'
      }
    };
  }

  /**
   * Sanitize sensitive data from objects for logging
   * @param {Object} obj 
   * @returns {Object}
   */
  static sanitizeForLogging(obj) {
    const sensitiveKeys = [
      'password', 'pin', 'pin_hash', 'token', 'secret', 'key', 'auth',
      'jwt', 'bearer', 'authorization', 'cookie', 'session'
    ];
    
    const sanitized = { ...obj };
    
    for (const key in sanitized) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}

module.exports = SecurityConfig;