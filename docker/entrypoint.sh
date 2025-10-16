#!/bin/sh
# Docker entrypoint script for production deployment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo "${RED}[ERROR]${NC} $1"
}

# Function to wait for database
wait_for_db() {
    log_info "Waiting for database to be ready..."
    
    if [ "$DB_TYPE" = "mysql" ]; then
        while ! nc -z "$DB_HOST" "$DB_PORT"; do
            log_warn "MySQL is unavailable - sleeping"
            sleep 1
        done
        log_info "MySQL is up - continuing"
    elif [ "$DB_TYPE" = "postgres" ]; then
        while ! nc -z "$DB_HOST" "$DB_PORT"; do
            log_warn "PostgreSQL is unavailable - sleeping"
            sleep 1
        done
        log_info "PostgreSQL is up - continuing"
    else
        log_info "Using SQLite - no wait required"
    fi
}

# Function to run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    cd /app/backend
    
    # Check if migrations directory exists
    if [ -d "migrations" ]; then
        # Run migrations based on database type
        if [ "$DB_TYPE" = "mysql" ] && [ -d "migrations-mysql" ]; then
            log_info "Running MySQL migrations..."
            node -e "
                const fs = require('fs');
                const path = require('path');
                const mysql = require('mysql2/promise');
                
                async function runMigrations() {
                    const connection = await mysql.createConnection({
                        host: process.env.DB_HOST,
                        user: process.env.DB_USER,
                        password: process.env.DB_PASSWORD,
                        database: process.env.DB_NAME
                    });
                    
                    const migrationsDir = path.join(__dirname, 'migrations-mysql');
                    const files = fs.readdirSync(migrationsDir).sort();
                    
                    for (const file of files) {
                        if (file.endsWith('.sql')) {
                            console.log('Running migration:', file);
                            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                            await connection.execute(sql);
                        }
                    }
                    
                    await connection.end();
                    console.log('Migrations completed successfully');
                }
                
                runMigrations().catch(console.error);
            "
        else
            log_info "Running SQLite migrations..."
            node -e "
                const fs = require('fs');
                const path = require('path');
                const Database = require('better-sqlite3');
                
                function runMigrations() {
                    const dbPath = process.env.DB_PATH || './timetracker.db';
                    const db = new Database(dbPath);
                    
                    const migrationsDir = path.join(__dirname, 'migrations');
                    const files = fs.readdirSync(migrationsDir).sort();
                    
                    for (const file of files) {
                        if (file.endsWith('.sql')) {
                            console.log('Running migration:', file);
                            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                            db.exec(sql);
                        }
                    }
                    
                    db.close();
                    console.log('Migrations completed successfully');
                }
                
                runMigrations();
            "
        fi
        
        log_info "Database migrations completed"
    else
        log_warn "No migrations directory found - skipping migrations"
    fi
}

# Function to seed database (optional)
seed_database() {
    if [ "$RUN_SEEDS" = "true" ]; then
        log_info "Seeding database..."
        
        if [ -f "seeds.js" ]; then
            node seeds.js
            log_info "Database seeding completed"
        else
            log_warn "No seeds.js file found - skipping seeding"
        fi
    else
        log_info "Skipping database seeding (RUN_SEEDS not set to true)"
    fi
}

# Function to validate environment variables
validate_environment() {
    log_info "Validating environment variables..."
    
    # Required variables
    REQUIRED_VARS="JWT_SECRET"
    
    for var in $REQUIRED_VARS; do
        if [ -z "$(eval echo \$$var)" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Validate JWT secret length
    JWT_SECRET_LENGTH=$(echo "$JWT_SECRET" | wc -c)
    if [ "$JWT_SECRET_LENGTH" -lt 32 ]; then
        log_error "JWT_SECRET must be at least 32 characters long"
        exit 1
    fi
    
    log_info "Environment validation passed"
}

# Function to setup logging directories
setup_logging() {
    log_info "Setting up logging directories..."
    
    mkdir -p /app/backend/logs
    touch /app/backend/logs/app.log
    touch /app/backend/logs/error.log
    
    log_info "Logging directories created"
}

# Main execution
main() {
    log_info "Starting Invoice App deployment..."
    log_info "Node.js version: $(node --version)"
    log_info "Environment: $NODE_ENV"
    
    # Validate environment
    validate_environment
    
    # Setup logging
    setup_logging
    
    # Wait for database if needed
    if [ "$SKIP_DB_WAIT" != "true" ]; then
        wait_for_db
    fi
    
    # Run migrations
    if [ "$SKIP_MIGRATIONS" != "true" ]; then
        run_migrations
    fi
    
    # Seed database if requested
    seed_database
    
    log_info "Pre-startup checks completed successfully"
    log_info "Starting application server..."
    
    # Start the application
    cd /app/backend
    exec node server.js
}

# Handle signals gracefully
trap 'log_info "Received SIGTERM, shutting down gracefully..."; exit 0' TERM
trap 'log_info "Received SIGINT, shutting down gracefully..."; exit 0' INT

# Run main function
main "$@"