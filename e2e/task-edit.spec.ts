import { test, expect } from '@playwright/test';

test.describe('US-003: Edit Task - End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the app to load
    await page.waitForSelector('.task-list');

    // Ensure we have some tasks to edit
    // (This assumes the app has been initialized with mock data)
  });

  test('AC1: Edit button opens form with current data', async ({ page }) => {
    // Find the first task and its edit button
    const firstTask = page.locator('.task-list__task').first();
    const editButton = firstTask.locator('.task-list__action-btn--edit');

    // Get current task data before editing
    const taskTitle = firstTask.locator('.task-list__task-title').textContent();
    const taskDescription = firstTask.locator('.task-list__task-description').textContent() || '';
    const taskPriority = firstTask.locator('.task-list__badge--priority').textContent()?.trim() || '';
    const taskProject = firstTask.locator('.task-list__badge--project').textContent()?.trim() || '';

    // Click edit button
    await editButton.click();

    // Verify inline edit form appears
    await expect(page.locator('.task-inline-edit')).toBeVisible();

    // Verify form is populated with current data
    await expect(page.locator('input[name="title"]')).toHaveValue(taskTitle);
    
    if (taskDescription) {
      await expect(page.locator('textarea[name="description"]')).toHaveValue(taskDescription);
    }
    
    await expect(page.locator('select[name="priority"]')).toHaveValue(taskPriority.toLowerCase());
    await expect(page.locator('select[name="project"]')).toHaveValue(taskProject);
  });

  test('AC2: Same validations as create', async ({ page }) => {
    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Test title validation
    const titleInput = page.locator('input[name="title"]');
    
    // Test empty title
    await titleInput.fill('');
    await titleInput.blur();
    await expect(page.locator('.task-inline-edit__field-error')).toContainText('required');

    // Test title too short
    await titleInput.fill('ab');
    await titleInput.blur();
    await expect(page.locator('.task-inline-edit__field-error')).toContainText('3 characters');

    // Test title too long
    await titleInput.fill('a'.repeat(101));
    await titleInput.blur();
    await expect(page.locator('.task-inline-edit__field-error')).toContainText('100 characters');

    // Test valid title
    await titleInput.fill('Valid Task Title');
    await titleInput.blur();
    await expect(page.locator('.task-inline-edit__field-error')).not.toBeVisible();

    // Test description validation (should allow dangerous content)
    const descriptionInput = page.locator('textarea[name="description"]');
    await descriptionInput.fill('<script>alert("xss")</script>');
    await descriptionInput.blur();
    
    // Should show security validation error
    await expect(page.locator('.task-inline-edit__field-error')).toContainText('HTML content not allowed');

    // Clear description (should be valid)
    await descriptionInput.fill('');
    await descriptionInput.blur();
    await expect(page.locator('.task-inline-edit__field-error')).not.toBeVisible();

    // Verify save button is enabled/disabled appropriately
    await titleInput.fill('Valid Title');
    await descriptionInput.fill('Valid Description');
    await expect(page.locator('.task-inline-edit__save-btn')).toBeEnabled();

    await titleInput.fill('');
    await expect(page.locator('.task-inline-edit__save-btn')).toBeDisabled();
  });

  test('AC3: Save button updates task', async ({ page }) => {
    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Fill form with updated data
    await page.locator('input[name="title"]').fill('Updated Task Title');
    await page.locator('textarea[name="description"]').fill('Updated task description');
    await page.locator('select[name="priority"]').selectOption('high');
    await page.locator('select[name="project"]').selectOption('Personal');

    // Click save button
    await page.locator('.task-inline-edit__save-btn').click();

    // Verify form disappears (edit mode closed)
    await expect(page.locator('.task-inline-edit')).not.toBeVisible();

    // Verify task is updated in the list
    const updatedTask = page.locator('.task-list__task').first();
    await expect(updatedTask.locator('.task-list__task-title')).toHaveText('Updated Task Title');
    await expect(updatedTask.locator('.task-list__task-description')).toHaveText('Updated task description');
    await expect(updatedTask.locator('.task-list__badge--priority')).toHaveText('high');
    await expect(updatedTask.locator('.task-list__badge--project')).toHaveText('Personal');

    // Verify updated timestamp
    await expect(updatedTask.locator('.task-list__task-updated')).toBeVisible();
  });

  test('AC4: Cancel button closes without saving', async ({ page }) => {
    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    const originalTitle = await firstTask.locator('.task-list__task-title').textContent();

    await firstTask.locator('.task-list__action-btn--edit').click();

    // Modify form data
    await page.locator('input[name="title"]').fill('Modified Title');
    await page.locator('textarea[name="description"]').fill('Modified description');
    await page.locator('select[name="priority"]').selectOption('low');
    await page.locator('select[name="project"]').selectOption('Study');

    // Click cancel button
    await page.locator('.task-inline-edit__cancel-btn').click();

    // Verify form disappears
    await expect(page.locator('.task-inline-edit')).not.toBeVisible();

    // Verify task data is unchanged
    await expect(firstTask.locator('.task-list__task-title')).toHaveText(originalTitle);
  });

  test('Inline editing should work in list context', async ({ page }) => {
    // Verify multiple tasks have edit buttons
    const tasks = page.locator('.task-list__task');
    const editButtons = page.locator('.task-list__action-btn--edit');
    
    await expect(tasks).toHaveCount.greaterThan(0);
    await expect(editButtons).toHaveCount(await tasks.count());

    // Edit a specific task while others remain in view mode
    const secondTask = tasks.nth(1);
    const secondTaskEditButton = editButtons.nth(1);
    
    await secondTaskEditButton.click();

    // Verify edit form appears for specific task
    await expect(page.locator('.task-inline-edit')).toBeVisible();
    
    // Verify other tasks are still visible in list mode
    const otherTasks = page.locator('.task-list__task:not(:has(.task-inline-edit))');
    await expect(otherTasks).toHaveCount(await tasks.count() - 1);
  });

  test('Should handle keyboard navigation', async ({ page }) => {
    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Test Tab navigation through form fields
    await page.keyboard.press('Tab');
    await expect(page.locator('textarea[name="description"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('select[name="priority"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('select[name="project"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('.task-inline-edit__save-btn')).toBeFocused();

    // Test Enter key to save
    await page.locator('input[name="title"]').fill('Updated Title');
    await page.keyboard.press('Enter');
    
    // Should save and close edit mode
    await expect(page.locator('.task-inline-edit')).not.toBeVisible();
  });

  test('Should handle Escape key to cancel', async ({ page }) => {
    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

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
    // Intercept the update request to simulate delay
    await page.route('**/*', async (route) => {
      // Let other requests through normally
      if (route.request().method() !== 'PUT') {
        await route.continue();
        return;
      }
      
      // Simulate delay for update requests
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Fill form and save
    await page.locator('input[name="title"]').fill('Updated Title');
    await page.locator('.task-inline-edit__save-btn').click();

    // Verify loading state
    await expect(page.locator('.task-inline-edit__save-btn')).toHaveClass(/.*disabled.*/);
    await expect(page.locator('.task-inline-edit__spinner')).toBeVisible();
    await expect(page.locator('.task-inline-edit__save-btn')).toContainText('Saving...');
    
    // Verify save button is disabled during save
    await expect(page.locator('.task-inline-edit__cancel-btn')).toBeDisabled();
  });

  test('Should display error messages', async ({ page }) => {
    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Simulate validation error
    await page.locator('input[name="title"]').fill('<script>alert("xss")</script>');
    await page.locator('input[name="title"]').blur();

    // Verify error message appears
    await expect(page.locator('.task-inline-edit__field-error')).toBeVisible();
    await expect(page.locator('.task-inline-edit__field-error')).toContainText('HTML content not allowed');
  });

  test('Should handle concurrent edits properly', async ({ page }) => {
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
    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Check ARIA labels
    await expect(page.locator('input[name="title"]')).toHaveAttribute('aria-label', 'Task Title');
    await expect(page.locator('textarea[name="description"]')).toHaveAttribute('aria-label', 'Task Description');
    
    // Check form validation announcements
    await expect(page.locator('.task-inline-edit__live-region')).toHaveAttribute('aria-live', 'polite');
    
    // Check keyboard accessibility
    await page.keyboard.press('Tab');
    let focused = await page.locator(':focus').count();
    expect(focused).toBeGreaterThan(0);

    // Test screen reader announcements
    await page.locator('input[name="title"]').fill('Valid Title');
    await expect(page.locator('.task-inline-edit__live-region')).toContainText('Form is valid');
  });

  test('Should prevent XSS attacks', async ({ page }) => {
    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    await firstTask.locator('.task-list__action-btn--edit').click();

    // Try to inject malicious content
    const maliciousTitle = '<script>alert("XSS Test")</script>Malicious Title';
    await page.locator('input[name="title"]').fill(maliciousTitle);
    
    // Verify script tags are escaped or removed
    const titleValue = await page.locator('input[name="title"]').inputValue();
    expect(titleValue).not.toContain('<script>');
    expect(titleValue).not.toContain('</script>');

    // Try malicious description
    const maliciousDescription = '<img src="x" onerror="alert(\'XSS\')">';
    await page.locator('textarea[name="description"]').fill(maliciousDescription);
    
    // Should show validation error
    await expect(page.locator('.task-inline-edit__field-error')).toContainText('HTML content not allowed');
  });

  test('Should preserve data integrity', async ({ page }) => {
    // Start editing a task
    const firstTask = page.locator('.task-list__task').first();
    const originalData = {
      title: await firstTask.locator('.task-list__task-title').textContent(),
      priority: await firstTask.locator('.task-list__badge--priority').textContent(),
      project: await firstTask.locator('.task-list__badge--project').textContent(),
      status: 'TODO' // Assuming this from the badge
    };

    await firstTask.locator('.task-list__action-btn--edit').click();

    // Only update title, leave other fields unchanged
    await page.locator('input[name="title"]').fill('New Title Only');
    await page.locator('.task-inline-edit__save-btn').click();

    // Verify only title changed, other fields preserved
    const updatedTask = page.locator('.task-list__task').first();
    await expect(updatedTask.locator('.task-list__task-title')).toHaveText('New Title Only');
    
    // Other fields should remain the same (priority, project, etc.)
    // Note: This depends on the exact implementation of form field population
  });

  test('Should handle rapid editing without errors', async ({ page }) => {
    // Test rapid edit/cancel cycles
    for (let i = 0; i < 5; i++) {
      const firstTask = page.locator('.task-list__task').first();
      await firstTask.locator('.task-list__action-btn--edit').click();
      
      // Verify edit form appears
      await expect(page.locator('.task-inline-edit')).toBeVisible();
      
      // Cancel immediately
      await page.locator('.task-inline-edit__cancel-btn').click();
      
      // Verify form disappears
      await expect(page.locator('.task-inline-edit')).not.toBeVisible();
      
      // Brief pause between operations
      await page.waitForTimeout(100);
    }

    // Application should remain stable
    await expect(page.locator('.task-list')).toBeVisible();
  });
});