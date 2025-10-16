require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');

// Import database and middleware
const { initializeDatabase, closeConnection } = require('./lib/database');
const { 
  errorHandler, 
  notFoundHandler, 
  asyncHandler,
  authenticateToken,
  requireAdmin
} = require('./middleware');
const { secureLogger } = require('./lib/secureLogger');

// Import enhanced routes
const authRoutes = require('./routes/auth-enhanced');
const entriesRoutes = require('./routes/entries-enhanced');
const invoicesRoutes = require('./routes/invoices-enhanced');

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * Security and middleware setup
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

/**
 * Request correlation ID middleware
 */
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || 
    require('crypto').randomUUID();
  res.set('X-Correlation-ID', req.correlationId);
  next();
});

/**
 * Request logging middleware
 */
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    secureLogger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId: req.correlationId,
      userId: req.user?.userId
    });
  });
  
  next();
});

/**
 * Health check endpoints
 */
app.get('/health', asyncHandler(async (req, res) => {
  const basicHealth = {
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  };

  try {
    const DatabaseHealthCheck = require('./lib/healthCheck');
    const dbConnected = await DatabaseHealthCheck.checkConnection();
    
    basicHealth.database = dbConnected ? 'connected' : 'disconnected';
    
    if (!dbConnected) {
      return res.status(503).json({
        ...basicHealth,
        status: 'Service Unavailable',
        message: 'Database connection failed'
      });
    }
  } catch (error) {
    secureLogger.error('Health check failed', error);
    return res.status(503).json({
      ...basicHealth,
      status: 'Service Unavailable',
      message: 'Health check error'
    });
  }

  res.json(basicHealth);
}));

/**
 * Detailed health check endpoint (admin only)
 */
app.get('/health/detailed', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  try {
    const DatabaseHealthCheck = require('./lib/healthCheck');
    const healthReport = await DatabaseHealthCheck.performHealthCheck();
    
    const statusCode = healthReport.overall_status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthReport);
  } catch (error) {
    secureLogger.error('Detailed health check failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/entries', entriesRoutes);
app.use('/api/invoices', invoicesRoutes);

/**
 * Serve static files in production
 */
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

/**
 * Error handling
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Graceful shutdown
 */
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
  secureLogger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new requests
  server.close((err) => {
    if (err) {
      secureLogger.error('Error during server close:', err);
      process.exit(1);
    }
    
    secureLogger.info('HTTP server closed');
    
    // Close database connections
    closeConnection()
      .then(() => {
        secureLogger.info('Database connections closed');
        process.exit(0);
      })
      .catch((err) => {
        secureLogger.error('Error closing database connections:', err);
        process.exit(1);
      });
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    secureLogger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
}

/**
 * Start server
 */
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    
    const server = app.listen(PORT, () => {
      secureLogger.info(`🚀 Server running on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        port: PORT,
        nodeVersion: process.version
      });
    });

    // Store server reference for graceful shutdown
    global.server = server;
    
    return server;
  } catch (error) {
    secureLogger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;