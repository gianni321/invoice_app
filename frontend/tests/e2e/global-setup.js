// global-setup.js
const { chromium } = require('@playwright/test');

module.exports = async config => {
  console.log('Starting global setup for E2E tests...');
  
  // Ensure the application is running
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the application to be available
    await page.goto(config.use.baseURL || 'http://localhost:8080');
    console.log('Application is ready for E2E testing');
  } catch (error) {
    console.error('Failed to connect to application:', error);
    throw error;
  } finally {
    await browser.close();
  }
};