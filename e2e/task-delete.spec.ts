import { test, expect } from '@playwright/test';

test.describe('Delete Task E2E Tests (US-004)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('.task-list');
    
    // Ensure we have some test tasks to delete
    await page.evaluate(() => {
      const taskService = (window as any).ng.getComponent?.(document.querySelector('app-task-list'))?.taskService;
      if (taskService) {
        // Create a test task
        taskService.createTask({
          title: 'E2E Test Task for Delete',
          description: 'This task will be deleted in E2E test',
          priority: 'medium',
          status: 'TODO',
          project: 'Work'
        });
      }
    });
    
    // Reload to see the new task
    await page.reload();
    await page.waitForSelector('.task-list');
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
        const taskService = (window as any).ng.getComponent?.(document.querySelector('app-task-list'))?.taskService;
        if (taskService) {
          taskService.createTask({
            title: 'Task with password=secret123',
            priority: 'low',
            status: 'TODO',
            project: 'Personal'
          });
        }
      });
      
      await page.reload();
      await page.waitForSelector('.task-list__task');
      
      const deleteButtons = page.locator('.task-list__action-btn--delete');
      const sensitiveTaskButton = deleteButtons.last();
      const ariaLabel = await sensitiveTaskButton.getAttribute('aria-label');
      
      expect(ariaLabel).not.toMatch(/secret123/);
      expect(ariaLabel).toMatch(/p=\*\*\*/);
    });
  });

  test.describe('Delete Confirmation Modal', () => {
    test('should show confirmation modal when delete button is clicked', async ({ page }) => {
      // Click the first delete button
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
      
      // Wait for modal to close
      await page.waitForSelector('.delete-confirmation-modal', { state: 'detached' });
      
      // Check that task count decreased
      const finalTaskCount = await page.locator('.task-list__task').count();
      expect(finalTaskCount).toBe(initialTaskCount - 1);
    });

    test('should show loading state during deletion', async ({ page }) => {
      // This test will fail until we implement loading state
      await page.click('.task-list__action-btn--delete');
      await page.click('.confirm-delete-btn');
      
      // Check for loading state
      const deleteButton = page.locator('.task-list__action-btn--delete').first();
      await expect(deleteButton).toHaveClass(/loading/);
      await expect(deleteButton).toBeDisabled();
    });

    test('should re-enable delete button after deletion completes', async ({ page }) => {
      // This test will fail until we implement loading state management
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
      // Create a task with XSS in title
      await page.evaluate(() => {
        const taskService = (window as any).ng.getComponent?.(document.querySelector('app-task-list'))?.taskService;
        if (taskService) {
          taskService.createTask({
            title: '<script>alert("XSS")</script>Malicious Task',
            priority: 'high',
            status: 'TODO',
            project: 'Study'
          });
        }
      });
      
      await page.reload();
      await page.waitForSelector('.task-list__task');
      
      // Click delete on the malicious task
      const deleteButtons = page.locator('.task-list__action-btn--delete');
      await deleteButtons.last().click();
      
      // Modal should sanitize content
      await expect(page.locator('.delete-confirmation-content')).not.toContainText('<script>');
      await expect(page.locator('.delete-confirmation-content')).toContainText('Malicious Task');
    });

    test('should sanitize ARIA labels', async ({ page }) => {
      // Create task with XSS in title
      await page.evaluate(() => {
        const taskService = (window as any).ng.getComponent?.(document.querySelector('app-task-list'))?.taskService;
        if (taskService) {
          taskService.createTask({
            title: 'javascript:alert("XSS")',
            priority: 'medium',
            status: 'TODO',
            project: 'Work'
          });
        }
      });
      
      await page.reload();
      await page.waitForSelector('.task-list__task');
      
      const deleteButtons = page.locator('.task-list__action-btn--delete');
      const xssButton = deleteButtons.last();
      const ariaLabel = await xssButton.getAttribute('aria-label');
      
      expect(ariaLabel).not.toContain('javascript:');
    });
  });

  test.describe('Delete Error Handling', () => {
    test('should handle service errors gracefully', async ({ page }) => {
      // Mock service error - this test will fail until we implement error handling
      await page.route('**/api/tasks/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Service unavailable' })
        });
      });
      
      await page.click('.task-list__action-btn--delete');
      await page.click('.confirm-delete-btn');
      
      // Should show error message
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('Unable to delete task');
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network error
      await page.route('**/api/tasks/**', route => {
        route.abort('failed');
      });
      
      await page.click('.task-list__action-btn--delete');
      await page.click('.confirm-delete-btn');
      
      // Should show network error message
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('.error-message')).toContainText('Network error');
    });
  });

  test.describe('Delete Flow Accessibility', () => {
    test('should maintain focus management during delete flow', async ({ page }) => {
      await page.click('.task-list__action-btn--delete');
      
      // Focus should move to modal
      await expect(page.locator('.delete-confirmation-modal')).toBeFocused();
      
      // Focus should move to confirm button
      await page.keyboard.press('Tab');
      await expect(page.locator('.confirm-delete-btn')).toBeFocused();
    });

    test('should trap focus within modal', async ({ page }) => {
      await page.click('.task-list__action-btn--delete');
      
      // Focus should cycle within modal
      await page.focus('.confirm-delete-btn');
      await expect(page.locator('.confirm-delete-btn')).toBeFocused();
      
      // Tab to cancel button
      await page.keyboard.press('Tab');
      await expect(page.locator('.cancel-delete-btn')).toBeFocused();
      
      // Tab again should stay within modal
      await page.keyboard.press('Tab');
      await expect(page.locator('.delete-confirmation-modal')).toBeFocused();
    });

    test('should close modal with Escape key', async ({ page }) => {
      await page.click('.task-list__action-btn--delete');
      
      await expect(page.locator('.delete-confirmation-modal')).toBeVisible();
      
      // Press Escape
      await page.keyboard.press('Escape');
      
      await expect(page.locator('.delete-confirmation-modal')).not.toBeVisible();
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Navigate to delete button with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Should reach delete button
      
      const deleteButton = page.locator('.task-list__action-btn--delete').first();
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
      
      // Delete the last task
      await page.click('.task-list__action-btn--delete');
      await page.click('.confirm-delete-btn');
      
      // Should show empty state
      await expect(page.locator('.task-list__empty')).toBeVisible();
      await expect(page.locator('.task-list__empty-title')).toContainText('No tasks');
    });

    test('should prevent rapid successive deletions', async ({ page }) => {
      // This test will fail until we implement debouncing
      const deleteButton = page.locator('.task-list__action-btn--delete').first();
      
      // Rapid clicks
      await deleteButton.click();
      await deleteButton.click();
      await deleteButton.click();
      
      // Should only show one modal
      await expect(page.locator('.delete-confirmation-modal')).toHaveCount(1);
    });

    test('should handle deletion after filtering', async ({ page }) => {
      // This test will fail until we implement filtering with delete
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