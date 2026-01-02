import { test, expect } from '@playwright/test';

// Global setup for E2E tests
test.beforeEach(async ({ page }) => {
  // Monitor console for security events
  page.on('console', msg => {
    console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
  });

  // Simple navigation for task-filter tests
  await page.goto('/');
  await page.waitForSelector('h1', { timeout: 10000 });
  await expect(page.locator('h1')).toContainText('TaskGo');
  await page.waitForTimeout(1000);
});

// Global teardown
test.afterEach(async ({ page }) => {
  // Clean up any test-specific state
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});