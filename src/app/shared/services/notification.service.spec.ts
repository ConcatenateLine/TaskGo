import { TestBed } from '@angular/core/testing';
import { NotificationService, NotificationType, NotificationSource } from './notification.service';
import { DestroyRef } from '@angular/core';
import { vi } from 'vitest';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockDestroyRef: any;

  beforeEach(() => {
    const destroyRefSpy = {
      onDestroy: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [NotificationService, { provide: DestroyRef, useValue: destroyRefSpy }],
    });

    service = TestBed.inject(NotificationService);
    mockDestroyRef = TestBed.inject(DestroyRef) as any;
  });

  afterEach(() => {
    service.clearAll();
  });

  describe('showSuccess', () => {
    it('should show success notification for manual source', () => {
      service.showSuccess('Task saved successfully', 'manual');

      const notifications = service.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].message).toBe('Task saved successfully');
      expect(notifications[0].source).toBe('manual');
      expect(notifications[0].duration).toBe(2000); // default duration
    });

    it('should not show success notification for auto source', () => {
      service.showSuccess('Task saved automatically', 'auto');

      const notifications = service.notifications$();
      expect(notifications).toHaveLength(0);
    });

    it('should show success notification for system source', () => {
      service.showSuccess('System operation completed', 'system');

      const notifications = service.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].source).toBe('system');
    });

    it('should use custom duration when provided', () => {
      service.showSuccess('Custom duration', 'manual', 5000);

      const notifications = service.notifications$();
      expect(notifications[0].duration).toBe(5000);
    });
  });

  describe('showError', () => {
    it('should show persistent error notification', () => {
      service.showError('Something went wrong');

      const notifications = service.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].message).toBe('Something went wrong');
      expect(notifications[0].source).toBe('system');
      expect(notifications[0].duration).toBeNull(); // persistent
    });

    it('should include action when provided', () => {
      const actionHandler = vi.fn();
      service.showError('Network error', {
        label: 'Retry',
        handler: actionHandler,
      });

      const notifications = service.notifications$();
      expect(notifications[0].action).toEqual({
        label: 'Retry',
        handler: actionHandler,
      });
    });
  });

  describe('showWarning', () => {
    it('should show warning notification with default duration', () => {
      service.showWarning('Warning message');

      const notifications = service.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('warning');
      expect(notifications[0].duration).toBe(5000); // default warning duration
    });
  });

  describe('showInfo', () => {
    it('should show info notification with default duration', () => {
      service.showInfo('Info message');

      const notifications = service.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('info');
      expect(notifications[0].duration).toBe(3000); // default info duration
    });
  });

  describe('dismiss', () => {
    it('should remove specific notification', () => {
      service.showSuccess('Message 1', 'manual');
      service.showWarning('Message 2');

      expect(service.notifications$()).toHaveLength(2);

      const firstId = service.notifications$()[0].id;
      service.dismiss(firstId);

      const remaining = service.notifications$();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].message).toBe('Message 2');
    });

    it('should handle dismiss of non-existent notification', () => {
      service.showSuccess('Test message', 'manual');
      const initialCount = service.notifications$().length;

      service.dismiss('non-existent-id');

      expect(service.notifications$()).toHaveLength(initialCount);
    });
  });

  describe('clearAll', () => {
    it('should remove all notifications', () => {
      service.showSuccess('Success', 'manual');
      service.showWarning('Warning');
      service.showError('Error');

      expect(service.notifications$()).toHaveLength(3);

      service.clearAll();

      expect(service.notifications$()).toHaveLength(0);
    });
  });

  describe('max notifications limit', () => {
    it('should remove oldest notification when limit is exceeded', () => {
      // Add notifications up to the limit (default is 5)
      for (let i = 1; i <= 5; i++) {
        service.showInfo(`Message ${i}`);
      }

      expect(service.notifications$()).toHaveLength(5);
      expect(service.notifications$()[0].message).toBe('Message 1');

      // Add one more notification
      service.showWarning('New message');

      const notifications = service.notifications$();
      expect(notifications).toHaveLength(5); // still at limit
      expect(notifications[0].message).toBe('Message 2'); // oldest was removed
      expect(notifications[4].message).toBe('New message'); // newest added
    });
  });

  describe('auto-dismiss', () => {
    it('should auto-dismiss notification after duration', async () => {
      service.showSuccess('Auto dismiss test', 'manual', 1000);

      expect(service.notifications$()).toHaveLength(1);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(service.notifications$()).toHaveLength(0);
    });

    it('should not auto-dismiss persistent notifications', async () => {
      service.showError('Persistent error');

      expect(service.notifications$()).toHaveLength(1);

      await new Promise((resolve) => setTimeout(resolve, 1000)); // large duration

      expect(service.notifications$()).toHaveLength(1); // still there
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      service.showSuccess('Success', 'manual');
      service.showError('Error');
      service.showWarning('Warning');
      service.showInfo('Info');
    });

    it('getCount should return correct count', () => {
      expect(service.getCount()).toBe(4);
    });

    it('getByType should filter notifications', () => {
      const errors = service.getByType('error');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Error');

      const successes = service.getByType('success');
      expect(successes).toHaveLength(1);
      expect(successes[0].message).toBe('Success');
    });

    it('hasActive should return true when notifications exist', () => {
      expect(service.hasActive()).toBe(true);

      service.clearAll();
      expect(service.hasActive()).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      service.updateConfig({
        maxNotifications: 3,
        defaultDurations: {
          success: 5000,
          error: null,
          warning: 8000,
          info: 4000,
        },
      });

      // Test max notifications
      for (let i = 1; i <= 5; i++) {
        service.showInfo(`Message ${i}`);
      }

      expect(service.notifications$()).toHaveLength(3); // custom limit

      // Test custom duration
      service.clearAll();
      service.showSuccess('Test', 'manual');
      expect(service.notifications$()[0].duration).toBe(5000);
    });
  });
});
