require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { generalLimiter, authLimiter, adminLimiter } = require('./middleware/rateLimiting');
const requestLogging = require('./middleware/requestLogging');
const authRoutes = require('./routes/auth');
const entryRoutes = require('./routes/entries');
const invoiceRoutes = require('./routes/invoices');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const secureLogger = require('./lib/secureLogger');
const SecurityConfig = require('./lib/security');
const { HealthMonitor, requestLogger, errorTracker, performanceMonitor } = require('./lib/monitoring');

// Validate security configuration
SecurityConfig.validateEnvironment();

// Validate configuration on startup
try {
  secureLogger.info('Configuration validated successfully');
} catch (error) {
  secureLogger.error('Configuration validation failed:', { error: error.message });
  process.exit(1);
}

const app = express();
const PORT = config.port;

// Log environment info
secureLogger.info('Starting server', {
  port: PORT,
  nodeEnv: config.nodeEnv,
  corsOrigins: config.cors.origins.length
});

// Security middleware
app.use(helmet(SecurityConfig.getSecurityHeaders()));

// Enhanced CORS configuration using config module
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (config.cors.origins.includes(origin)) {
      return callback(null, true);
    } else {
      secureLogger.logSecurity('warn', 'CORS rejected origin', { origin, ip: req?.ip });
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Enhanced rate limiting with different tiers
app.use('/api', generalLimiter); // Apply general rate limiting to all API routes
app.use('/api/auth', authLimiter); // Stricter rate limiting for auth
app.use('/api/admin', adminLimiter); // Strictest rate limiting for admin operations

// Middleware
app.use(express.json());

// Request logging with correlation IDs
app.use(requestLogging);

// Additional monitoring middleware
app.use(performanceMonitor);

// Request logging (replaced the previous simple logging)
// app.use((req, res, next) => {
//   console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
//   next();
// });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  secureLogger.info('Health check requested', { correlationId: req.correlationId });
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Replace the previous route handlers
app.use('*', notFoundHandler);

// Error handling middleware
app.use((err, req, res, next) => {
  secureLogger.logError(err, {
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    correlationId: req.correlationId,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    correlationId: req.correlationId
  });
});

// Initialize health monitoring
const Database = require('./database');
const healthMonitor = new HealthMonitor(app, Database.db);

const server = app.listen(PORT, '0.0.0.0', () => {
  secureLogger.info(`🚀 Server running on http://localhost:${PORT}`);
  secureLogger.info(`📊 API available at http://localhost:${PORT}/api`);
  secureLogger.info(`🏥 Health checks available at http://localhost:${PORT}/health`);
  secureLogger.info('Server startup completed successfully');
});

// Set server timeout
server.timeout = 120000; // 2 minutes

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string'
    ? 'Pipe ' + PORT
    : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      secureLogger.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      secureLogger.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Handle graceful shutdown
const gracefulShutdown = (signal) => {
  secureLogger.info(`${signal} signal received. Starting graceful shutdown...`);
  server.close((err) => {
    if (err) {
      secureLogger.error('Error during server shutdown:', { error: err.message });
      process.exit(1);
    }
    secureLogger.info('Server closed successfully');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    secureLogger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors with restart capability
process.on('uncaughtException', (error) => {
  secureLogger.logError(error, { category: 'uncaught-exception' });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  secureLogger.error('Unhandled Rejection', { reason, promise, category: 'unhandled-rejection' });
  gracefulShutdown('UNHANDLED_REJECTION');
});