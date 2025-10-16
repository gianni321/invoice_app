const secureLogger = require('../lib/secureLogger');

/**
 * Middleware to add correlation IDs and request logging
 */
const requestLogging = (req, res, next) => {
  // Generate correlation ID for request tracking
  req.correlationId = secureLogger.generateCorrelationId();
  
  // Add correlation ID to response headers for debugging
  res.setHeader('X-Correlation-ID', req.correlationId);

  // Track request start time
  const startTime = Date.now();

  // Log request completion
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    secureLogger.logRequest(req, res, duration);
    originalSend.call(this, body);
  };

  next();
};

module.exports = requestLogging;