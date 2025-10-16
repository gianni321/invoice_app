import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form on first visit', async ({ page }) => {
    // Check if we're redirected to login or login form is visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Use test credentials (ensure these exist in your test database)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or main app
    await expect(page).toHaveURL(/.*dashboard|.*app/);
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await expect(page.locator('nav')).toBeVisible();

    // Find and click logout
    await page.click('[data-testid="logout-button"]');

    // Should redirect back to login
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe('Time Entry Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should create a new time entry', async ({ page }) => {
    // Navigate to time entries
    await page.click('[data-testid="time-entries-nav"]');

    // Click add new entry
    await page.click('[data-testid="add-entry-button"]');

    // Fill form
    await page.fill('[data-testid="description-input"]', 'Test work session');
    await page.fill('[data-testid="hours-input"]', '2.5');
    await page.selectOption('[data-testid="project-select"]', { label: 'Test Project' });

    // Submit
    await page.click('[data-testid="save-entry-button"]');

    // Verify entry appears in list
    await expect(page.locator('text=Test work session')).toBeVisible();
  });

  test('should edit an existing time entry', async ({ page }) => {
    await page.click('[data-testid="time-entries-nav"]');

    // Click edit on first entry
    await page.click('[data-testid="edit-entry-button"]').first();

    // Modify description
    await page.fill('[data-testid="description-input"]', 'Updated description');
    await page.click('[data-testid="save-entry-button"]');

    // Verify update
    await expect(page.locator('text=Updated description')).toBeVisible();
  });

  test('should delete a time entry', async ({ page }) => {
    await page.click('[data-testid="time-entries-nav"]');

    // Get initial count
    const initialCount = await page.locator('[data-testid="time-entry-row"]').count();

    // Delete first entry
    await page.click('[data-testid="delete-entry-button"]').first();
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');

    // Verify count decreased
    const newCount = await page.locator('[data-testid="time-entry-row"]').count();
    expect(newCount).toBe(initialCount - 1);
  });
});

test.describe('Invoice Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should generate an invoice', async ({ page }) => {
    await page.click('[data-testid="invoices-nav"]');
    await page.click('[data-testid="generate-invoice-button"]');

    // Fill invoice form
    await page.fill('[data-testid="client-name-input"]', 'Test Client');
    await page.fill('[data-testid="rate-input"]', '50');
    
    // Select date range
    await page.fill('[data-testid="start-date-input"]', '2024-01-01');
    await page.fill('[data-testid="end-date-input"]', '2024-01-31');

    // Generate
    await page.click('[data-testid="generate-button"]');

    // Verify invoice appears
    await expect(page.locator('[data-testid="invoice-preview"]')).toBeVisible();
    await expect(page.locator('text=Test Client')).toBeVisible();
  });

  test('should download invoice PDF', async ({ page }) => {
    await page.click('[data-testid="invoices-nav"]');
    
    // Generate invoice first
    await page.click('[data-testid="generate-invoice-button"]');
    await page.fill('[data-testid="client-name-input"]', 'Test Client');
    await page.fill('[data-testid="rate-input"]', '50');
    await page.click('[data-testid="generate-button"]');

    // Download PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-pdf-button"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});