const { User } = require('../models');
const { ValidationError, NotFoundError, ConflictError } = require('../lib/errors');
const jwt = require('jsonwebtoken');

/**
 * Enhanced User Service using Objection.js models
 * Handles all business logic for user management and authentication
 */
class UserService {
  /**
   * Create a new user
   * @param {Object} userData 
   * @returns {Promise<User>}
   */
  async createUser(userData) {
    await this.validateUserData(userData);

    // Check if email already exists
    const existingUser = await User.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    const user = await User.createUser({
      email: userData.email.toLowerCase(),
      password: userData.password,
      name: userData.name,
      role: userData.role || 'user'
    });

    return user;
  }

  /**
   * Authenticate user with email and password
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{user: User, tokens: Object}>}
   */
  async authenticateUser(email, password) {
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user with password field (normally excluded)
    const user = await User.query()
      .where('email', email.toLowerCase())
      .where('is_active', true)
      .first();

    if (!user) {
      throw new ValidationError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      throw new ValidationError('Invalid email or password');
    }

    // Update last login
    await user.updateLastLogin();

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user,
      tokens
    };
  }

  /**
   * Get user by ID
   * @param {number} userId 
   * @returns {Promise<User>}
   */
  async getUserById(userId) {
    const user = await User.query()
      .findById(userId)
      .where('is_active', true);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Get user by email
   * @param {string} email 
   * @returns {Promise<User>}
   */
  async getUserByEmail(email) {
    const user = await User.findByEmail(email);
    
    if (!user || !user.is_active) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   * @param {number} userId 
   * @param {Object} updateData 
   * @returns {Promise<User>}
   */
  async updateUser(userId, updateData) {
    const user = await User.query().findById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Validate update data
    await this.validateUserData(updateData, true);

    // Check email uniqueness if email is being updated
    if (updateData.email && updateData.email !== user.email) {
      const emailExists = await User.emailExists(updateData.email, userId);
      if (emailExists) {
        throw new ConflictError('Email already in use');
      }
      updateData.email = updateData.email.toLowerCase();
    }

    const updatedUser = await user.$query().patchAndFetch(updateData);
    return updatedUser;
  }

  /**
   * Change user password
   * @param {number} userId 
   * @param {string} currentPassword 
   * @param {string} newPassword 
   * @returns {Promise<boolean>}
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Get user with password field
    const user = await User.query()
      .findById(userId)
      .where('is_active', true);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isValidPassword = await user.verifyPassword(currentPassword);
    if (!isValidPassword) {
      throw new ValidationError('Current password is incorrect');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Update password
    await user.$query().patch({ password: newPassword });
    
    return true;
  }

  /**
   * Deactivate user account
   * @param {number} userId 
   * @returns {Promise<boolean>}
   */
  async deactivateUser(userId) {
    const user = await User.query().findById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await user.$query().patch({ is_active: false });
    return true;
  }

  /**
   * Get all users (admin only)
   * @param {Object} filters 
   * @returns {Promise<{users: User[], pagination: Object}>}
   */
  async getAllUsers(filters = {}) {
    const {
      role,
      isActive,
      search,
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = filters;

    let query = User.query();

    // Apply filters
    if (role) {
      query = query.where('role', role);
    }

    if (isActive !== undefined) {
      query = query.where('is_active', isActive);
    }

    if (search) {
      query = query.where(builder => {
        builder
          .where('name', 'like', `%${search}%`)
          .orWhere('email', 'like', `%${search}%`);
      });
    }

    // Apply sorting
    const validSortFields = ['name', 'email', 'created_at', 'last_login'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';
    
    query = query.orderBy(sortField, order);

    // Apply pagination
    const offset = (page - 1) * limit;
    const users = await query.offset(offset).limit(limit);

    // Get total count
    const totalQuery = User.query();
    if (role) totalQuery.where('role', role);
    if (isActive !== undefined) totalQuery.where('is_active', isActive);
    if (search) {
      totalQuery.where(builder => {
        builder
          .where('name', 'like', `%${search}%`)
          .orWhere('email', 'like', `%${search}%`);
      });
    }

    const [{ total }] = await totalQuery.count('* as total');
    const totalPages = Math.ceil(total / limit);

    return {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get user statistics
   * @param {number} userId 
   * @returns {Promise<Object>}
   */
  async getUserStats(userId) {
    const { Entry, Invoice } = require('../models');

    const [entryStats, invoiceStats] = await Promise.all([
      Entry.query()
        .where('user_id', userId)
        .groupBy('status')
        .select('status')
        .count('* as count')
        .sum('hours as totalHours'),
      
      Invoice.query()
        .where('user_id', userId)
        .groupBy('status')
        .select('status')
        .count('* as count')
        .sum('total_amount as totalAmount')
    ]);

    const stats = {
      entries: entryStats.reduce((acc, stat) => {
        acc[stat.status] = {
          count: parseInt(stat.count),
          hours: parseFloat(stat.totalHours) || 0
        };
        return acc;
      }, {}),
      
      invoices: invoiceStats.reduce((acc, stat) => {
        acc[stat.status] = {
          count: parseInt(stat.count),
          amount: parseFloat(stat.totalAmount) || 0
        };
        return acc;
      }, {})
    };

    // Calculate totals
    stats.totals = {
      entries: Object.values(stats.entries).reduce((sum, stat) => sum + stat.count, 0),
      hours: Object.values(stats.entries).reduce((sum, stat) => sum + stat.hours, 0),
      invoices: Object.values(stats.invoices).reduce((sum, stat) => sum + stat.count, 0),
      revenue: Object.values(stats.invoices).reduce((sum, stat) => sum + stat.amount, 0)
    };

    return stats;
  }

  /**
   * Generate JWT tokens for user
   * @private
   * @param {User} user 
   * @returns {Object}
   */
  generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: parseInt(process.env.JWT_EXPIRES_IN_SECONDS) || 3600
    };
  }

  /**
   * Refresh access token
   * @param {string} refreshToken 
   * @returns {Promise<Object>}
   */
  async refreshToken(refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      const user = await this.getUserById(payload.userId);
      
      const tokens = this.generateTokens(user);
      return { user, tokens };
    } catch (error) {
      throw new ValidationError('Invalid refresh token');
    }
  }

  /**
   * Validate user data
   * @private
   * @param {Object} userData 
   * @param {boolean} isUpdate 
   */
  async validateUserData(userData, isUpdate = false) {
    const errors = [];

    // Email validation
    if (!isUpdate || userData.email !== undefined) {
      if (!userData.email) {
        errors.push('Email is required');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
          errors.push('Invalid email format');
        } else if (userData.email.length > 255) {
          errors.push('Email must be 255 characters or less');
        }
      }
    }

    // Password validation
    if (!isUpdate || userData.password !== undefined) {
      if (!isUpdate && !userData.password) {
        errors.push('Password is required');
      } else if (userData.password) {
        this.validatePassword(userData.password);
      }
    }

    // Name validation
    if (userData.name !== undefined) {
      if (userData.name && userData.name.length > 255) {
        errors.push('Name must be 255 characters or less');
      }
    }

    // Role validation
    if (userData.role !== undefined) {
      if (!['user', 'admin'].includes(userData.role)) {
        errors.push('Role must be either "user" or "admin"');
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }

  /**
   * Validate password requirements
   * @private
   * @param {string} password 
   */
  validatePassword(password) {
    const errors = [];

    if (!password) {
      errors.push('Password is required');
      throw new ValidationError(errors.join(', '));
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 255) {
      errors.push('Password must be 255 characters or less');
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }
}

module.exports = UserService;