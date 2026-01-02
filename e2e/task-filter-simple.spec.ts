import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Task Filter Feature (US-006)
 *
 * User Story: Filter tasks
 * Acceptance Criteria:
 * - Tabs: "All", "To Do", "In Progress", "Completed"
 * - Immediate filter
 * - Keep filter when create/edit
 * - Show count in each tab
 * - Default: "All" on load
 */

test.describe('Task Filter Feature - US-006', () => {
  test('should render filter tabs without data manipulation', async ({ page }) => {
    // Wait for page to load
    await page.goto('/');
    await page.waitForSelector('h1', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('TaskGo');
    
    // Wait for filter tabs to render (they load asynchronously)
    await page.waitForSelector('.task-filter-tabs__tab', { timeout: 5000 });
    
    // This test checks if filter tabs appear without any task manipulation
    const tabs = page.locator('.task-filter-tabs__tab');
    await expect(tabs).toHaveCount(4);
    
    const tabTexts = await tabs.allTextContents();
    expect(tabTexts[0]).toContain('All');
    expect(tabTexts[1]).toContain('To Do');
    expect(tabTexts[2]).toContain('In Progress');
    expect(tabTexts[3]).toContain('Completed');
  });
});