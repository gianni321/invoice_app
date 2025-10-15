const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

/**
 * Configuration module that safely loads and validates environment variables
 * Implements security best practices for sensitive configuration
 */
class Config {
  constructor() {
    this.validateRequiredEnvVars();
  }

  validateRequiredEnvVars() {
    const required = ['JWT_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate JWT secret length
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long for security');
    }
  }

  get port() {
    return parseInt(process.env.PORT) || 3001;
  }

  get nodeEnv() {
    return process.env.NODE_ENV || 'development';
  }

  get isProduction() {
    return this.nodeEnv === 'production';
  }

  get isDevelopment() {
    return this.nodeEnv === 'development';
  }

  get database() {
    return {
      path: process.env.DB_PATH || './timetracker.db',
      type: process.env.DB_TYPE || 'sqlite'
    };
  }

  get jwt() {
    return {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    };
  }

  get email() {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.EMAIL_FROM || process.env.MAIL_FROM
    };
  }

  get rateLimit() {
    return {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    };
  }

  get cors() {
    const defaultOrigins = 'http://localhost:3000,http://localhost:3002,http://localhost:3003';
    const origins = process.env.ALLOWED_ORIGINS || defaultOrigins;
    return {
      origins: origins.split(',').map(origin => origin.trim())
    };
  }

  get security() {
    return {
      sessionSecret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
    };
  }
}

module.exports = new Config();