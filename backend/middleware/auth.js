const jwt = require('jsonwebtoken');
const secureLogger = require('../lib/secureLogger');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    secureLogger.logSecurity('warn', 'Authentication failed - no token', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      correlationId: req.correlationId
    });
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      secureLogger.logSecurity('warn', 'Authentication failed - invalid token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        error: err.message,
        correlationId: req.correlationId
      });
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    secureLogger.logAuth('info', 'User authenticated successfully', {
      userId: user.id,
      role: user.role,
      ip: req.ip,
      correlationId: req.correlationId
    });
    
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    secureLogger.logSecurity('warn', 'Admin access denied - insufficient privileges', {
      userId: req.user?.id,
      role: req.user?.role,
      url: req.url,
      ip: req.ip,
      correlationId: req.correlationId
    });
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  secureLogger.logSecurity('info', 'Admin access granted', {
    userId: req.user.id,
    url: req.url,
    correlationId: req.correlationId
  });
  
  next();
}

module.exports = { authenticateToken, requireAdmin };