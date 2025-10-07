require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const entryRoutes = require('./routes/entries');
const invoiceRoutes = require('./routes/invoices');
const adminRoutes = require('./routes/admin');
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
  : ['http://localhost:5173', 'http://localhost:3001'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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

// Health check
app.get('/api/health', (req, res) => {
  logger.info('Health check requested', { requestId: req.requestId });
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Replace the previous route handlers
app.use('*', notFoundHandler);

// Error handling
app.use(errorLogging);

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(`📊 API available at http://localhost:${PORT}/api`);
});

// Handle server shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  server.close(() => {
    logger.info('Server closed due to error');
    process.exit(1);
  });
});