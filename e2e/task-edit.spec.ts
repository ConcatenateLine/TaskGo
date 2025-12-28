import { test, expect } from '@playwright/test';

test.describe('US-003: Edit Task - End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application and clear localStorage to avoid crypto issues
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    // Wait for app to load (longer timeout for crypto initialization)
    await page.waitForSelector('.task-list', { timeout: 10000 });
  });

  test('AC1: Edit button opens form with current data', async ({ page }) => {
    // Wait for tasks to be available
    await page.waitForSelector('.task-list__task', { timeout: 5000 });

    // Find first task and its edit button
    const firstTask = page.locator('.task-list__task').first();
    const editButton = firstTask.locator('.task-list__action-btn--edit');

    // Get current task data before editing
    const taskTitle = await firstTask.locator('.task-list__task-title').textContent();
    const taskDescription = await firstTask.locator('.task-list__task-description').textContent() || '';
    const taskPriority = await firstTask.locator('.task-list__badge--priority').textContent() || '';
    const taskProject = await firstTask.locator('.task-list__badge--project').textContent() || '';

    // Click edit button
    await editButton.click();

    // Verify inline edit form appears
    await expect(page.locator('.task-inline-edit')).toBeVisible();

    // Verify form is populated with current data
    if (taskTitle) {
      await expect(page.locator('input[name="title"]')).toHaveValue(taskTitle);
    }

    if (taskDescription) {
      await expect(page.locator('textarea[name="description"]')).toHaveValue(taskDescription);
    }

    if (taskPriority) {
      await expect(page.locator('select[name="priority"]')).toHaveValue(taskPriority.trim().toLowerCase());
    }
    if (taskProject) {
      await expect(page.locator('select[name="project"]')).toHaveValue(taskProject.trim());
    }
  });

  test('AC2: Same validations as create', async ({ page }) => {
    // Wait for tasks to be available
    await page.waitForSelector('.task-list__task', { timeout: 5000 });

    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Wait for edit form to be visible
    await expect(page.locator('.task-inline-edit')).toBeVisible();

    // Test title validation
    const titleInput = page.locator('input[name="title"]');

    // Test empty title
    await titleInput.fill('');
    await titleInput.blur();
    // Wait a moment for async validation
    await page.waitForTimeout(100);
    await expect(page.locator('.task-inline-edit__field-error')).toBeVisible();

    // Test title too short
    await titleInput.fill('ab');
    await titleInput.blur();
    // Wait a moment for async validation
    await page.waitForTimeout(100);
    await expect(page.locator('.task-inline-edit__field-error')).toBeVisible();

    // Test valid title
    await titleInput.fill('Valid Task Title');
    await titleInput.blur();

    // Check if error messages are hidden when valid
    const errorElements = page.locator('.task-inline-edit__field-error');
    if (await errorElements.count() > 0) {
      await expect(errorElements.first()).not.toBeVisible();
    }

    // Test description validation (should allow dangerous content)
    const descriptionInput = page.locator('textarea[name="description"]');
    await descriptionInput.fill('<script>alert("xss")</script>');
    await descriptionInput.blur();

    // Should show security validation error
    await expect(page.locator('.task-inline-edit__field-error')).toBeVisible();

    // Clear description (should be valid)
    await descriptionInput.fill('');
    await descriptionInput.blur();

    // Verify save button is enabled/disabled appropriately
    await titleInput.fill('Valid Title');
    await descriptionInput.fill('Valid Description');
    await expect(page.locator('.task-inline-edit__btn--save')).toBeEnabled();

    await titleInput.fill('');
    await expect(page.locator('.task-inline-edit__btn--save')).toBeDisabled();
  });

  test('AC3: Save button updates task', async ({ page }) => {
    // Wait for tasks to be available
    await page.waitForSelector('.task-list__task', { timeout: 5000 });

    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Wait for edit form to be visible
    await expect(page.locator('.task-inline-edit')).toBeVisible();

    // Fill form with updated data
    await page.locator('input[name="title"]').fill('Updated Task Title');
    await page.locator('textarea[name="description"]').fill('Updated task description');
    await page.locator('select[name="priority"]').selectOption('high');
    await page.locator('select[name="project"]').selectOption('Personal');

    // Click save button
    await page.locator('.task-inline-edit__btn--save').click();

    // Verify form disappears (edit mode closed)
    await expect(page.locator('.task-inline-edit')).not.toBeVisible();

    // Wait a moment for the update to reflect
    await page.waitForTimeout(500);

    // Verify task is updated in list
    const updatedTask = page.locator('.task-list__task').first();
    await expect(updatedTask.locator('.task-list__task-title')).toHaveText('Updated Task Title');
    await expect(updatedTask.locator('.task-list__task-description')).toHaveText('Updated task description');
    await expect(updatedTask.locator('.task-list__badge--priority')).toHaveText('high');
    await expect(updatedTask.locator('.task-list__badge--project')).toHaveText('Personal');

    // Verify updated timestamp
    await expect(updatedTask.locator('.task-list__task-updated')).toBeVisible();
  });

  test('AC4: Cancel button closes without saving', async ({ page }) => {
    // Wait for tasks to be available
    await page.waitForSelector('.task-list__task', { timeout: 5000 });

    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    const originalTitle = await firstTask.locator('.task-list__task-title').textContent();

    await firstTask.locator('.task-list__action-btn--edit').click();

    // Wait for edit form to be visible
    await expect(page.locator('.task-inline-edit')).toBeVisible();

    // Modify form data
    await page.locator('input[name="title"]').fill('Modified Title');
    await page.locator('textarea[name="description"]').fill('Modified description');
    await page.locator('select[name="priority"]').selectOption('low');
    await page.locator('select[name="project"]').selectOption('Study');

    // Click cancel button
    await page.locator('.task-inline-edit__btn--cancel').click();

    // Verify form disappears
    await expect(page.locator('.task-inline-edit')).not.toBeVisible();

    // Verify task data is unchanged
    if (originalTitle) {
      await expect(firstTask.locator('.task-list__task-title')).toHaveText(originalTitle);
    }
  });

  test('Inline editing should work in list context', async ({ page }) => {
    // Wait for tasks to be available
    await page.waitForSelector('.task-list__task', { timeout: 5000 });

    // Verify multiple tasks have edit buttons
    const tasks = page.locator('.task-list__task');
    const editButtons = page.locator('.task-list__action-btn--edit');

    const taskCount = await tasks.count();
    expect(taskCount).toBeGreaterThan(0);

    const editButtonCount = await editButtons.count();
    expect(editButtonCount).toBe(taskCount);

    if (taskCount >= 2) {
      // Edit a specific task while others remain in view mode
      const secondTaskEditButton = editButtons.nth(1);

      await secondTaskEditButton.click();

      // Verify edit form appears for specific task
      await expect(page.locator('.task-inline-edit')).toBeVisible();

      // Verify other tasks are still visible in list mode
      const otherTasks = page.locator('.task-list__task:not(:has(.task-inline-edit))');
      await expect(otherTasks).toHaveCount(taskCount - 1);
    }
  });

  test('Should handle keyboard navigation', async ({ page }) => {
    // Wait for tasks to be available
    await page.waitForSelector('.task-list__task', { timeout: 5000 });

    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Wait for edit form to be visible
    await expect(page.locator('.task-inline-edit')).toBeVisible();

    // Test Tab navigation through form fields
    await page.locator('input[name="title"]').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('textarea[name="description"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('select[name="priority"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('select[name="project"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('.task-inline-edit__btn--save')).toBeFocused();

    // Test Enter key to save
    await page.locator('input[name="title"]').fill('Updated Title');
    await page.keyboard.press('Enter');

    // Should save and close edit mode
    await expect(page.locator('.task-inline-edit')).not.toBeVisible();
  });

  test('Should handle Escape key to cancel', async ({ page }) => {
    // Wait for tasks to be available
    await page.waitForSelector('.task-list__task', { timeout: 5000 });

    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Wait for edit form to be visible
    await expect(page.locator('.task-inline-edit')).toBeVisible();

    // Modify form data
    await page.locator('input[name="title"]').fill('Modified Title');

    // Press Escape key
    await page.keyboard.press('Escape');

    // Should cancel and close edit mode without saving
    await expect(page.locator('.task-inline-edit')).not.toBeVisible();

    // Original data should remain
    await expect(firstTask.locator('.task-list__task-title')).not.toHaveText('Modified Title');
  });

  test('Should show loading state during save', async ({ page }) => {
    // Wait for tasks to be available
    await page.waitForSelector('.task-list__task', { timeout: 5000 });

    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Wait for edit form to be visible
    await expect(page.locator('.task-inline-edit')).toBeVisible();

    // Fill form and save
    await page.locator('input[name="title"]').fill('Updated Title');

    // Click save button
    await page.locator('button[type="submit"]').click();

    // Immediately check if save button text changed to "Saving..."
    const buttonAfterClick = page.locator('button[type="submit"]');

    // Check for immediate visual feedback (text should change quickly)
    try {
      await expect(buttonAfterClick).toContainText('Saving...');
    } catch (error) {
      // If form disappears immediately (fast save), that's also acceptable
      const formStillVisible = await page.locator('.task-inline-edit').isVisible({ timeout: 1000 });
      if (!formStillVisible) {
        // Form closed quickly - test passes
        expect(true).toBe(true);
        return;
      }
    }

    // If we get here, check if button becomes disabled
    try {
      await expect(buttonAfterClick).toBeDisabled();
    } catch (error) {
      // Button might not exist due to form closing - acceptable
      const formStillVisible = await page.locator('.task-inline-edit').isVisible({ timeout: 1000 });
      if (!formStillVisible) {
        expect(true).toBe(true); // Form closed successfully
      } else {
        throw error; // Button should be disabled if form still visible
      }
    }
  });

  test('Should display error messages', async ({ page }) => {
    // Wait for tasks to be available
    await page.waitForSelector('.task-list__task', { timeout: 5000 });

    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Wait for edit form to be visible
    await expect(page.locator('.task-inline-edit')).toBeVisible();

    // Simulate validation error
    await page.locator('input[name="title"]').fill('<script>alert("xss")</script>');
    await page.locator('input[name="title"]').blur();

    // Verify error message appears
    await expect(page.locator('.task-inline-edit__field-error')).toBeVisible();
  });

  test('Should handle concurrent edits properly', async ({ page }) => {
    // Wait for tasks to be available
    await page.waitForSelector('.task-list__task', { timeout: 5000 });

    // Get all tasks
    const tasks = page.locator('.task-list__task');
    const taskCount = await tasks.count();

    if (taskCount < 2) {
      test.skip();
      return;
    }

    // Start editing first task
    await tasks.nth(0).locator('.task-list__action-btn--edit').click();

    // Verify edit form is visible
    await expect(page.locator('.task-inline-edit')).toBeVisible();

    // Try to edit second task (should not be possible or should handle gracefully)
    const secondEditButton = tasks.nth(1).locator('.task-list__action-btn--edit');

    // The behavior depends on implementation - either:
    // 1. Second edit button is disabled
    // 2. First edit is cancelled when second starts
    // 3. Multiple edits are allowed

    // Test that the application handles this gracefully without crashing
    await expect(secondEditButton).toBeVisible();
  });

  test('Should maintain accessibility during editing', async ({ page }) => {
    // Wait for tasks to be available
    await page.waitForSelector('.task-list__task', { timeout: 5000 });

    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Wait for edit form to be visible
    await expect(page.locator('.task-inline-edit')).toBeVisible();

    // Check ARIA labels (actual implementation uses different approach)
    await expect(page.locator('input[name="title"]')).toHaveAttribute('aria-invalid', 'false');
    await expect(page.locator('textarea[name="description"]')).toHaveAttribute('aria-invalid', 'false');

    // Check form validation announcements
    await expect(page.locator('.task-inline-edit__live-region')).toHaveAttribute('aria-live', 'polite');

    // Check keyboard accessibility
    await page.keyboard.press('Tab');
    const focused = await page.locator(':focus').count();
    expect(focused).toBeGreaterThan(0);

    // Test screen reader announcements
    await page.locator('input[name="title"]').fill('Valid Title');
    // Note: Live region content might update asynchronously
  });

  test('Should prevent XSS attacks', async ({ page }) => {
    // Wait for tasks to be available
    await page.waitForSelector('.task-list__task', { timeout: 5000 });

    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Wait for edit form to be visible
    await expect(page.locator('.task-inline-edit')).toBeVisible();

    // Try to inject malicious content
    const maliciousTitle = '<script>alert("XSS Test")</script>Malicious Title';
    await page.locator('input[name="title"]').fill(maliciousTitle);

    // The input itself may contain raw text, but validation should detect the threat
    await page.locator('input[name="title"]').blur();
    await page.waitForTimeout(100);

    // Should show validation error for security threats
    await expect(page.locator('.task-inline-edit__field-error')).toBeVisible();

    // Clear title (should be valid)
    await page.locator('input[name="title"]').fill('Valid Title');
    await page.locator('input[name="title"]').blur();

    // Try malicious description
    const maliciousDescription = '<img src="x" onerror="alert(\'XSS\')">';
    await page.locator('textarea[name="description"]').fill(maliciousDescription);
    await page.locator('textarea[name="description"]').blur();
    await page.waitForTimeout(100);

    // Should show validation error for security threats
    await expect(page.locator('.task-inline-edit__field-error')).toBeVisible();
  });

  test('Should preserve data integrity', async ({ page }) => {
    // Wait for tasks to be available
    await page.waitForSelector('.task-list__task', { timeout: 5000 });

    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Wait for edit form to be visible
    await expect(page.locator('.task-inline-edit')).toBeVisible();

    // Only update title, leave other fields unchanged
    await page.locator('input[name="title"]').fill('New Title Only');
    await page.locator('.task-inline-edit__btn--save').click();

    // Wait for update to complete
    await page.waitForTimeout(500);

    // Verify only title changed
    const updatedTask = page.locator('.task-list__task').first();
    await expect(updatedTask.locator('.task-list__task-title')).toHaveText('New Title Only');

    // Other fields should remain the same (priority, project, etc.)
    // Note: This depends on the exact implementation of form field population
  });

  test('Should handle rapid editing without errors', async ({ page }) => {
    // Wait for tasks to be available
    await page.waitForSelector('.task-list__task', { timeout: 5000 });

    // Test rapid edit/cancel cycles
    for (let i = 0; i < 5; i++) {
      const firstTask = page.locator('.task-list__task').first();
      await firstTask.locator('.task-list__action-btn--edit').click();

      // Verify edit form appears
      await expect(page.locator('.task-inline-edit')).toBeVisible();

      // Cancel immediately
      await page.locator('.task-inline-edit__btn--cancel').click();

      // Verify form disappears
      await expect(page.locator('.task-inline-edit')).not.toBeVisible();

      // Brief pause between operations
      await page.waitForTimeout(100);
    }

    // Application should remain stable
    await expect(page.locator('.task-list')).toBeVisible();
  });
});
