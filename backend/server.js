require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const entryRoutes = require('./routes/entries');
const invoiceRoutes = require('./routes/invoices');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const logger = require('./lib/logger');
const SecurityConfig = require('./lib/security');
const { 
  requestId, 
  requestLogging, 
  performanceMonitoring, 
  errorLogging, 
  notFoundHandler 
} = require('./middleware/logging');

// Validate security configuration
SecurityConfig.validateEnvironment();

// Validate JWT Secret
if (!process.env.JWT_SECRET || /change_this|^.{0,31}$/.test(process.env.JWT_SECRET)) {
  logger.error('JWT_SECRET is missing or weak. It should be at least 32 characters.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Log environment info
logger.info('Starting server', SecurityConfig.getEnvironmentInfo());

// Security middleware
app.use(helmet(SecurityConfig.getSecurityHeaders()));

// Parse CORS origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3002', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Request-ID']
}));

// Rate limiting
const limiter = rateLimit(SecurityConfig.getRateLimitConfig());
app.use('/api/auth', limiter);

// Middleware
app.use(express.json());

// Request ID and logging middleware
app.use(requestId);
app.use(requestLogging);
app.use(performanceMonitoring);

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

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(`📊 API available at http://localhost:${PORT}/api`);
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