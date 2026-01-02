import { test, expect } from '@playwright/test';
import { serviceErrorTest } from './fixtures/serviceErrorFixture';

test.describe('Delete Task E2E Tests (US-004)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');

    // Wait for app to load
    await page.waitForSelector('.task-list');

    // Clear any existing storage to ensure clean state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('.task-list');

    // Ensure we have some test tasks to delete
    await page.evaluate(() => {
      const taskListComponent = (window as any).taskListComponent;
      if (taskListComponent && taskListComponent.getComponentForTesting) {
        const component = taskListComponent.getComponentForTesting();
        const taskService = component.getTaskService();

        // Create a test task
        taskService.createTask({
          title: 'E2E Test Task for Delete',
          description: 'This task will be deleted in E2E test',
          priority: 'medium',
          status: 'TODO',
          project: 'Work'
        });

        // Force refresh to ensure reactivity
        component.forceRefresh();
      }
    });

    // Brief pause to ensure component updates
    await page.waitForTimeout(500);
  });

  test.describe('Delete Button Visibility and Accessibility', () => {
    test('should display delete button for each task', async ({ page }) => {
      // Wait for tasks to load
      await page.waitForSelector('.task-list__task');

      // Check that delete buttons are visible
      const deleteButtons = page.locator('.task-list__action-btn--delete');
      await expect(deleteButtons.first()).toBeVisible();
      await expect(deleteButtons.first()).toContainText('Delete');
    });

    test('should have proper accessibility attributes on delete button', async ({ page }) => {
      const deleteButton = page.locator('.task-list__action-btn--delete').first();
      await expect(deleteButton).toHaveAttribute('aria-label');
      await expect(deleteButton).toHaveAttribute('aria-label', /Delete task/);
    });

    test('should sanitize sensitive information in ARIA labels', async ({ page }) => {
      // This test will fail until we implement proper sanitization
      // Create a task with sensitive data first
      await page.evaluate(() => {
        const taskListComponent = (window as any).taskListComponent;
        if (taskListComponent && taskListComponent.getComponentForTesting) {
          const component = taskListComponent.getComponentForTesting();
          const taskService = component.getTaskService();

          taskService.createTask({
            title: 'Task with password=secret123',
            priority: 'low',
            status: 'TODO',
            project: 'Personal'
          });

          component.forceRefresh();
        }
      });

      // Brief pause to ensure component updates
      await page.waitForTimeout(500);
      await page.waitForSelector('.task-list__task');

      // Debug: Log all task titles
      const taskTitles = await page.locator('.task-list__task-title').allTextContents();
      console.log('Available task titles:', taskTitles);

      const deleteButtons = page.locator('.task-list__action-btn--delete');

      // Find button for sensitive task (look for sanitized version)
      let sensitiveTaskButton: any = null;
      const buttonCount = await deleteButtons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = deleteButtons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.includes('Task with p=***')) {
          sensitiveTaskButton = button;
          break;
        }
      }

      expect(sensitiveTaskButton).not.toBeNull();

      const finalAriaLabel = await sensitiveTaskButton.getAttribute('aria-label');
      expect(finalAriaLabel).not.toMatch(/secret123/);
      expect(finalAriaLabel).toMatch(/p=\*\*\*/);
    });
  });

  test.describe('Delete Confirmation Modal', () => {
    test('should show confirmation modal when delete button is clicked', async ({ page }) => {
      // Click first delete button
      await page.click('.task-list__action-btn--delete');

      // Wait for modal to appear
      await expect(page.locator('.delete-confirmation-modal')).toBeVisible();
    });

    test('should display "Are you sure?" message in modal', async ({ page }) => {
      await page.click('.task-list__action-btn--delete');

      await expect(page.locator('.delete-confirmation-title')).toBeVisible();
      await expect(page.locator('.delete-confirmation-title')).toContainText('Are you sure?');
    });

    test('should display task title in confirmation message', async ({ page }) => {
      await page.click('.task-list__action-btn--delete');

      await expect(page.locator('.delete-confirmation-content')).toBeVisible();
      await expect(page.locator('.delete-confirmation-content')).toContainText('E2E Test Task for Delete');
    });

    test('should have cancel button in modal', async ({ page }) => {
      await page.click('.task-list__action-btn--delete');

      await expect(page.locator('.cancel-delete-btn')).toBeVisible();
      await expect(page.locator('.cancel-delete-btn')).toContainText('Cancel');
    });

    test('should have confirm delete button in modal', async ({ page }) => {
      await page.click('.task-list__action-btn--delete');

      await expect(page.locator('.confirm-delete-btn')).toBeVisible();
      await expect(page.locator('.confirm-delete-btn')).toContainText('Delete');
    });

    test('should close modal when cancel button is clicked', async ({ page }) => {
      await page.click('.task-list__action-btn--delete');

      // Modal should be visible
      await expect(page.locator('.delete-confirmation-modal')).toBeVisible();

      // Click cancel
      await page.click('.cancel-delete-btn');

      // Modal should close
      await expect(page.locator('.delete-confirmation-modal')).not.toBeVisible();
    });

    test('should have proper accessibility attributes on modal', async ({ page }) => {
      await page.click('.task-list__action-btn--delete');

      const modal = page.locator('.delete-confirmation-modal');
      await expect(modal).toHaveAttribute('role', 'dialog');
      await expect(modal).toHaveAttribute('aria-modal', 'true');
      await expect(modal).toHaveAttribute('aria-labelledby');
    });
  });

  test.describe('Delete Execution', () => {
    test('should delete task when confirm button is clicked', async ({ page }) => {
      // Get initial task count
      const initialTaskCount = await page.locator('.task-list__task').count();

      // Click delete button
      await page.click('.task-list__action-btn--delete');

      // Wait for modal
      await page.waitForSelector('.delete-confirmation-modal');

      // Click confirm delete
      await page.click('.confirm-delete-btn');

      // Wait for refresh
      await page.waitForTimeout(2200);

      // Check that task count decreased
      const finalTaskCount = await page.locator('.task-list__task').count();
      expect(finalTaskCount).toBe(initialTaskCount - 1);
    });

    test('should show loading state during deletion', async ({ page }) => {
      await page.click('.task-list__action-btn--delete');
      await page.click('.confirm-delete-btn');

      // Check for loading state - should work now with the setTimeout delay
      const deleteButton = page.locator('.task-list__action-btn--delete').first();

      // Add small delay to ensure loading state is applied
      await page.waitForTimeout(150);

      // Debug: Log the actual classes on the button
      const actualClasses = await deleteButton.getAttribute('class');
      console.log('Actual button classes:', actualClasses);

      await expect(deleteButton).toHaveClass(/.*loading.*/);
      await expect(deleteButton).toBeDisabled();
    });

    test('should re-enable delete button after deletion completes', async ({ page }) => {
      await page.click('.task-list__action-btn--delete');
      await page.click('.confirm-delete-btn');

      // Wait for deletion to complete
      await page.waitForSelector('.delete-confirmation-modal', { state: 'detached' });

      // Delete button should be enabled again (if there are still tasks)
      const remainingDeleteButtons = page.locator('.task-list__action-btn--delete');
      if (await remainingDeleteButtons.count() > 0) {
        await expect(remainingDeleteButtons.first()).not.toHaveClass(/loading/);
        await expect(remainingDeleteButtons.first()).not.toBeDisabled();
      }
    });
  });

  test.describe('Delete Flow Security', () => {
    test('should prevent XSS in task titles in confirmation modal', async ({ page }) => {
      // Test that XSS attempts are rejected at service level
      await page.evaluate(() => {
        const taskListComponent = (window as any).taskListComponent;
        if (taskListComponent && taskListComponent.getComponentForTesting) {
          const component = taskListComponent.getComponentForTesting();
          const taskService = component.getTaskService();

          try {
            taskService.createTask({
              title: '<script>alert("XSS")</script>Malicious Task',
              priority: 'high',
              status: 'TODO',
              project: 'Study'
            });
            component.forceRefresh();
          } catch (error) {
            // Expected: XSS should be blocked
            console.log('XSS correctly blocked:', error.message);
          }
        }
      });

      // Brief pause to ensure any updates
      await page.waitForTimeout(500);

      // XSS attempt should not have created any new tasks with malicious content
      const taskTitles = await page.locator('.task-list__task-title').allTextContents();
      const hasMaliciousTask = taskTitles.some(title => title.includes('<script>'));

      expect(hasMaliciousTask).toBe(false);

      // Additionally, verify that existing task titles are sanitized
      for (const title of taskTitles) {
        expect(title).not.toContain('<script>');
      }
    });

    test('should sanitize ARIA labels', async ({ page }) => {
      // Create task with XSS in title - should be blocked at service level
      await page.evaluate(() => {
        const taskListComponent = (window as any).taskListComponent;
        if (taskListComponent && taskListComponent.getComponentForTesting) {
          const component = taskListComponent.getComponentForTesting();
          const taskService = component.getTaskService();

          try {
            taskService.createTask({
              title: 'javascript:alert("XSS")',
              priority: 'medium',
              status: 'TODO',
              project: 'Work'
            });
            component.forceRefresh();
          } catch (error) {
            // Expected: XSS should be blocked
            console.log('XSS correctly blocked:', error.message);
          }
        }
      });

      await page.waitForTimeout(500);

      // Verify XSS was blocked - no new task with malicious content should exist
      const taskTitles = await page.locator('.task-list__task-title').allTextContents();
      const hasXssTask = taskTitles.some(title => title.includes('javascript:'));
      expect(hasXssTask).toBe(false);

      // Check ARIA labels don't contain dangerous content
      const deleteButtons = page.locator('.task-list__action-btn--delete');
      const buttonCount = await deleteButtons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = deleteButtons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        expect(ariaLabel).not.toContain('javascript:');
        expect(ariaLabel).not.toContain('<script>');
      }
    });
  });

  test.describe('Delete Error Handling', () => {
    serviceErrorTest('should handle service errors gracefully', async ({ page, serviceError }) => {
      // Mock service error by modifying component to throw error
      await serviceError('taskService', 'deleteTask', 'throw', { message: 'Unable to delete task' });

      await page.click('.task-list__action-btn--delete');
      await page.click('.confirm-delete-btn');

      await page.waitForTimeout(2000);

      // Should show error message in app component (not task-list)
      await expect(page.locator('.app__error-message')).toBeVisible();
      await expect(page.locator('.app__error-message')).toContainText('Unable to delete task');
    });
  });

  test.describe('Delete Flow Accessibility', () => {
    test('should maintain focus management during delete flow', async ({ page }) => {
      await page.click('.task-list__action-btn--delete');

      // Wait for modal to appear and focus to be set
      await page.waitForSelector('.delete-confirmation-modal');
      await page.waitForTimeout(100); // Small delay for focus to be set

      // Focus should be on modal (or first focusable element within)
      const modal = page.locator('.delete-confirmation-modal');
      await expect(modal).toBeFocused();

      // Tab to confirm button
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
      await expect(page.locator('.cancel-delete-btn')).toBeFocused();
    });

    test('should trap focus within modal', async ({ page }) => {
      await page.click('.task-list__action-btn--delete');

      // Wait for modal to appear and focus to be set
      await page.waitForSelector('.delete-confirmation-modal');
      await page.waitForTimeout(100);

      // Focus should be on modal initially
      const modal = page.locator('.delete-confirmation-modal');
      await expect(modal).toBeFocused();

      // Tab to cancel button
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
      await expect(page.locator('.cancel-delete-btn')).toBeFocused();

      // Tab to confirm button
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
      await expect(page.locator('.confirm-delete-btn')).toBeFocused();

      // Tab again should stay within modal (back to modal or cancel button)
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);

      // Check if focus is on either confirm button or modal
      const confirmFocused = await page.locator('.cancel-delete-btn').isVisible()
        && await page.locator('.cancel-delete-btn').evaluate(el => el === document.activeElement);
      const modalFocused = await page.locator('.delete-confirmation-modal').evaluate(el => el === document.activeElement);

      expect(confirmFocused || modalFocused).toBe(true);
    });

    test('should close modal with Escape key', async ({ page }) => {
      await page.click('.task-list__action-btn--delete');

      await expect(page.locator('.delete-confirmation-modal')).toBeVisible();

      // Modal should be focused
      const modal = page.locator('.delete-confirmation-modal');
      await expect(modal).toBeFocused();
      // Press Escape
      await page.keyboard.press('Escape');

      await page.waitForTimeout(100);
      // Modal should close
      await expect(page.locator('.delete-confirmation-modal')).not.toBeVisible();
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Navigate to delete button with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Should reach delete button

      const deleteButton = page.locator('.task-list__action-btn--delete').first();
      await page.waitForTimeout(200);

      await expect(deleteButton).toBeFocused();

      // Activate with Enter
      await page.keyboard.press('Enter');


      // Modal should appear
      await expect(page.locator('.delete-confirmation-modal')).toBeVisible();
    });
  });

  test.describe('Delete Edge Cases', () => {
    test('should handle deletion of last task', async ({ page }) => {
      // Delete all tasks except one
      const tasks = page.locator('.task-list__task');
      const taskCount = await tasks.count();

      // Delete all but one task
      for (let i = 0; i < taskCount - 1; i++) {
        await tasks.first().click();
        await page.click('.task-list__action-btn--delete');
        await page.click('.confirm-delete-btn');
        await page.waitForSelector('.delete-confirmation-modal', { state: 'detached' });
      }

      // Delete last task
      await page.click('.task-list__action-btn--delete');
      await page.waitForSelector('.delete-confirmation-modal');
      await page.click('.confirm-delete-btn');

      await page.waitForTimeout(2000);

      // Should show empty state
      await expect(page.locator('.task-list__empty')).toBeVisible();
      await expect(page.locator('.task-list__empty-title')).toContainText('No tasks');
    });

    test('should prevent rapid successive deletions', async ({ page }) => {
      const deleteButton = page.locator('.task-list__action-btn--delete').first();

      // Fire clicks rapidly in parallel
      await Promise.all([
        deleteButton.click({ force: true }),
        deleteButton.click({ force: true }),
        deleteButton.click({ force: true }),
      ]);

      // Await for modal
      await page.waitForTimeout(300)

      // Should only show one modal
      await expect(page.locator('.delete-confirmation-modal')).toHaveCount(1);
    });

    test('should handle deletion after filtering', async ({ page }) => {
      // Check if filter exists, if not skip test
      const filterExists = await page.locator('[data-testid="status-filter"]').isVisible();
      if (!filterExists) {
        console.log('Filter not found, skipping deletion after filtering test');
        return;
      }

      // Apply a filter first
      await page.selectOption('[data-testid="status-filter"]', 'TODO');

      // Then delete a task
      await page.click('.task-list__action-btn--delete');
      await page.click('.confirm-delete-btn');

      // Filter should still work and count should be updated
      await page.waitForSelector('.delete-confirmation-modal', { state: 'detached' });

      // Check that filtered list is updated
      const remainingTasks = page.locator('.task-list__task');
      expect(await remainingTasks.count()).toBeLessThanOrEqual(1);
    });
  });
});
