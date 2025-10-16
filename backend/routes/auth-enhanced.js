const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../database-loader');
const config = require('../config');
const authService = require('../services/AuthService');
const secureLogger = require('../lib/secureLogger');
const { authenticateToken } = require('../middleware/auth');
const transactionManager = require('../lib/transactionManager');

const router = express.Router();

/**
 * Enhanced login endpoint with proper password authentication
 */
router.post('/login', async (req, res) => {
  const correlationId = req.correlationId;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    const { username, password, pin } = req.body;

    // Support both new password system and legacy PIN for migration
    const identifier = username || `pin:${pin}`;
    
    if (!identifier || (!password && !pin)) {
      secureLogger.logSecurity('warn', 'Login attempt with missing credentials', {
        identifier,
        ip,
        userAgent,
        correlationId
      });
      return res.status(400).json({ 
        error: 'Username and password are required',
        correlationId 
      });
    }

    // Check for lockout
    if (authService.isUserLockedOut(identifier)) {
      secureLogger.logSecurity('warn', 'Login attempt while locked out', {
        identifier,
        ip,
        userAgent,
        correlationId
      });
      return res.status(423).json({ 
        error: 'Account temporarily locked due to too many failed attempts. Please try again later.',
        correlationId 
      });
    }

    let user = null;
    let authValid = false;

    // Security: Add consistent timing to prevent timing attacks
    const startTime = Date.now();

    try {
      if (pin) {
        // Legacy PIN authentication (for migration period)
        const users = await db.query('SELECT id, name, role, pin_hash FROM users WHERE active = 1');
        
        for (const u of users) {
          if (await authService.verifyPassword(pin, u.pin_hash)) {
            user = u;
            authValid = true;
            break;
          }
        }
      } else {
        // New password authentication
        const userResult = await db.query(
          `SELECT u.id, u.name, u.role, u.rate, u.account_status, ua.password_hash
           FROM users u 
           LEFT JOIN user_auth ua ON u.id = ua.user_id 
           WHERE u.username = ? AND u.active = 1`,
          [username]
        );

        if (userResult.length > 0) {
          user = userResult[0];
          
          if (user.password_hash) {
            authValid = await authService.verifyPassword(password, user.password_hash);
          } else {
            // User hasn't migrated to password system yet
            secureLogger.logSecurity('info', 'User attempting login without password migration', {
              userId: user.id,
              correlationId
            });
          }
        }
      }

      // Ensure consistent timing
      const minExecutionTime = 200; // ms
      const executionTime = Date.now() - startTime;
      if (executionTime < minExecutionTime) {
        await new Promise(resolve => setTimeout(resolve, minExecutionTime - executionTime));
      }

      if (!authValid || !user) {
        authService.recordFailedAttempt(identifier, correlationId);
        
        secureLogger.logSecurity('warn', 'Authentication failed', {
          identifier,
          ip,
          userAgent,
          correlationId
        });

        return res.status(401).json({ 
          error: 'Invalid credentials',
          correlationId 
        });
      }

      // Check account status
      if (user.account_status !== 'active') {
        secureLogger.logSecurity('warn', 'Login attempt with inactive account', {
          userId: user.id,
          accountStatus: user.account_status,
          correlationId
        });
        return res.status(403).json({ 
          error: 'Account is not active',
          correlationId 
        });
      }

      // Clear failed attempts on successful login
      authService.clearFailedAttempts(identifier);

      // Generate tokens
      const accessToken = authService.generateAccessToken(user);
      const { refreshToken, tokenId } = authService.generateRefreshToken(user.id);

      // Log successful login in transaction
      await transactionManager.withTransaction(async (tx) => {
        // Update last login
        await tx.run(
          'UPDATE users SET last_login = datetime("now") WHERE id = ?',
          [user.id]
        );

        // Store refresh token in database
        await tx.run(`
          INSERT INTO refresh_tokens (token_id, user_id, token_hash, expires_at, ip_address, device_info)
          VALUES (?, ?, ?, datetime("now", "+7 days"), ?, ?)
        `, [tokenId, user.id, refreshToken, ip, userAgent]);

        // Log login history
        await tx.run(`
          INSERT INTO login_history (user_id, ip_address, user_agent, success, session_id)
          VALUES (?, ?, ?, 1, ?)
        `, [user.id, ip, userAgent, tokenId]);

        // Audit log
        await tx.run(
          'INSERT INTO audit_log (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
          [user.id, 'LOGIN', `User ${user.name} logged in successfully`, ip]
        );
      });

      secureLogger.logAuth('info', 'User login successful', {
        userId: user.id,
        username: user.name,
        role: user.role,
        ip,
        correlationId
      });

      // Set secure HTTP-only cookie for refresh token
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          rate: user.rate,
          role: user.role
        },
        expiresIn: '15m', // Access token expiry
        correlationId
      });

    } catch (authError) {
      secureLogger.logError(authError, {
        identifier,
        ip,
        correlationId,
        category: 'authentication'
      });
      throw authError;
    }

  } catch (error) {
    secureLogger.logError(error, {
      ip,
      userAgent,
      correlationId,
      category: 'login-error'
    });
    
    res.status(500).json({ 
      error: 'Authentication service temporarily unavailable',
      correlationId 
    });
  }
});

