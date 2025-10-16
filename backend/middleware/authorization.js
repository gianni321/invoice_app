const secureLogger = require('../lib/secureLogger');

/**
 * Comprehensive Role-Based Access Control (RBAC) middleware
 * Provides fine-grained permission checking for protected routes
 */

// Define role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  'user': 1,
  'manager': 2,
  'admin': 3,
  'superadmin': 4
};

// Define permissions for different operations
const PERMISSIONS = {
  // User management
  'users:read': ['admin', 'superadmin'],
  'users:write': ['admin', 'superadmin'],
  'users:delete': ['superadmin'],
  
  // Own profile management
  'profile:read': ['user', 'manager', 'admin', 'superadmin'],
  'profile:write': ['user', 'manager', 'admin', 'superadmin'],
  
  // Time entries
  'entries:read:own': ['user', 'manager', 'admin', 'superadmin'],
  'entries:write:own': ['user', 'manager', 'admin', 'superadmin'],
  'entries:read:all': ['manager', 'admin', 'superadmin'],
  'entries:write:all': ['admin', 'superadmin'],
  'entries:delete:own': ['user', 'manager', 'admin', 'superadmin'],
  'entries:delete:all': ['admin', 'superadmin'],
  
  // Invoices
  'invoices:read:own': ['user', 'manager', 'admin', 'superadmin'],
  'invoices:write:own': ['user', 'manager', 'admin', 'superadmin'],
  'invoices:read:all': ['manager', 'admin', 'superadmin'],
  'invoices:write:all': ['admin', 'superadmin'],
  'invoices:delete:own': ['manager', 'admin', 'superadmin'],
  'invoices:delete:all': ['admin', 'superadmin'],
  'invoices:approve': ['manager', 'admin', 'superadmin'],
  
  // Analytics and reporting
  'analytics:read:own': ['user', 'manager', 'admin', 'superadmin'],
  'analytics:read:all': ['manager', 'admin', 'superadmin'],
  'reports:export': ['manager', 'admin', 'superadmin'],
  
  // Administrative functions
  'admin:settings': ['admin', 'superadmin'],
  'admin:bulk_operations': ['admin', 'superadmin'],
  'admin:audit_logs': ['admin', 'superadmin'],
  'admin:system_health': ['admin', 'superadmin'],
  
  // System administration
  'system:backup': ['superadmin'],
  'system:maintenance': ['superadmin'],
  'system:configuration': ['superadmin']
};

/**
 * Check if user has required permission
 */
function hasPermission(userRole, permission) {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    return false; // Permission not defined = denied
  }
  
  return allowedRoles.includes(userRole);
}

/**
 * Check if user role is at least the required level
 */
function hasMinimumRole(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
}

/**
 * Check if user can access resource owned by another user
 */
function canAccessResource(userRole, userId, resourceOwnerId) {
  // Users can always access their own resources
  if (userId === resourceOwnerId) {
    return true;
  }
  
  // Managers and above can access other users' resources
  return hasMinimumRole(userRole, 'manager');
}

/**
 * Middleware factory for permission-based authorization
 */
function requirePermission(permission) {
  return (req, res, next) => {
    const correlationId = req.correlationId;
    
    if (!req.user) {
      secureLogger.logSecurity('warn', 'Authorization failed - no user context', {
        permission,
        url: req.url,
        method: req.method,
        correlationId
      });
      return res.status(401).json({ 
        error: 'Authentication required',
        correlationId 
      });
    }

    const userRole = req.user.role;
    
    if (!hasPermission(userRole, permission)) {
      secureLogger.logSecurity('warn', 'Authorization failed - insufficient permissions', {
        userId: req.user.id,
        userRole,
        requiredPermission: permission,
        url: req.url,
        method: req.method,
        correlationId
      });
      
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        correlationId 
      });
    }

    secureLogger.logSecurity('debug', 'Authorization successful', {
      userId: req.user.id,
      userRole,
      permission,
      correlationId
    });

    next();
  };
}

/**
 * Middleware factory for role-based authorization
 */
function requireRole(requiredRole) {
  return (req, res, next) => {
    const correlationId = req.correlationId;
    
    if (!req.user) {
      secureLogger.logSecurity('warn', 'Authorization failed - no user context', {
        requiredRole,
        url: req.url,
        correlationId
      });
      return res.status(401).json({ 
        error: 'Authentication required',
        correlationId 
      });
    }

    const userRole = req.user.role;
    
    if (!hasMinimumRole(userRole, requiredRole)) {
      secureLogger.logSecurity('warn', 'Authorization failed - insufficient role', {
        userId: req.user.id,
        userRole,
        requiredRole,
        url: req.url,
        correlationId
      });
      
      return res.status(403).json({ 
        error: 'Insufficient role permissions',
        required: requiredRole,
        current: userRole,
        correlationId 
      });
    }

    next();
  };
}

/**
 * Middleware for resource ownership validation
 */
