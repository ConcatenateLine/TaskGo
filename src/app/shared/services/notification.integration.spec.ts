import { TestBed } from '@angular/core/testing';
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
    
    // Initialize all required dependencies with proper mocks
    setupMockDependencies();
  });

  function setupMockDependencies() {
    // Mock TaskService dependencies
    const taskServiceAny = taskService as any;
    
    taskServiceAny.authService = {
      isAuthenticated: () => true,
      requireAuthentication: () => {},
      createAnonymousUser: () => {},
      getUserContext: () => ({ userId: 'test-user' }),
      logSecurityEvent: () => {}
    };
    
    taskServiceAny.cryptoService = {
      getItem: () => [],
      setItem: () => {},
      getStorageKey: () => 'test_key',
      clearTaskStorage: () => {}
    };
    
    taskServiceAny.validationService = {
      validateTaskTitle: () => ({ isValid: true, sanitized: 'Test Task' }),
      validateTaskDescription: () => ({ isValid: true, sanitized: 'Test Description' }),
      validateCSP: () => ({ isValid: true, violations: [] })
    };
    
    taskServiceAny.securityService = {
      checkRateLimit: () => ({ allowed: true }),
      validateRequest: () => ({ valid: true, threats: [] })
    };

    // Mock AutoSaveService dependencies
    const autoSaveServiceAny = autoSaveService as any;
    
    autoSaveServiceAny.localStorageService = {
      getItem: () => Promise.resolve({ success: true, data: [] }),
      setItem: () => Promise.resolve({ success: true, data: [] })
    };
    
    autoSaveServiceAny.authService = {
      logSecurityEvent: () => {},
      getUserContext: () => ({ userId: 'test-user' })
    };
  }

  afterEach(() => {
    notificationService.clearAll();
    autoSaveService.clearPendingOperations();
  });

  describe('NotificationService direct behavior', () => {
    it('should show success notification for manual source', () => {
      notificationService.showSuccess('Test message', 'manual');
      
      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].message).toBe('Test message');
      expect(notifications[0].source).toBe('manual');
    });

    it('should NOT show success notification for auto source', () => {
      notificationService.showSuccess('Test message', 'auto');
      
      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(0);
    });

    it('should show error notification regardless of source', () => {
      notificationService.showError('Test error');
      
      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].message).toBe('Test error');
      expect(notifications[0].source).toBe('system');
    });
  });

  describe('AutoSaveService integration', () => {
    it('should show notification for manual operations', async () => {
      // Directly test the auto-save service with manual source
      autoSaveService.queueTaskCreation(mockTask, [], 'manual');
      
      // Wait for debounce and processing
      await new Promise((resolve) => setTimeout(resolve, 600));
      
      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].source).toBe('manual');
    });

    it('should NOT show notification for auto operations', async () => {
      // Directly test the auto-save service with auto source
      autoSaveService.queueTaskCreation(mockTask, [], 'auto');
      
      // Wait for debounce and processing
      await new Promise((resolve) => setTimeout(resolve, 600));
      
      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(0);
    });
  });

  describe('TaskService integration', () => {
    it('should show notification for manual task creation', async () => {
      taskService.createTask(mockTask);
      
      // Wait for debounce and processing
      await new Promise((resolve) => setTimeout(resolve, 600));
      
      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].source).toBe('manual');
    });
  });

  describe('System notifications', () => {
    it('should show system notifications regardless of source', () => {
      notificationService.showWarning('System warning');
      notificationService.showInfo('System info');
      
      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(2);
      expect(notifications[0].source).toBe('system');
      expect(notifications[1].source).toBe('system');
    });
  });

  describe('Error handling', () => {
    it('should show error notification when showError is called', () => {
      notificationService.showError('Test error message');
      
      const notifications = notificationService.notifications$();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('error');
      expect(notifications[0].message).toBe('Test error message');
      expect(notifications[0].duration).toBeNull(); // Errors are persistent
    });
  });
});
