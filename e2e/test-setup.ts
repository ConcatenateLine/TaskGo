import { test, expect } from '@playwright/test';

// Global setup for E2E tests
test.beforeEach(async ({ page }) => {
  // Monitor console for security events
  page.on('console', msg => {
    console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
  });

  // Clear localStorage and navigate to get fresh state
  await page.goto('/');
  
  // Wait a moment for the app to initialize, then clear storage
  await page.waitForTimeout(1000);
  
  await page.evaluate(() => {
    // Clear all localStorage to avoid crypto service issues
    localStorage.clear();
    // Clear sessionStorage too
    sessionStorage.clear();
  });
  
  // Reload the page to get clean initialization
  await page.reload();
  
  // Wait for the app to be fully loaded
  await page.waitForSelector('h1', { timeout: 10000 });
  await expect(page.locator('h1')).toContainText('TaskGo');
});

// Global teardown
test.afterEach(async ({ page }) => {
  // Clean up any test-specific state
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});