function requireOwnershipOrRole(requiredRole = 'manager') {
  return (req, res, next) => {
    const correlationId = req.correlationId;
    
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        correlationId 
      });
    }

    // Extract resource owner ID from various sources
    const resourceOwnerId = req.params.userId || 
                           req.body.userId || 
                           req.query.userId ||
                           req.resourceOwnerId; // Can be set by previous middleware

    if (!resourceOwnerId) {
      secureLogger.logSecurity('warn', 'Authorization failed - no resource owner specified', {
        userId: req.user.id,
        url: req.url,
        correlationId
      });
      return res.status(400).json({ 
        error: 'Resource owner not specified',
        correlationId 
      });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user owns the resource or has sufficient role
    if (!canAccessResource(userRole, userId, parseInt(resourceOwnerId))) {
      secureLogger.logSecurity('warn', 'Authorization failed - cannot access resource', {
        userId,
        userRole,
        resourceOwnerId,
        requiredRole,
        correlationId
      });
      
      return res.status(403).json({ 
        error: 'Cannot access resource - insufficient permissions',
        correlationId 
      });
    }

    // Store ownership info for later use
    req.isOwner = (userId === parseInt(resourceOwnerId));
    req.hasElevatedAccess = hasMinimumRole(userRole, requiredRole);

    next();
  };
}

/**
 * Middleware for API key based authorization (for system integrations)
 */
function requireApiKey(permissions = []) {
  return (req, res, next) => {
    const correlationId = req.correlationId;
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key required',
        correlationId 
      });
    }

    // In production, validate against database
    const validApiKey = process.env.API_KEY;
    
    if (!validApiKey || apiKey !== validApiKey) {
      secureLogger.logSecurity('warn', 'Invalid API key provided', {
        providedKey: apiKey.substring(0, 8) + '...',
        ip: req.ip,
        correlationId
      });
      
      return res.status(401).json({ 
        error: 'Invalid API key',
        correlationId 
      });
    }

    // Set API context
    req.isApiRequest = true;
    req.apiPermissions = permissions;

    secureLogger.logSecurity('info', 'API key authorization successful', {
      permissions,
      correlationId
    });

    next();
  };
}

/**
 * Conditional authorization - require authentication OR API key
 */
function requireAuthOrApiKey(permissions = []) {
  return (req, res, next) => {
    const hasAuth = req.user && req.user.id;
    const hasApiKey = req.headers['x-api-key'];

    if (!hasAuth && !hasApiKey) {
      return res.status(401).json({ 
        error: 'Authentication or API key required',
        correlationId: req.correlationId 
      });
    }

    if (hasApiKey && !hasAuth) {
      // Use API key authorization
      return requireApiKey(permissions)(req, res, next);
    }

    // Use regular user authorization
    next();
  };
}

/**
 * Rate limiting based on user role
 */
function rateLimitByRole() {
  const roleLimits = {
    'user': 100,
    'manager': 200,
    'admin': 500,
    'superadmin': 1000
  };

  return (req, res, next) => {
    const userRole = req.user?.role || 'user';
    const limit = roleLimits[userRole] || roleLimits.user;
    
    req.rateLimit = {
      max: limit,
      windowMs: 15 * 60 * 1000 // 15 minutes
    };

    next();
  };
}

/**
 * Audit middleware for sensitive operations
 */
function auditSensitiveOperation(operation) {
  return (req, res, next) => {
    const correlationId = req.correlationId;
    
    // Log the operation attempt
    secureLogger.logSecurity('info', `Sensitive operation attempted: ${operation}`, {
      userId: req.user?.id,
      userRole: req.user?.role,
      operation,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId
    });

    // Override res.json to log the result
    const originalJson = res.json;
    res.json = function(data) {
      secureLogger.logSecurity('info', `Sensitive operation completed: ${operation}`, {
        userId: req.user?.id,
        operation,
        statusCode: res.statusCode,
        success: res.statusCode < 400,
        correlationId
      });
      
      return originalJson.call(this, data);
    };

    next();
  };
}

module.exports = {
  // Main authorization functions
  requirePermission,
  requireRole,
  requireOwnershipOrRole,
  requireApiKey,
  requireAuthOrApiKey,
  
  // Utility functions
  hasPermission,
  hasMinimumRole,
  canAccessResource,
  rateLimitByRole,
  auditSensitiveOperation,
  
  // Constants for external use
  PERMISSIONS,
  ROLE_HIERARCHY,
  
  // Convenience middleware for common patterns
  requireAdmin: requireRole('admin'),
  requireManager: requireRole('manager'),
  requireUser: requireRole('user'),
  
  // Common permission combinations
  requireUserRead: requirePermission('entries:read:own'),
  requireUserWrite: requirePermission('entries:write:own'),
  requireAdminRead: requirePermission('admin:settings'),
  requireSystemAdmin: requireRole('superadmin')
};