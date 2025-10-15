require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { generalLimiter, authLimiter, adminLimiter } = require('./middleware/rateLimiting');
const authRoutes = require('./routes/auth');
const entryRoutes = require('./routes/entries');
const invoiceRoutes = require('./routes/invoices');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const logger = require('./lib/logger');
const SecurityConfig = require('./lib/security');
const { HealthMonitor, requestLogger, errorTracker, performanceMonitor } = require('./lib/monitoring');
const { 
  requestId, 
  requestLogging, 
  performanceMonitoring, 
  errorLogging, 
  notFoundHandler 
} = require('./middleware/logging');

// Validate security configuration
SecurityConfig.validateEnvironment();

// Validate configuration on startup
try {
  logger.info('Configuration validated successfully');
} catch (error) {
  logger.error('Configuration validation failed:', error.message);
  process.exit(1);
}

const app = express();
const PORT = config.port;

// Log environment info
logger.info('Starting server', {
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
      logger.warn('CORS rejected origin:', origin);
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

// Request ID and logging middleware
app.use(requestId);
app.use(requestLogging);
app.use(performanceMonitoring);

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
  logger.info('Health check requested', { requestId: req.requestId });
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Replace the previous route handlers
app.use('*', notFoundHandler);

// Error handling
app.use(errorLogging);
app.use(errorTracker);

// Initialize health monitoring
const Database = require('./database');
const healthMonitor = new HealthMonitor(app, Database.db);

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(`📊 API available at http://localhost:${PORT}/api`);
  logger.info(`🏥 Health checks available at http://localhost:${PORT}/health`);
  logger.info('Server startup completed successfully');
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
      logger.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Handle graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} signal received. Starting graceful shutdown...`);
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown:', err);
      process.exit(1);
    }
    logger.info('Server closed successfully');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors with restart capability
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});