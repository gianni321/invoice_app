const { ErrorHandler, SuccessHandler, ValidationHelper, ApiError } = require('../lib/errorHandler');

describe('ErrorHandler', () => {
  describe('ApiError', () => {
    it('should create an ApiError with default values', () => {
      const error = new ApiError(400, 'Test error');

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Test error');
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should create an ApiError with custom values', () => {
      const error = new ApiError(500, 'Server error', false, 'custom stack');

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Server error');
      expect(error.isOperational).toBe(false);
      expect(error.stack).toBe('custom stack');
    });
  });

  describe('sanitizeError', () => {
    const mockReq = { user: { id: 1 } };

    it('should sanitize SQL errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = { statusCode: 500, message: 'SQLITE_ERROR: syntax error' };
      const sanitized = ErrorHandler.sanitizeError(error, mockReq);

      expect(sanitized).toBe('Internal server error');

      process.env.NODE_ENV = originalEnv;
    });

    it('should show client errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = { statusCode: 400, message: 'Invalid input' };
      const sanitized = ErrorHandler.sanitizeError(error, mockReq);

      expect(sanitized).toBe('Invalid input');

      process.env.NODE_ENV = originalEnv;
    });

    it('should show original message in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = { statusCode: 500, message: 'SQLITE_ERROR: syntax error' };
      const sanitized = ErrorHandler.sanitizeError(error, mockReq);

      expect(sanitized).toBe('SQLITE_ERROR: syntax error');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('static error creators', () => {
    it('should create validation error', () => {
      const error = ErrorHandler.validationError('Invalid data', { field: 'email' });

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid data');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create authentication error', () => {
      const error = ErrorHandler.authenticationError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
    });

    it('should create authorization error', () => {
      const error = ErrorHandler.authorizationError();

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Insufficient permissions');
    });

    it('should create not found error', () => {
      const error = ErrorHandler.notFoundError('User');

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
    });

    it('should create conflict error', () => {
      const error = ErrorHandler.conflictError('User already exists');

      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('User already exists');
    });
  });

  describe('handleDatabaseConstraintError', () => {
    it('should handle UNIQUE constraint error', () => {
      const dbError = new Error('UNIQUE constraint failed: users.name');
      const apiError = ErrorHandler.handleDatabaseConstraintError(dbError);

      expect(apiError.statusCode).toBe(409);
      expect(apiError.message).toBe('User with this name already exists');
    });

    it('should handle FOREIGN KEY constraint error', () => {
      const dbError = new Error('FOREIGN KEY constraint failed');
      const apiError = ErrorHandler.handleDatabaseConstraintError(dbError);

      expect(apiError.statusCode).toBe(400);
      expect(apiError.message).toBe('Invalid reference to related record');
    });

    it('should handle NOT NULL constraint error', () => {
      const dbError = new Error('NOT NULL constraint failed: users.name');
      const apiError = ErrorHandler.handleDatabaseConstraintError(dbError);

      expect(apiError.statusCode).toBe(400);
      expect(apiError.message).toBe('name is required');
    });

    it('should handle unknown database error', () => {
      const dbError = new Error('Unknown database error');
      const apiError = ErrorHandler.handleDatabaseConstraintError(dbError);

      expect(apiError.statusCode).toBe(500);
      expect(apiError.message).toBe('Database operation failed');
    });
  });
});

describe('SuccessHandler', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('sendSuccess', () => {
    it('should send success response with data', () => {
      const data = { id: 1, name: 'Test' };
      SuccessHandler.sendSuccess(mockRes, data, 'Operation successful');

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Operation successful',
        data: data,
        timestamp: expect.any(String)
      });
    });

    it('should send success response with custom status code', () => {
      SuccessHandler.sendSuccess(mockRes, null, 'Created', 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('sendCreated', () => {
    it('should send 201 created response', () => {
      const data = { id: 1 };
      SuccessHandler.sendCreated(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Created successfully',
        data: data,
        timestamp: expect.any(String)
      });
    });
  });

  describe('sendPaginatedResponse', () => {
    it('should send paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, total: 20 };

      SuccessHandler.sendPaginatedResponse(mockRes, data, pagination);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: data,
        pagination: {
          page: 1,
          limit: 10,
          total: 20,
          totalPages: 2
        },
        timestamp: expect.any(String)
      });
    });
  });
});

describe('ValidationHelper', () => {
  describe('validateRequiredFields', () => {
    it('should pass validation for complete data', () => {
      const data = { name: 'Test', email: 'test@example.com' };
      const required = ['name', 'email'];

      expect(() => {
        ValidationHelper.validateRequiredFields(data, required);
      }).not.toThrow();
    });

    it('should throw error for missing fields', () => {
      const data = { name: 'Test' };
      const required = ['name', 'email'];

      expect(() => {
        ValidationHelper.validateRequiredFields(data, required);
      }).toThrow('Missing required fields: email');
    });

    it('should throw error for empty string fields', () => {
      const data = { name: '', email: 'test@example.com' };
      const required = ['name', 'email'];

      expect(() => {
        ValidationHelper.validateRequiredFields(data, required);
      }).toThrow('Missing required fields: name');
    });
  });

  describe('validateNumeric', () => {
    it('should validate positive numbers', () => {
      const result = ValidationHelper.validateNumeric('123.45', 'amount');
      expect(result).toBe(123.45);
    });

    it('should reject non-numeric values', () => {
      expect(() => {
        ValidationHelper.validateNumeric('not-a-number', 'amount');
      }).toThrow('amount must be a valid number');
    });

    it('should reject negative numbers by default', () => {
      expect(() => {
        ValidationHelper.validateNumeric('-10', 'amount');
      }).toThrow('amount cannot be negative');
    });

    it('should validate range constraints', () => {
      expect(() => {
        ValidationHelper.validateNumeric('5', 'hours', { min: 1, max: 4 });
      }).toThrow('hours cannot exceed 4');

      expect(() => {
        ValidationHelper.validateNumeric('0.5', 'hours', { min: 1, max: 4 });
      }).toThrow('hours must be at least 1');
    });

    it('should reject zero when allowZero is false', () => {
      expect(() => {
        ValidationHelper.validateNumeric('0', 'amount', { allowZero: false });
      }).toThrow('amount cannot be zero');
    });
  });

  describe('validateDate', () => {
    it('should validate valid date strings', () => {
      const result = ValidationHelper.validateDate('2023-01-01', 'date');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2023);
    });

    it('should reject invalid date strings', () => {
      expect(() => {
        ValidationHelper.validateDate('invalid-date', 'date');
      }).toThrow('date must be a valid date');
    });
  });

  describe('validateEnum', () => {
    it('should validate allowed values', () => {
      const result = ValidationHelper.validateEnum('active', ['active', 'inactive'], 'status');
      expect(result).toBe('active');
    });

    it('should reject disallowed values', () => {
      expect(() => {
        ValidationHelper.validateEnum('pending', ['active', 'inactive'], 'status');
      }).toThrow('status must be one of: active, inactive');
    });
  });
});