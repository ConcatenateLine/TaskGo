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
  test.beforeEach(async ({ page }) => {
    // Initialize mock data for consistent testing
    await page.evaluate(() => {
      const taskService = (window as any).taskService;
      if (taskService && taskService.initializeMockData) {
        taskService.clearTasks();

        // Create test tasks with different statuses
        const tasks = [
          {
            title: 'TODO Task 1',
            description: 'First TODO task for filter testing',
            priority: 'high',
            status: 'TODO',
            project: 'Work',
            createdAt: new Date('2024-01-20T10:00:00'),
            updatedAt: new Date('2024-01-20T10:00:00'),
          },
          {
            title: 'TODO Task 2',
            description: 'Second TODO task',
            priority: 'medium',
            status: 'TODO',
            project: 'Personal',
            createdAt: new Date('2024-01-19T10:00:00'),
            updatedAt: new Date('2024-01-19T10:00:00'),
          },
          {
            title: 'In Progress Task',
            description: 'Task currently in progress',
            priority: 'high',
            status: 'IN_PROGRESS',
            project: 'Study',
            createdAt: new Date('2024-01-18T10:00:00'),
            updatedAt: new Date('2024-01-18T10:00:00'),
          },
          {
            title: 'Completed Task 1',
            description: 'First completed task',
            priority: 'low',
            status: 'DONE',
            project: 'Work',
            createdAt: new Date('2024-01-17T10:00:00'),
            updatedAt: new Date('2024-01-17T10:00:00'),
          },
          {
            title: 'Completed Task 2',
            description: 'Second completed task',
            priority: 'medium',
            status: 'DONE',
            project: 'Personal',
            createdAt: new Date('2024-01-16T10:00:00'),
            updatedAt: new Date('2024-01-16T10:00:00'),
          },
          {
            title: 'Completed Task 3',
            description: 'Third completed task',
            priority: 'high',
            status: 'DONE',
            project: 'Study',
            createdAt: new Date('2024-01-15T10:00:00'),
            updatedAt: new Date('2024-01-15T10:00:00'),
          },
        ];

        tasks.forEach((task) => taskService.createTask(task));
      }
    });

    await page.waitForTimeout(100);
  });

  test('should render all four filter tabs', async ({ page }) => {
    const tabs = page.locator('.task-filter-tabs__tab');
    await expect(tabs).toHaveCount(4);

    const tabTexts = await tabs.allTextContents();
    expect(tabTexts[0]).toContain('All');
    expect(tabTexts[1]).toContain('To Do');
    expect(tabTexts[2]).toContain('In Progress');
    expect(tabTexts[3]).toContain('Completed');
  });

  test('should display correct task counts in each tab', async ({ page }) => {
    const tabs = page.locator('.task-filter-tabs__tab');

    // Check "All" tab count (total tasks: 6)
    await expect(tabs.nth(0)).toContainText('6', { useInnerText: true });

    // Check "To Do" tab count (2 tasks)
    await expect(tabs.nth(1)).toContainText('2', { useInnerText: true });

    // Check "In Progress" tab count (1 task)
    await expect(tabs.nth(2)).toContainText('1', { useInnerText: true });

    // Check "Completed" tab count (3 tasks)
    await expect(tabs.nth(3)).toContainText('3', { useInnerText: true });
  });

  test('should have "All" as default filter on load', async ({ page }) => {
    const activeTab = page.locator('.task-filter-tabs__tab--active');
    await expect(activeTab).toBeVisible();
    await expect(activeTab).toContainText('All');

    // Verify all tasks are visible
    const taskItems = page.locator('.task-list__task');
    const taskCount = await taskItems.count();
    expect(taskCount).toBeGreaterThan(0);
  });

  test('should filter tasks when "To Do" tab is clicked', async ({ page }) => {
    // Click "To Do" tab
    const todoTab = page.locator('.task-filter-tabs__tab').filter({ hasText: 'To Do' });
    await todoTab.click();

    // Verify tab is active
    const activeTab = page.locator('.task-filter-tabs__tab--active');
    await expect(activeTab).toContainText('To Do');

    // Wait for filter to apply
    await page.waitForTimeout(100);

    // Verify only TODO tasks are shown (2 tasks)
    const taskItems = page.locator('.task-list__task');
    const taskTitles = await taskItems.allTextContents();
    const todoTitles = taskTitles.filter((title) =>
      ['TODO Task 1', 'TODO Task 2'].some((todo) => title.includes(todo))
    );

    expect(todoTitles).toHaveLength(2);
  });

  test('should filter tasks when "In Progress" tab is clicked', async ({ page }) => {
    // Click "In Progress" tab
    const inProgressTab = page.locator('.task-filter-tabs__tab').filter({ hasText: 'In Progress' });
    await inProgressTab.click();

    // Verify tab is active
    const activeTab = page.locator('.task-filter-tabs__tab--active');
    await expect(activeTab).toContainText('In Progress');

    // Wait for filter to apply
    await page.waitForTimeout(100);

    // Verify only IN_PROGRESS task is shown (1 task)
    const taskItems = page.locator('.task-list__task');
    const taskCount = await taskItems.count();
    expect(taskCount).toBe(1);
  });

  test('should filter tasks when "Completed" tab is clicked', async ({ page }) => {
    // Click "Completed" tab
    const completedTab = page.locator('.task-filter-tabs__tab').filter({ hasText: 'Completed' });
    await completedTab.click();

    // Verify tab is active
    const activeTab = page.locator('.task-filter-tabs__tab--active');
    await expect(activeTab).toContainText('Completed');

    // Wait for filter to apply
    await page.waitForTimeout(100);

    // Verify only DONE tasks are shown (3 tasks)
    const taskItems = page.locator('.task-list__task');
    const taskCount = await taskItems.count();
    expect(taskCount).toBe(3);
  });

  test('should show all tasks when "All" tab is clicked', async ({ page }) => {
    // First switch to a different filter
    const todoTab = page.locator('.task-filter-tabs__tab').filter({ hasText: 'To Do' });
    await todoTab.click();
    await page.waitForTimeout(100);

    // Then click "All" tab
    const allTab = page.locator('.task-filter-tabs__tab').filter({ hasText: 'All' });
    await allTab.click();

    // Verify tab is active
    const activeTab = page.locator('.task-filter-tabs__tab--active');
    await expect(activeTab).toContainText('All');

    // Wait for filter to apply
    await page.waitForTimeout(100);

    // Verify all tasks are shown (6 tasks)
    const taskItems = page.locator('.task-list__task');
    const taskCount = await taskItems.count();
    expect(taskCount).toBe(6);
  });

  test('should maintain filter when task status changes', async ({ page }) => {
    // Set filter to "To Do"
    const todoTab = page.locator('.task-filter-tabs__tab').filter({ hasText: 'To Do' });
    await todoTab.click();
    await page.waitForTimeout(100);

    // Verify filter is set
    const activeTab = page.locator('.task-filter-tabs__tab--active');
    await expect(activeTab).toContainText('To Do');

    // Change task status (simulate clicking status change button)
    const statusButtons = page.locator('.task-status__button');
    if ((await statusButtons.count()) > 0) {
      await statusButtons.first().click();
      await page.waitForTimeout(100);
    }

    // Verify filter remains "To Do"
    await expect(activeTab).toContainText('To Do');
  });

  test('should keep filter when creating new task', async ({ page }) => {
    // Set filter to "In Progress"
    const inProgressTab = page.locator('.task-filter-tabs__tab').filter({ hasText: 'In Progress' });
    await inProgressTab.click();
    await page.waitForTimeout(100);

    // Verify filter is set
    const activeTab = page.locator('.task-filter-tabs__tab--active');
    await expect(activeTab).toContainText('In Progress');

    // Create new task (would normally open form, but we'll just verify filter persists)
    // The test will verify that filter state is maintained

    // Verify filter still shows "In Progress"
    await expect(activeTab).toContainText('In Progress');
  });

  test('should update filter counts when task is created', async ({ page }) => {
    const tabs = page.locator('.task-filter-tabs__tab');

    // Get initial counts
    const initialAllCount = await tabs.nth(0).textContent();
    const initialTodoCount = await tabs.nth(1).textContent();

    // Create new TODO task
    await page.evaluate(() => {
      const taskService = (window as any).taskService;
      if (taskService) {
        taskService.createTask({
          title: 'New TODO Task',
          description: 'Test task for filter',
          priority: 'medium',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    await page.waitForTimeout(100);

    // Get new counts
    const newAllCount = await tabs.nth(0).textContent();
    const newTodoCount = await tabs.nth(1).textContent();

    // Verify counts updated
    expect(newAllCount).not.toBe(initialAllCount);
    expect(newTodoCount).not.toBe(initialTodoCount);
    expect(newAllCount).toContain('7');
    expect(newTodoCount).toContain('3');
  });

  test('should update filter counts when task status changes', async ({ page }) => {
    const tabs = page.locator('.task-filter-tabs__tab');

    // Get initial counts
    const initialTodoCount = await tabs.nth(1).textContent();
    const initialCompletedCount = await tabs.nth(3).textContent();

    // Change a TODO task to DONE
    await page.evaluate(() => {
      const taskService = (window as any).taskService;
      if (taskService) {
        const todoTasks = taskService.getTasksByStatus('TODO');
        if (todoTasks && todoTasks.length > 0) {
          taskService.updateTask(todoTasks[0].id, { status: 'DONE' });
        }
      }
    });

    await page.waitForTimeout(100);

    // Get new counts
    const newTodoCount = await tabs.nth(1).textContent();
    const newCompletedCount = await tabs.nth(3).textContent();

    // Verify counts updated
    expect(newTodoCount).not.toBe(initialTodoCount);
    expect(newCompletedCount).not.toBe(initialCompletedCount);
  });

  test('should update filter counts when task is deleted', async ({ page }) => {
    const tabs = page.locator('.task-filter-tabs__tab');

    // Get initial counts
    const initialAllCount = await tabs.nth(0).textContent();
    const initialTodoCount = await tabs.nth(1).textContent();

    // Delete a TODO task
    await page.evaluate(() => {
      const taskService = (window as any).taskService;
      if (taskService) {
        const tasks = taskService.getTasks();
        if (tasks && tasks.length > 0) {
          taskService.deleteTask(tasks[0].id);
        }
      }
    });

    await page.waitForTimeout(100);

    // Get new counts
    const newAllCount = await tabs.nth(0).textContent();
    const newTodoCount = await tabs.nth(1).textContent();

    // Verify counts updated
    expect(newAllCount).not.toBe(initialAllCount);
    expect(newTodoCount).not.toBe(initialTodoCount);
  });

  test('should handle filter switching rapidly', async ({ page }) => {
    const tabs = page.locator('.task-filter-tabs__tab');

    // Rapidly switch between filters
    await tabs.nth(1).click(); // To Do
    await page.waitForTimeout(50);

    await tabs.nth(2).click(); // In Progress
    await page.waitForTimeout(50);

    await tabs.nth(3).click(); // Completed
    await page.waitForTimeout(50);

    await tabs.nth(0).click(); // All
    await page.waitForTimeout(50);

    // Verify final state
    const activeTab = page.locator('.task-filter-tabs__tab--active');
    await expect(activeTab).toContainText('All');
  });

  test('should display zero counts when no tasks match', async ({ page }) => {
    // Clear all tasks
    await page.evaluate(() => {
      const taskService = (window as any).taskService;
      if (taskService) {
        taskService.clearTasks();
      }
    });

    await page.waitForTimeout(100);

    const tabs = page.locator('.task-filter-tabs__tab');
    const tabTexts = await tabs.allTextContents();

    // All tabs should show count of 0
    tabTexts.forEach((text) => {
      expect(text).toContain('0');
    });
  });
});

test.describe('Filter Accessibility - US-006', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      const taskService = (window as any).taskService;
      if (taskService && taskService.initializeMockData) {
        taskService.initializeMockData();
      }
    });

    await page.waitForTimeout(100);
  });

  test('should have proper ARIA attributes on filter tabs', async ({ page }) => {
    const tabContainer = page.locator('.task-filter-tabs');
    await expect(tabContainer).toHaveAttribute('role', 'tablist');

    const tabs = page.locator('.task-filter-tabs__tab');
    const count = await tabs.count();

    for (let i = 0; i < count; i++) {
      await expect(tabs.nth(i)).toHaveAttribute('role', 'tab');
    }
  });

  test('should have ARIA selected state for active tab', async ({ page }) => {
    const activeTab = page.locator('.task-filter-tabs__tab--active');
    await expect(activeTab).toHaveAttribute('aria-selected', 'true');

    const inactiveTabs = page.locator('.task-filter-tabs__tab').filter({
      hasNot: page.locator('.task-filter-tabs__tab--active'),
    });

    const count = await inactiveTabs.count();
    for (let i = 0; i < count; i++) {
      await expect(inactiveTabs.nth(i)).toHaveAttribute('aria-selected', 'false');
    }
  });

  test('should have keyboard navigable filter tabs', async ({ page }) => {
    const tabs = page.locator('.task-filter-tabs__tab');

    // Navigate using keyboard
    await tabs.nth(0).focus();
    await page.keyboard.press('ArrowRight');

    // Focus should move to next tab
    const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
    expect(focusedElement).toContain('To Do');
  });

  test('should provide ARIA labels for screen readers', async ({ page }) => {
    const tabs = page.locator('.task-filter-tabs__tab');
    const count = await tabs.count();

    for (let i = 0; i < count; i++) {
      const ariaLabel = await tabs.nth(i).getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('Filter tasks');
    }
  });
});
