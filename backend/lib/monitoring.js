/**
 * @fileoverview Backend health monitoring and system checks
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');

/**
 * Health check service for monitoring application status
 */
class HealthMonitor {
  constructor(app, db) {
    this.app = app;
    this.db = db;
    this.startTime = Date.now();
    this.checks = new Map();
    this.setupRoutes();
    this.setupChecks();
  }

  /**
   * Setup health check routes
   * @private
   */
  setupRoutes() {
    // Basic health endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime
      });
    });

    // Detailed health check
    this.app.get('/health/detailed', async (req, res) => {
      try {
        const checks = await this.runAllChecks();
        const isHealthy = Object.values(checks).every(check => check.status === 'ok');
        
        res.status(isHealthy ? 200 : 503).json({
          status: isHealthy ? 'ok' : 'degraded',
          timestamp: new Date().toISOString(),
          uptime: Date.now() - this.startTime,
          checks
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // Readiness probe for containers
    this.app.get('/ready', async (req, res) => {
      try {
        const dbCheck = await this.checkDatabase();
        if (dbCheck.status === 'ok') {
          res.json({ status: 'ready' });
        } else {
          res.status(503).json({ status: 'not ready', reason: 'database unavailable' });
        }
      } catch (error) {
        res.status(503).json({ status: 'not ready', error: error.message });
      }
    });

    // Liveness probe for containers
    this.app.get('/live', (req, res) => {
      res.json({ 
        status: 'alive',
        pid: process.pid,
        uptime: process.uptime()
      });
    });

    // System metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      try {
        const metrics = await this.getSystemMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  /**
   * Setup individual health checks
   * @private
   */
  setupChecks() {
    this.checks.set('database', this.checkDatabase.bind(this));
    this.checks.set('filesystem', this.checkFilesystem.bind(this));
    this.checks.set('memory', this.checkMemory.bind(this));
    this.checks.set('disk', this.checkDiskSpace.bind(this));
  }

  /**
   * Run all configured health checks
   * @returns {Promise<Object>} Health check results
   */
  async runAllChecks() {
    const results = {};
    
    for (const [name, checkFn] of this.checks) {
      try {
        results[name] = await checkFn();
      } catch (error) {
        results[name] = {
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    return results;
  }

  /**
   * Check database connectivity and performance
   * @returns {Promise<Object>} Database health status
   */
  async checkDatabase() {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      const testQuery = promisify(this.db.get.bind(this.db));
      await testQuery('SELECT 1');
      
      // Check table integrity
      const tables = promisify(this.db.all.bind(this.db));
      const tableList = await tables(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'ok',
        responseTime: `${responseTime}ms`,
        tables: tableList.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check filesystem accessibility
   * @returns {Promise<Object>} Filesystem health status
   */
  async checkFilesystem() {
    try {
      const testFile = path.join(__dirname, '.health-test');
      const testData = 'health-check-' + Date.now();
      
      // Write test
      await fs.writeFile(testFile, testData);
      
      // Read test
      const readData = await fs.readFile(testFile, 'utf8');
      
      // Cleanup
      await fs.unlink(testFile);
      
      if (readData === testData) {
        return {
          status: 'ok',
          message: 'Filesystem read/write operations successful',
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          status: 'error',
          message: 'Filesystem data integrity check failed',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Filesystem error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check memory usage
   * @returns {Object} Memory health status
   */
  checkMemory() {
    const usage = process.memoryUsage();
    const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const usagePercent = Math.round((usage.heapUsed / usage.heapTotal) * 100);
    
    // Alert if memory usage is above 90%
    const status = usagePercent > 90 ? 'warning' : 'ok';
    
    return {
      status,
      usage: {
        totalMB,
        usedMB,
        usagePercent: `${usagePercent}%`,
        rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
        external: Math.round(usage.external / 1024 / 1024) + 'MB'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check disk space
   * @returns {Promise<Object>} Disk space health status
   */
  async checkDiskSpace() {
    try {
      const stats = await fs.stat(__dirname);
      // Note: This is a simplified check. In production, use a proper disk space library
      
      return {
        status: 'ok',
        message: 'Disk accessible',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Disk check failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get comprehensive system metrics
   * @returns {Promise<Object>} System metrics
   */
  async getSystemMetrics() {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();
    const uptime = process.uptime();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: {
        process: uptime,
        system: require('os').uptime()
      },
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
        arrayBuffers: memory.arrayBuffers
      },
      cpu: {
        user: cpu.user,
        system: cpu.system
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      environment: process.env.NODE_ENV
    };
  }

  /**
   * Add custom health check
   * @param {string} name - Check name
   * @param {Function} checkFn - Check function that returns health status
   */
  addCheck(name, checkFn) {
    this.checks.set(name, checkFn);
  }

  /**
   * Remove health check
   * @param {string} name - Check name to remove
   */
  removeCheck(name) {
    this.checks.delete(name);
  }

  /**
   * Get health check summary
   * @returns {Promise<Object>} Health summary
   */
  async getHealthSummary() {
    const checks = await this.runAllChecks();
    const healthyChecks = Object.values(checks).filter(check => check.status === 'ok').length;
    const totalChecks = Object.keys(checks).length;
    
    return {
      overall: healthyChecks === totalChecks ? 'healthy' : 'degraded',
      score: `${healthyChecks}/${totalChecks}`,
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Request logging middleware for monitoring
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${req.ip}`);
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Error tracking middleware
 */
const errorTracker = (err, req, res, next) => {
  // Log error details
  console.error(`${new Date().toISOString()} - ERROR:`, {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send error to monitoring service
    // This could be Sentry, DataDog, or custom monitoring endpoint
  }
  
  next(err);
};

/**
 * Performance monitoring middleware
 */
const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log slow requests (> 1000ms)
    if (duration > 1000) {
      console.warn(`SLOW REQUEST: ${req.method} ${req.url} - ${duration.toFixed(2)}ms`);
    }
    
    // Track metrics in production
    if (process.env.NODE_ENV === 'production') {
      // Send performance metrics to monitoring service
    }
  });
  
  next();
};

module.exports = {
  HealthMonitor,
  requestLogger,
  errorTracker,
  performanceMonitor
};