/**
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  const correlationId = req.correlationId;

  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ 
        error: 'Refresh token required',
        correlationId 
      });
    }

    const tokenData = await authService.refreshAccessToken(refreshToken);

    secureLogger.logAuth('info', 'Access token refreshed', {
      tokenId: tokenData.tokenId,
      correlationId
    });

    res.json({
      accessToken: tokenData.accessToken,
      expiresIn: '15m',
      correlationId
    });

  } catch (error) {
    secureLogger.logSecurity('warn', 'Refresh token validation failed', {
      error: error.message,
      correlationId
    });

    res.status(401).json({ 
      error: 'Invalid refresh token',
      correlationId 
    });
  }
});

/**
 * Logout endpoint - revoke refresh token
 */
router.post('/logout', authenticateToken, async (req, res) => {
  const correlationId = req.correlationId;

  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      // Decode to get token ID and revoke
      const decoded = jwt.verify(refreshToken, config.auth.refreshTokenSecret);
      authService.revokeRefreshToken(decoded.tokenId);

      // Mark token as revoked in database
      await db.run(
        'UPDATE refresh_tokens SET revoked = 1 WHERE token_id = ?',
        [decoded.tokenId]
      );
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    // Log logout
    await db.run(
      'INSERT INTO audit_log (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
      [req.user.id, 'LOGOUT', `User ${req.user.name} logged out`, req.ip]
    );

    secureLogger.logAuth('info', 'User logout successful', {
      userId: req.user.id,
      correlationId
    });

    res.json({ 
      message: 'Logged out successfully',
      correlationId 
    });

  } catch (error) {
    secureLogger.logError(error, {
      userId: req.user?.id,
      correlationId,
      category: 'logout-error'
    });

    res.status(500).json({ 
      error: 'Logout failed',
      correlationId 
    });
  }
});

/**
 * Verify JWT token with enhanced validation
 */
router.get('/verify', authenticateToken, async (req, res) => {
  const correlationId = req.correlationId;

  try {
    // Get fresh user data
    const userResult = await db.query(
      'SELECT id, name, username, rate, role, account_status, last_login FROM users WHERE id = ? AND active = 1',
      [req.user.id]
    );
    
    if (!userResult.length || userResult[0].account_status !== 'active') {
      secureLogger.logSecurity('warn', 'Token verification failed - user not found or inactive', {
        userId: req.user.id,
        correlationId
      });
      return res.status(401).json({ 
        error: 'User not found or inactive',
        correlationId 
      });
    }

    const user = userResult[0];

    secureLogger.logAuth('debug', 'Token verification successful', {
      userId: user.id,
      correlationId
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        rate: user.rate,
        role: user.role,
        lastLogin: user.last_login
      },
      correlationId
    });

  } catch (error) {
    secureLogger.logError(error, {
      userId: req.user?.id,
      correlationId,
      category: 'token-verification'
    });

    res.status(500).json({ 
      error: 'Token verification failed',
      correlationId 
    });
  }
});

/**
 * Change password endpoint
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  const correlationId = req.correlationId;

  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current password and new password are required',
        correlationId 
      });
    }

    // Get current password hash
    const authResult = await db.query(
      'SELECT password_hash FROM user_auth WHERE user_id = ?',
      [req.user.id]
    );

    if (!authResult.length) {
      return res.status(400).json({ 
        error: 'Password authentication not set up',
        correlationId 
      });
    }

    // Verify current password
    const isCurrentValid = await authService.verifyPassword(currentPassword, authResult[0].password_hash);
    
    if (!isCurrentValid) {
      secureLogger.logSecurity('warn', 'Password change failed - invalid current password', {
        userId: req.user.id,
        correlationId
      });
      return res.status(401).json({ 
        error: 'Current password is incorrect',
        correlationId 
      });
    }

    // Hash new password
    const newPasswordHash = await authService.hashPassword(newPassword);

    // Update password in transaction
    await transactionManager.withTransaction(async (tx) => {
      await tx.run(
        'UPDATE user_auth SET password_hash = ?, updated_at = datetime("now"), last_password_change = datetime("now") WHERE user_id = ?',
        [newPasswordHash, req.user.id]
      );

      // Revoke all existing refresh tokens for security
      await tx.run(
        'UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?',
        [req.user.id]
      );

      // Log password change
      await tx.run(
        'INSERT INTO audit_log (user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
        [req.user.id, 'PASSWORD_CHANGE', 'User changed password', req.ip]
      );
    });

    // Revoke refresh tokens from memory
    authService.revokeAllUserTokens(req.user.id);

    secureLogger.logSecurity('info', 'Password changed successfully', {
      userId: req.user.id,
      correlationId
    });

    res.json({ 
      message: 'Password changed successfully. Please log in again.',
      correlationId 
    });

  } catch (error) {
    secureLogger.logError(error, {
      userId: req.user?.id,
      correlationId,
      category: 'password-change'
    });

    res.status(500).json({ 
      error: 'Password change failed',
      correlationId 
    });
  }
});

module.exports = router;