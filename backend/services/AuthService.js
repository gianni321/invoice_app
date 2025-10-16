const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const secureLogger = require('../lib/secureLogger');
const config = require('../config');

/**
 * Enhanced authentication service with proper password policies and refresh tokens
 */
class AuthService {
  constructor() {
    this.saltRounds = 12; // Higher salt rounds for better security
    this.refreshTokens = new Map(); // In production, use Redis or database
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.loginAttempts = new Map(); // Track failed login attempts
  }

  /**
   * Validate password policy
   */
  validatePassword(password) {
    const minLength = 8;
    const maxLength = 128;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (password.length > maxLength) {
      errors.push(`Password must be no more than ${maxLength} characters long`);
    }

    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }

    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '123456', 'admin', 'qwerty', 'password123'];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a more secure password');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password) {
    try {
      const validation = this.validatePassword(password);
      if (!validation.isValid) {
        throw new Error(`Invalid password: ${validation.errors.join(', ')}`);
      }

      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      secureLogger.logError(error, { category: 'password-hashing' });
      throw error;
    }
  }

  /**
   * Verify password with timing attack protection
   */
  async verifyPassword(password, hash) {
    try {
      // Always perform hash comparison to prevent timing attacks
      const isValid = await bcrypt.compare(password, hash);
      
      // Add small random delay to further prevent timing attacks
      const delay = Math.floor(Math.random() * 50) + 50; // 50-100ms
      await new Promise(resolve => setTimeout(resolve, delay));

      return isValid;
    } catch (error) {
      secureLogger.logError(error, { category: 'password-verification' });
      // Always return false on error to prevent bypassing
      return false;
    }
  }

  /**
   * Check if user is locked out due to failed attempts
   */
  isUserLockedOut(identifier) {
    const attempts = this.loginAttempts.get(identifier);
    if (!attempts) return false;

    const now = Date.now();
    if (attempts.count >= this.maxLoginAttempts && 
        (now - attempts.lastAttempt) < this.lockoutDuration) {
      return true;
    }

    // Reset attempts if lockout period has passed
    if ((now - attempts.lastAttempt) >= this.lockoutDuration) {
      this.loginAttempts.delete(identifier);
      return false;
    }

    return false;
  }

  /**
   * Record failed login attempt
   */
  recordFailedAttempt(identifier, correlationId) {
    const now = Date.now();
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    
    attempts.count += 1;
    attempts.lastAttempt = now;
    
    this.loginAttempts.set(identifier, attempts);

    secureLogger.logSecurity('warn', 'Failed login attempt recorded', {
      identifier,
      attemptCount: attempts.count,
      correlationId
    });

    // Log lockout
    if (attempts.count >= this.maxLoginAttempts) {
      secureLogger.logSecurity('warn', 'User account locked due to failed attempts', {
        identifier,
        lockoutDuration: this.lockoutDuration / 1000 / 60, // minutes
        correlationId
      });
    }
  }

  /**
   * Clear failed login attempts on successful login
   */
  clearFailedAttempts(identifier) {
    this.loginAttempts.delete(identifier);
  }

  /**
   * Generate access token (short-lived)
   */
  generateAccessToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    return jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.accessTokenExpiry,
      issuer: 'invoice-app',
      audience: 'invoice-app-users'
    });
  }

  /**
   * Generate refresh token (long-lived)
   */
  generateRefreshToken(userId) {
    const tokenId = uuidv4();
    const refreshToken = jwt.sign(
      { userId, tokenId },
      config.auth.refreshTokenSecret,
      {
        expiresIn: config.auth.refreshTokenExpiry,
        issuer: 'invoice-app',
        audience: 'invoice-app-users'
      }
    );

    // Store refresh token (in production, use Redis or database)
    this.refreshTokens.set(tokenId, {
      userId,
      createdAt: Date.now(),
      lastUsed: Date.now()
    });

    return { refreshToken, tokenId };
  }

  /**
   * Verify and refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.auth.refreshTokenSecret);
      const storedToken = this.refreshTokens.get(decoded.tokenId);

      if (!storedToken || storedToken.userId !== decoded.userId) {
        throw new Error('Invalid refresh token');
      }

      // Update last used timestamp
      storedToken.lastUsed = Date.now();
      this.refreshTokens.set(decoded.tokenId, storedToken);

      // Return new access token (refresh token remains the same)
      return {
        accessToken: this.generateAccessToken({ id: decoded.userId }),
        tokenId: decoded.tokenId
      };
    } catch (error) {
      secureLogger.logSecurity('warn', 'Refresh token verification failed', {
        error: error.message
      });
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Revoke refresh token
   */
  revokeRefreshToken(tokenId) {
    const deleted = this.refreshTokens.delete(tokenId);
    
    if (deleted) {
      secureLogger.logSecurity('info', 'Refresh token revoked', { tokenId });
    }
    
    return deleted;
  }

  /**
   * Revoke all refresh tokens for a user
   */
  revokeAllUserTokens(userId) {
    let revokedCount = 0;
    
    for (const [tokenId, tokenData] of this.refreshTokens.entries()) {
      if (tokenData.userId === userId) {
        this.refreshTokens.delete(tokenId);
        revokedCount++;
      }
    }

    secureLogger.logSecurity('info', 'All user refresh tokens revoked', {
      userId,
      revokedCount
    });

    return revokedCount;
  }

  /**
   * Clean up expired refresh tokens
   */
  cleanupExpiredTokens() {
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    let cleanedCount = 0;

    for (const [tokenId, tokenData] of this.refreshTokens.entries()) {
      if ((now - tokenData.lastUsed) > maxAge) {
        this.refreshTokens.delete(tokenId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      secureLogger.info('Cleaned up expired refresh tokens', { cleanedCount });
    }

    return cleanedCount;
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.auth.jwtSecret);
    } catch (error) {
      secureLogger.logSecurity('debug', 'Access token verification failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate secure session ID
   */
  generateSessionId() {
    return uuidv4();
  }
}

// Create singleton instance
const authService = new AuthService();

// Set up periodic cleanup of expired tokens (run every hour)
setInterval(() => {
  authService.cleanupExpiredTokens();
}, 60 * 60 * 1000);

module.exports = authService;