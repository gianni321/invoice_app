#!/usr/bin/env node
/**
 * Health check script for Docker container
 * Verifies the application is running and responding properly
 */

const http = require('http');
const process = require('process');

const HEALTH_CHECK_PORT = process.env.PORT || 3001;
const HEALTH_CHECK_HOST = process.env.HEALTH_CHECK_HOST || 'localhost';
const HEALTH_CHECK_PATH = process.env.HEALTH_CHECK_PATH || '/api/health';
const TIMEOUT = parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000;

function healthCheck() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HEALTH_CHECK_HOST,
      port: HEALTH_CHECK_PORT,
      path: HEALTH_CHECK_PATH,
      method: 'GET',
      timeout: TIMEOUT,
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            if (response.status === 'OK') {
              resolve({ success: true, response });
            } else {
              reject(new Error(`Health check failed: ${response.status}`));
            }
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${error.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Health check timed out after ${TIMEOUT}ms`));
    });

    req.end();
  });
}

// Run health check
healthCheck()
  .then((result) => {
    console.log('✅ Health check passed:', result.response);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  });