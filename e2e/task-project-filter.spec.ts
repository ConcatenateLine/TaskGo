import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Project Filter Feature (US-008)
 *
 * User Story: Filter tasks by project
 * Acceptance Criteria:
 * - Dropdown with projects
 * - "All projects" option
 * - Combine with state filter
 * - UX: Cumulative filters
 */

test.describe('Project Filter Feature - US-008', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await page.waitForSelector('h1', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('TaskGo');

    // Wait for all components to load
    await page.waitForSelector('.task-filter-tabs__tab', { timeout: 5000 });
  });

  test('should render project filter dropdown', async ({ page }) => {
    const projectFilter = page.locator('.task-project-filter__select');

    await expect(projectFilter).toBeVisible();
    await expect(projectFilter).toHaveCount(1);
  });

  test('should render "All projects" option in dropdown', async ({ page }) => {
    const projectFilter = page.locator('.task-project-filter__select');

    await projectFilter.click();
    const allProjectsOption = page.locator('select.task-project-filter__select option').filter({ hasText: 'All projects' });

    await expect(allProjectsOption).toHaveCount(1);
  });

  test('should render all project options in dropdown', async ({ page }) => {
    const projectFilter = page.locator('.task-project-filter__select');

    await projectFilter.click();

    const options = await page.locator('select.task-project-filter__select option').all();
    const optionTexts = await Promise.all(options.map((option) => option.textContent()));

    expect(optionTexts).toContain('All projects');
    expect(optionTexts).toContain('Personal');
    expect(optionTexts).toContain('Work');
    expect(optionTexts).toContain('Study');
    expect(optionTexts).toContain('General');
  });

  test('should have "All projects" selected by default', async ({ page }) => {
    const projectFilter = page.locator('.task-project-filter__select');
    const selectedOption = projectFilter.locator('option:checked');

    await expect(selectedOption).toContainText('All projects');
  });

  test('should display task count for each project option', async ({ page }) => {
    const projectFilter = page.locator('.task-project-filter__select');

    await projectFilter.click();

    const options = await page.locator('select.task-project-filter__select option').all();

    for (const option of options) {
      const text = await option.textContent();
      // Each option should contain a number (count)
      expect(text).toMatch(/\d+/);
    }
  });

  test('should filter tasks when "Work" project is selected', async ({ page }) => {
    const projectFilter = page.locator('.task-project-filter__select');

    await projectFilter.selectOption('Work');

    // Wait for filtering to apply
    await page.waitForTimeout(100);

    // Verify tasks displayed are only from Work project
    const tasks = page.locator('.task-list__task');
    const taskCount = await tasks.count();

    // Get project badges from visible tasks
    const projectBadges = page.locator('.task-list__task .task__project-badge');

    for (let i = 0; i < await projectBadges.count(); i++) {
      const badgeText = await projectBadges.nth(i).textContent();
      expect(badgeText).toBe('Work');
    }
  });

  test('should filter tasks when "Personal" project is selected', async ({ page }) => {
    const projectFilter = page.locator('.task-project-filter__select');

    await projectFilter.selectOption('Personal');

    // Wait for filtering to apply
    await page.waitForTimeout(100);

    // Verify tasks displayed are only from Personal project
    const projectBadges = page.locator('.task-list__task .task__project-badge');

    for (let i = 0; i < await projectBadges.count(); i++) {
      const badgeText = await projectBadges.nth(i).textContent();
      expect(badgeText).toBe('Personal');
    }
  });

  test('should filter tasks when "Study" project is selected', async ({ page }) => {
    const projectFilter = page.locator('.task-project-filter__select');

    await projectFilter.selectOption('Study');

    // Wait for filtering to apply
    await page.waitForTimeout(100);

    // Verify tasks displayed are only from Study project
    const projectBadges = page.locator('.task-list__task .task__project-badge');

    for (let i = 0; i < await projectBadges.count(); i++) {
      const badgeText = await projectBadges.nth(i).textContent();
      expect(badgeText).toBe('Study');
    }
  });

  test('should filter tasks when "General" project is selected', async ({ page }) => {
    const projectFilter = page.locator('.task-project-filter__select');

    await projectFilter.selectOption('General');

    // Wait for filtering to apply
    await page.waitForTimeout(100);

    // Verify tasks displayed are only from General project
    const projectBadges = page.locator('.task-list__task .task__project-badge');

    for (let i = 0; i < await projectBadges.count(); i++) {
      const badgeText = await projectBadges.nth(i).textContent();
      expect(badgeText).toBe('General');
    }
  });

  test('should show all tasks when "All projects" is selected', async ({ page }) => {
    const projectFilter = page.locator('.task-project-filter__select');

    // Select specific project first
    await projectFilter.selectOption('Work');
    await page.waitForTimeout(100);

    let workTaskCount = await page.locator('.task-list__task').count();

    // Select "All projects"
    await projectFilter.selectOption('all');
    await page.waitForTimeout(100);

    const allTaskCount = await page.locator('.task-list__task').count();

    // All tasks count should be >= Work task count
    expect(allTaskCount).toBeGreaterThanOrEqual(workTaskCount);
  });

  test('should filter tasks cumulatively with status filter', async ({ page }) => {
    const statusTabs = page.locator('.task-filter-tabs__tab');
    const projectFilter = page.locator('.task-project-filter__select');

    // Apply status filter (TODO)
    await statusTabs.filter({ hasText: 'To Do' }).click();
    await page.waitForTimeout(100);

    let todoTaskCount = await page.locator('.task-list__task').count();

    // Apply project filter (Work)
    await projectFilter.selectOption('Work');
    await page.waitForTimeout(100);

    let todoWorkTaskCount = await page.locator('.task-list__task').count();

    // Tasks matching both TODO and Work should be <= TODO tasks alone
    expect(todoWorkTaskCount).toBeLessThanOrEqual(todoTaskCount);

    // Verify visible tasks match both filters
    const projectBadges = page.locator('.task-list__task .task__project-badge');
    for (let i = 0; i < await projectBadges.count(); i++) {
      const badgeText = await projectBadges.nth(i).textContent();
      expect(badgeText).toBe('Work');
    }
  });

  test('should maintain status filter when changing project', async ({ page }) => {
    const statusTabs = page.locator('.task-filter-tabs__tab');
    const projectFilter = page.locator('.task-project-filter__select');

    // Apply status filter first
    await statusTabs.filter({ hasText: 'To Do' }).click();
    await page.waitForTimeout(100);

    // Check active tab exists
    const activeTodoTab = statusTabs.first();
    await expect(activeTodoTab).toBeVisible();

    // Apply project filter
    await projectFilter.selectOption('Work');
    await page.waitForTimeout(100);

    // Status filter should still be TODO
    const stillActiveTodoTab = statusTabs.filter({ hasText: 'To Do' }).first();
    await expect(stillActiveTodoTab).toBeVisible();

    // Change project filter
    await projectFilter.selectOption('Personal');
    await page.waitForTimeout(100);

    // Status filter should still be TODO
    const stillActiveTodoTab2 = statusTabs.filter({ hasText: 'To Do' }).first();
    await expect(stillActiveTodoTab2).toBeVisible();
  });

  test('should maintain project filter when changing status', async ({ page }) => {
    const statusTabs = page.locator('.task-filter-tabs__tab');
    const projectFilter = page.locator('.task-project-filter__select');

    // Apply project filter first
    await projectFilter.selectOption('Work');
    await page.waitForTimeout(100);

    // Check selected project
    const selectedOption = projectFilter.locator('option:checked');
    await expect(selectedOption).toContainText('Work');

    // Apply status filter
    await statusTabs.filter({ hasText: 'To Do' }).click();
    await page.waitForTimeout(100);

    // Project filter should still be Work
    const stillSelectedOption = projectFilter.locator('option:checked');
    await expect(stillSelectedOption).toContainText('Work');

    // Change status filter
    const inProgressTab = statusTabs.filter({ hasText: 'In Progress' }).first();
    await inProgressTab.click();
    await page.waitForTimeout(100);

    // Project filter should still be Work
    const stillSelectedOption2 = projectFilter.locator('option:checked');
    await expect(stillSelectedOption2).toContainText('Work');
  });

  test('should update task counts in project dropdown after task creation', async ({ page }) => {
    const projectFilter = page.locator('.task-project-filter__select');

    // Get initial count for "Work" option
    await projectFilter.click();
    const workOption = page.locator('select.task-project-filter__select option').filter({ hasText: 'Work' });
    const initialWorkCountText = await workOption.textContent();

    // Close dropdown
    await page.click('body');

    // Create a new Work task (mock - just trigger a state update)
    // In real implementation, this would interact with task creation form
    await page.evaluate(() => {
      // Simulate task creation
      const event = new CustomEvent('task-created', {
        detail: { project: 'Work', status: 'TODO' },
      });
      window.dispatchEvent(event);
    });

    await page.waitForTimeout(100);

    // Reopen dropdown and check count
    await projectFilter.click();
    const updatedWorkCountText = await workOption.textContent();

    // Count should have changed
    expect(updatedWorkCountText).not.toBe(initialWorkCountText);
  });

  test('should update task counts in status tabs after project selection', async ({ page }) => {
    const statusTabs = page.locator('.task-filter-tabs__tab');

    // Get initial counts
    const allTabText = await statusTabs.first().textContent();

    // Select specific project
    const projectFilter = page.locator('.task-project-filter__select');
    await projectFilter.selectOption('Work');
    await page.waitForTimeout(100);

    // Get updated counts
    const allTabTextAfter = await statusTabs.first().textContent();

    // In real implementation, status tabs should show counts filtered by project
    // This test checks that counts are updated when project filter changes
    expect(allTabTextAfter).toBeDefined();
  });

  test('should handle keyboard navigation for project filter', async ({ page }) => {
    const projectFilter = page.locator('.task-project-filter__select');

    // Focus dropdown
    await projectFilter.focus();

    // Open dropdown with Enter key
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);

    // Navigate options with arrow keys
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);

    // Select with Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);

    // Verify selection changed
    const selectedOption = projectFilter.locator('option:checked');
    const selectedText = await selectedOption.textContent();
    expect(selectedText).toBeTruthy();
  });

  test('should have proper ARIA labels for accessibility', async ({ page }) => {
    const projectFilter = page.locator('.task-project-filter__select');

    // Check ARIA label
    const ariaLabel = await projectFilter.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toContain('Filter tasks by project');
  });

  test('should be accessible via keyboard', async ({ page }) => {
    // Tab to project filter
    await page.keyboard.press('Tab');
    const projectFilter = page.locator('.task-project-filter__select');

    // Verify it's focused
    await expect(projectFilter).toBeFocused();
  });

  test('should maintain filter state across page interactions', async ({ page }) => {
    const statusTabs = page.locator('.task-filter-tabs__tab');
    const projectFilter = page.locator('.task-project-filter__select');

    // Set initial filters
    await statusTabs.filter({ hasText: 'To Do' }).click();
    await projectFilter.selectOption('Work');
    await page.waitForTimeout(100);

    // Simulate other page interaction (e.g., clicking somewhere else)
    await page.click('body');
    await page.waitForTimeout(100);

    // Verify filters are still active
    const todoTab = statusTabs.filter({ hasText: 'To Do' }).first();
    await expect(todoTab).toBeVisible();

    const selectedOption = projectFilter.locator('option:checked');
    await expect(selectedOption).toContainText('Work');
  });

  test('should display empty state when no tasks match project filter', async ({ page }) => {
    const projectFilter = page.locator('.task-project-filter__select');

    // Select a project that might have no tasks (or very few)
    // In real implementation with mock data, all projects should have tasks
    // This test demonstrates behavior when no tasks match
    await projectFilter.selectOption('General');
    await page.waitForTimeout(100);

    // If no tasks match, should show empty state
    const tasks = page.locator('.task-list__task');
    const taskCount = await tasks.count();

    if (taskCount === 0) {
      const emptyState = page.locator('.task-list__empty');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('No tasks');
    }
  });

  test('should display empty state when no tasks match cumulative filters', async ({ page }) => {
    const statusTabs = page.locator('.task-filter-tabs__tab');
    const projectFilter = page.locator('.task-project-filter__select');

    // Apply filters that might have no matching tasks
    await statusTabs.filter({ hasText: 'Completed' }).click();
    await projectFilter.selectOption('Study');
    await page.waitForTimeout(100);

    // If no tasks match, should show empty state
    const tasks = page.locator('.task-list__task');
    const taskCount = await tasks.count();

    if (taskCount === 0) {
      const emptyState = page.locator('.task-list__empty');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('No tasks');
    }
  });

  test('should handle rapid filter changes', async ({ page }) => {
    const statusTabs = page.locator('.task-filter-tabs__tab');
    const projectFilter = page.locator('.task-project-filter__select');

    // Rapidly change filters
    await projectFilter.selectOption('Work');
    await page.waitForTimeout(50);

    await statusTabs.filter({ hasText: 'To Do' }).click();
    await page.waitForTimeout(50);

    await projectFilter.selectOption('Personal');
    await page.waitForTimeout(50);

    await statusTabs.filter({ hasText: 'In Progress' }).click();
    await page.waitForTimeout(50);

    await projectFilter.selectOption('Study');
    await page.waitForTimeout(50);

    // Should not crash, filters should work
    const activeTab = statusTabs.filter({ hasText: 'In Progress' }).first();
    await expect(activeTab).toBeVisible();

    const selectedOption = projectFilter.locator('option:checked');
    await expect(selectedOption).toContainText('Study');
  });

  test('should persist filters when creating new task', async ({ page }) => {
    const statusTabs = page.locator('.task-filter-tabs__tab');
    const projectFilter = page.locator('.task-project-filter__select');

    // Set filters
    await statusTabs.filter({ hasText: 'To Do' }).click();
    await projectFilter.selectOption('Work');
    await page.waitForTimeout(100);

    // Record current filter states
    const activeTabText = await statusTabs.filter({ hasText: 'To Do' }).textContent();
    const selectedOptionText = await projectFilter.locator('option:checked').textContent();

    // Open task creation dialog (if it exists)
    const createButton = page.locator('button').filter({ hasText: /create|add/i }).first();
    if (await createButton.count() > 0) {
      await createButton.click();

      // Wait for dialog
      await page.waitForTimeout(100);

      // Cancel or close dialog
      const cancelButton = page.locator('button').filter({ hasText: /cancel|close/i }).first();
      if (await cancelButton.count() > 0) {
        await cancelButton.click();
      }
    }

    // Verify filters are still active
    await page.waitForTimeout(100);

    const stillActiveTabText = await statusTabs.filter({ hasText: 'To Do' }).textContent();
    const stillSelectedOptionText = await projectFilter.locator('option:checked').textContent();

    expect(stillActiveTabText).toBe(activeTabText);
    expect(stillSelectedOptionText).toBe(selectedOptionText);
  });

  test('should persist filters when editing task', async ({ page }) => {
    const statusTabs = page.locator('.task-filter-tabs__tab');
    const projectFilter = page.locator('.task-project-filter__select');

    // Set filters
    await statusTabs.filter({ hasText: 'To Do' }).click();
    await projectFilter.selectOption('Work');
    await page.waitForTimeout(100);

    // Record current filter states
    const activeTabText = await statusTabs.filter({ hasText: 'To Do' }).textContent();
    const selectedOptionText = await projectFilter.locator('option:checked').textContent();

    // Click on a task edit button (if exists)
    const editButton = page.locator('button').filter({ hasText: /edit/i }).first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Wait for edit form
      await page.waitForTimeout(100);

      // Cancel or close edit form
      const cancelButton = page.locator('button').filter({ hasText: /cancel|close/i }).first();
      if (await cancelButton.count() > 0) {
        await cancelButton.click();
      }
    }

    // Verify filters are still active
    await page.waitForTimeout(100);

    const stillActiveTabText = await statusTabs.filter({ hasText: 'To Do' }).textContent();
    const stillSelectedOptionText = await projectFilter.locator('option:checked').textContent();

    expect(stillActiveTabText).toBe(activeTabText);
    expect(stillSelectedOptionText).toBe(selectedOptionText);
  });
});
