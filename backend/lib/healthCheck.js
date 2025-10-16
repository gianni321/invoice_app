const { Model } = require('objection');
const knex = require('../lib/database').getKnex();
const { secureLogger } = require('../lib/secureLogger');

/**
 * Database health check utilities
 */
class DatabaseHealthCheck {
  /**
   * Check database connection
   */
  static async checkConnection() {
    try {
      await knex.raw('SELECT 1');
      return true;
    } catch (error) {
      secureLogger.error('Database connection check failed', error);
      return false;
    }
  }

  /**
   * Check database schema integrity
   */
  static async checkSchema() {
    try {
      const requiredTables = ['users', 'entries', 'invoices', 'settings', 'periods'];
      const existingTables = await knex.raw(
        knex.client.config.client === 'mysql' 
          ? "SHOW TABLES"
          : "SELECT name FROM sqlite_master WHERE type='table'"
      );
      
      const tableNames = knex.client.config.client === 'mysql'
        ? existingTables[0].map(row => Object.values(row)[0])
        : existingTables.map(row => row.name);
      
      const missingTables = requiredTables.filter(table => !tableNames.includes(table));
      
      return {
        valid: missingTables.length === 0,
        missingTables,
        existingTables: tableNames
      };
    } catch (error) {
      secureLogger.error('Database schema check failed', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Check database migrations status
   */
  static async checkMigrations() {
    try {
      const [currentBatch] = await knex('knex_migrations')
        .max('batch as maxBatch')
        .first();
      
      const pendingMigrations = await knex.migrate.list();
      
      return {
        currentBatch: currentBatch?.maxBatch || 0,
        hasPending: pendingMigrations[1].length > 0,
        pendingCount: pendingMigrations[1].length,
        completedCount: pendingMigrations[0].length
      };
    } catch (error) {
      secureLogger.error('Database migration check failed', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * Perform basic data integrity checks
   */
  static async checkDataIntegrity() {
    try {
      const checks = [];

      // Check for orphaned entries (entries without valid users)
      const orphanedEntries = await knex('entries')
        .leftJoin('users', 'entries.user_id', 'users.user_id')
        .whereNull('users.user_id')
        .count('entries.entry_id as count')
        .first();

      checks.push({
        name: 'orphaned_entries',
        passed: orphanedEntries.count === 0,
        count: orphanedEntries.count
      });

      // Check for invalid invoice statuses
      const invalidInvoices = await knex('invoices')
        .whereNotIn('status', ['pending', 'sent', 'paid', 'overdue', 'cancelled'])
        .count('invoice_id as count')
        .first();

      checks.push({
        name: 'invalid_invoice_status',
        passed: invalidInvoices.count === 0,
        count: invalidInvoices.count
      });

      // Check for negative hours or amounts
      const negativeEntries = await knex('entries')
        .where('hours', '<', 0)
        .orWhere('amount', '<', 0)
        .count('entry_id as count')
        .first();

      checks.push({
        name: 'negative_values',
        passed: negativeEntries.count === 0,
        count: negativeEntries.count
      });

      return {
        passed: checks.every(check => check.passed),
        checks
      };
    } catch (error) {
      secureLogger.error('Database integrity check failed', error);
      return {
        passed: false,
        error: error.message
      };
    }
  }

  /**
   * Get database statistics
   */
  static async getStatistics() {
    try {
      const stats = {};

      // Table row counts
      const tables = ['users', 'entries', 'invoices'];
      for (const table of tables) {
        const result = await knex(table).count('* as count').first();
        stats[`${table}_count`] = parseInt(result.count);
      }

      // Recent activity
      const recentEntries = await knex('entries')
        .where('created_at', '>', knex.raw('DATE_SUB(NOW(), INTERVAL 7 DAY)'))
        .count('* as count')
        .first();
      
      stats.recent_entries = parseInt(recentEntries.count);

      // Database size (MySQL only)
      if (knex.client.config.client === 'mysql') {
        const sizeQuery = await knex.raw(`
          SELECT 
            ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE()
        `);
        stats.database_size_mb = sizeQuery[0][0]?.size_mb || 0;
      }

      return stats;
    } catch (error) {
      secureLogger.error('Database statistics collection failed', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * Comprehensive health check
   */
  static async performHealthCheck() {
    const startTime = Date.now();
    
    try {
      const [
        connectionStatus,
        schemaStatus,
        migrationStatus,
        integrityStatus,
        statistics
      ] = await Promise.all([
        this.checkConnection(),
        this.checkSchema(),
        this.checkMigrations(),
        this.checkDataIntegrity(),
        this.getStatistics()
      ]);

      const duration = Date.now() - startTime;
      
      const healthReport = {
        timestamp: new Date().toISOString(),
        duration,
        overall_status: connectionStatus && schemaStatus.valid && integrityStatus.passed ? 'healthy' : 'unhealthy',
        checks: {
          connection: {
            status: connectionStatus ? 'pass' : 'fail'
          },
          schema: {
            status: schemaStatus.valid ? 'pass' : 'fail',
            ...schemaStatus
          },
          migrations: {
            status: migrationStatus.error ? 'fail' : 'pass',
            ...migrationStatus
          },
          integrity: {
            status: integrityStatus.passed ? 'pass' : 'fail',
            ...integrityStatus
          }
        },
        statistics
      };

      // Log health check results
      secureLogger.performance('database_health_check', duration, 'ms', {
        status: healthReport.overall_status,
        checks_passed: Object.values(healthReport.checks).filter(c => c.status === 'pass').length,
        total_checks: Object.keys(healthReport.checks).length
      });

      return healthReport;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      secureLogger.error('Database health check failed', error, {
        duration,
        component: 'database_health_check'
      });

      return {
        timestamp: new Date().toISOString(),
        duration,
        overall_status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = DatabaseHealthCheck;