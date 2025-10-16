const UserService = require('../services/UserService-enhanced');
const { ValidationError } = require('../lib/errors');

/**
 * Auth Controller - handles authentication and user management
 * Business logic is delegated to UserService
 */
class AuthController {
  constructor() {
    this.userService = new UserService();
  }

  /**
   * Register new user
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { email, password, name } = req.body;

      const user = await this.userService.createUser({
        email,
        password,
        name
      });

      // Generate tokens
      const tokens = this.userService.generateTokens(user);

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json({
        success: true,
        data: {
          user,
          accessToken: tokens.accessToken,
          expiresIn: tokens.expiresIn
        },
        message: 'User registered successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const { user, tokens } = await this.userService.authenticateUser(email, password);

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        data: {
          user,
          accessToken: tokens.accessToken,
          expiresIn: tokens.expiresIn
        },
        message: 'Login successful'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        throw new ValidationError('Refresh token not found');
      }

      const { user, tokens } = await this.userService.refreshToken(refreshToken);

      // Set new refresh token
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        data: {
          user,
          accessToken: tokens.accessToken,
          expiresIn: tokens.expiresIn
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user.userId;

      const user = await this.userService.getUserById(userId);

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   * PUT /api/auth/me
   */
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const updateData = req.body;

      // Remove sensitive fields that shouldn't be updated here
      delete updateData.password;
      delete updateData.role;
      delete updateData.is_active;

      const user = await this.userService.updateUser(userId, updateData);

      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   * PUT /api/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new ValidationError('Current password and new password are required');
      }

      await this.userService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate account
   * DELETE /api/auth/me
   */
  async deactivateAccount(req, res, next) {
    try {
      const userId = req.user.userId;
      const { password } = req.body;

      if (!password) {
        throw new ValidationError('Password confirmation is required');
      }

      // Verify password before deactivation
      const user = await this.userService.getUserById(userId);
      const isValidPassword = await user.verifyPassword(password);
      
      if (!isValidPassword) {
        throw new ValidationError('Invalid password');
      }

      await this.userService.deactivateUser(userId);

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Account deactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user statistics
   * GET /api/auth/stats
   */
  async getUserStats(req, res, next) {
    try {
      const userId = req.user.userId;

      const stats = await this.userService.getUserStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify token (for middleware)
   * GET /api/auth/verify
   */
  async verifyToken(req, res, next) {
    try {
      // If we reach here, the auth middleware has already verified the token
      res.json({
        success: true,
        data: {
          userId: req.user.userId,
          email: req.user.email,
          role: req.user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();