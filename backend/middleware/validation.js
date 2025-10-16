const { ValidationError } = require('../lib/errors');
const validator = require('validator');

/**
 * Request validation middleware
 * Provides common validation patterns
 */

/**
 * Validate request body against schema
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware
 */
const validateBody = (schema) => (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      throw new ValidationError(message);
    }

    req.body = value;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Validate query parameters
 * @param {Object} schema - Validation schema  
 * @returns {Function} Express middleware
 */
const validateQuery = (schema) => (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      throw new ValidationError(message);
    }

    req.query = value;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Validate route parameters
 * @param {Object} schema - Validation schema
 * @returns {Function} Express middleware  
 */
const validateParams = (schema) => (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false
    });

    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      throw new ValidationError(message);
    }

    req.params = value;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Common validation helpers
 */
const validations = {
  /**
   * Validate pagination parameters
   */
  pagination: (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (page < 1) {
      return next(new ValidationError('Page must be greater than 0'));
    }

    if (limit < 1 || limit > 100) {
      return next(new ValidationError('Limit must be between 1 and 100'));
    }

    req.query.page = page;
    req.query.limit = limit;
    next();
  },

  /**
   * Validate date range parameters
   */
  dateRange: (req, res, next) => {
    const { startDate, endDate } = req.query;

    if (startDate && !validator.isDate(startDate)) {
      return next(new ValidationError('Invalid start date format'));
    }

    if (endDate && !validator.isDate(endDate)) {
      return next(new ValidationError('Invalid end date format'));
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return next(new ValidationError('Start date must be before end date'));
    }

    next();
  },

  /**
   * Validate ID parameter
   */
  validateId: (paramName = 'id') => (req, res, next) => {
    const id = parseInt(req.params[paramName]);

    if (!id || isNaN(id) || id < 1) {
      return next(new ValidationError(`Invalid ${paramName}`));
    }

    req.params[paramName] = id;
    next();
  },

  /**
   * Sanitize string inputs
   */
  sanitizeStrings: (req, res, next) => {
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Remove potentially dangerous characters
          obj[key] = validator.escape(obj[key].trim());
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    if (req.body && typeof req.body === 'object') {
      sanitizeObject(req.body);
    }

    if (req.query && typeof req.query === 'object') {
      sanitizeObject(req.query);
    }

    next();
  },

  /**
   * Validate email format
   */
  validateEmail: (field = 'email') => (req, res, next) => {
    const email = req.body[field];

    if (email && !validator.isEmail(email)) {
      return next(new ValidationError(`Invalid ${field} format`));
    }

    next();
  },

  /**
   * Validate password strength
   */
  validatePassword: (field = 'password') => (req, res, next) => {
    const password = req.body[field];

    if (!password) {
      return next();
    }

    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      return next(new ValidationError(errors.join(', ')));
    }

    next();
  },

  /**
   * Validate file upload
   */
  validateFile: (options = {}) => (req, res, next) => {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
      required = false
    } = options;

    if (!req.file && required) {
      return next(new ValidationError('File is required'));
    }

    if (req.file) {
      if (req.file.size > maxSize) {
        return next(new ValidationError(`File size exceeds ${maxSize / 1024 / 1024}MB limit`));
      }

      if (!allowedTypes.includes(req.file.mimetype)) {
        return next(new ValidationError(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`));
      }
    }

    next();
  },

  /**
   * Validate array input
   */
  validateArray: (field, options = {}) => (req, res, next) => {
    const {
      minLength = 0,
      maxLength = 100,
      itemType = 'string'
    } = options;

    const array = req.body[field];

    if (!Array.isArray(array)) {
      return next(new ValidationError(`${field} must be an array`));
    }

    if (array.length < minLength) {
      return next(new ValidationError(`${field} must have at least ${minLength} items`));
    }

    if (array.length > maxLength) {
      return next(new ValidationError(`${field} cannot have more than ${maxLength} items`));
    }

    // Validate item types
    const invalidItems = array.filter(item => typeof item !== itemType);
    if (invalidItems.length > 0) {
      return next(new ValidationError(`All items in ${field} must be of type ${itemType}`));
    }

    next();
  }
};

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
  validations
};