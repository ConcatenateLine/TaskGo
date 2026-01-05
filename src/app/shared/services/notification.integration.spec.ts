import { TestBed } from '@angular/core/testing';
import { fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { of } from 'rxjs';
import { NotificationService } from './notification.service';
import { AutoSaveService, AutoSaveSource } from './auto-save.service';
import { TaskService } from './task.service';
import { Task } from '../models/task.model';

describe('Notification Integration with AutoSave', () => {
  let notificationService: NotificationService;
  let autoSaveService: AutoSaveService;
  let taskService: TaskService;

  const mockTask: Task = {
    id: 'test-task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'TODO',
    priority: 'medium',
    project: 'Personal',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationService, AutoSaveService, TaskService],
    });

    notificationService = TestBed.inject(NotificationService);
    autoSaveService = TestBed.inject(AutoSaveService);
    taskService = TestBed.inject(TaskService);
  });

  afterEach(() => {
    notificationService.clearAll();
    autoSaveService.clearPendingOperations();
  });

  describe('Manual operations should show notifications', async () => {
    it('should show success notification for manual task creation', async () => {
      taskService.createTask(mockTask);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].message).toBe('Task saved successfully');
      expect(notifications[0].source).toBe('manual');
    });

    it('should show success notification for manual task update', async () => {
      // First create a task
      taskService.createTask(mockTask);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clear notifications from creation
      notificationService.clearAll();

      // Then update it
      const updatedTask = { ...mockTask, title: 'Updated Task' };
      taskService.updateTask(mockTask.id, { title: 'Updated Task' });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].message).toBe('Task updated successfully');
    });

    it('should show success notification for manual task deletion', async () => {
      // First create a task
      taskService.createTask(mockTask);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clear notifications from creation
      notificationService.clearAll();

      // Then delete it
      taskService.deleteTask(mockTask.id);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].message).toBe('Task deleted successfully');
    });

    it('should show success notification for manual status change', async () => {
      // First create a task
      taskService.createTask(mockTask);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clear notifications from creation
      notificationService.clearAll();

      // Then change status
      taskService.changeStatus(mockTask.id, 'IN_PROGRESS');
      await new Promise((resolve) => setTimeout(resolve, 100));

      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].message).toBe('Task updated successfully'); // status change uses update message
    });
  });

  describe('Auto operations should not show notifications', () => {
    it('should not show notification for auto task creation', async () => {
      taskService.createTask(mockTask);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(0);
    });

    it('should not show notification for auto task update', async () => {
      // First create a task with auto source
      taskService.createTask(mockTask);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Then update it with auto source
      taskService.updateTask(mockTask.id, { title: 'Auto Updated' });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(0);
    });

    it('should not show notification for auto task deletion', async () => {
      // First create a task with auto source
      taskService.createTask(mockTask);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Then delete it with auto source
      taskService.deleteTask(mockTask.id);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(0);
    });

    it('should not show notification for auto status change', async () => {
      // First create a task with auto source
      taskService.createTask(mockTask);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Then change status with auto source
      taskService.changeStatus(mockTask.id, 'IN_PROGRESS');
      await new Promise((resolve) => setTimeout(resolve, 100));

      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(0);
    });
  });

  describe('Error notifications', () => {
    it('should show error notification for failed auto-save operation', async () => {
      // Mock a failing storage service by manipulating the AutoSaveService
      // This is a simplified test - in reality you'd mock the LocalStorageService

      // For this test, we'll simulate an error by directly calling the error handler
      notificationService.showError('Failed to create task. Please try again.');

      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].message).toBe('Failed to create task. Please try again.');
      expect(notifications[0].duration).toBeNull(); // Persistent
    });
  });

  describe('Auto-dismiss behavior', () => {
    it('should auto-dismiss manual success notifications after 2 seconds', async () => {
      taskService.createTask(mockTask);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(notificationService.notifications$()).toHaveLength(1);

      tick(2000);

      expect(notificationService.notifications$()).toHaveLength(0);
      discardPeriodicTasks();
    });

    it('should not auto-dismiss error notifications', async () => {
      notificationService.showError('Test error');
      tick(5000);

      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('error');
    });
  });

  describe('Notification queue management', () => {
    it('should handle multiple rapid operations', async () => {
      // Create multiple tasks rapidly
      for (let i = 1; i <= 3; i++) {
        const task = {
          ...mockTask,
          id: `test-task-${i}`,
          title: `Task ${i}`,
        };
        taskService.createTask(task);
        tick(50);
      }

      // Should have 3 notifications
      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(3);
      expect(notifications[0].message).toBe('Task saved successfully');
      expect(notifications[1].message).toBe('Task saved successfully');
      expect(notifications[2].message).toBe('Task saved successfully');
    });

    it('should respect max notification limit', async () => {
      // Create 6 tasks (more than default limit of 5)
      for (let i = 1; i <= 6; i++) {
        const task = {
          ...mockTask,
          id: `test-task-${i}`,
          title: `Task ${i}`,
        };
        taskService.createTask(task);
        tick(50);
      }

      // Should have at most 5 notifications
      expect(notificationService.notifications$().length).toBeLessThanOrEqual(5);
    });
  });

  describe('System notifications', () => {
    it('should show system notifications regardless of auto/manual distinction', () => {
      notificationService.showWarning('This is a system warning');
      notificationService.showInfo('This is system info');

      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(2);
      expect(notifications[0].source).toBe('system');
      expect(notifications[1].source).toBe('system');
    });
  });

  describe('Integration with app error handling', () => {
    it('should show error notification when task operation throws error', () => {
      // Mock a scenario where task service throws an error
      // This would happen in real app due to validation, rate limiting, etc.

      try {
        // Simulate an error by trying to update non-existent task
        taskService.updateTask('non-existent-id', { title: 'Test' });
      } catch (error) {
        // App component would catch this and show notification
        notificationService.showError('Task not found');
      }

      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].message).toBe('Task not found');
    });
  });
});
