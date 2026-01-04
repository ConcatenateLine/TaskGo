import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { AutoSaveService } from './auto-save.service';
import { LocalStorageService } from './local-storage.service';
import { CryptoService } from './crypto.service';
import { ValidationService } from './validation.service';
import { AuthService } from './auth.service';
import { SecurityService } from './security.service';
import { Task } from '../models/task.model';

describe('TaskService Auto-Save Integration', () => {
  let taskService: TaskService;
  let autoSaveService: AutoSaveService;
  let localStorageServiceSpy: any;
  let cryptoServiceSpy: any;
  let validationServiceSpy: any;
  let authServiceSpy: any;
  let securityServiceSpy: any;

  let mockTask: Task;

  beforeEach(() => {
    localStorageServiceSpy = {
      setItem: vi.fn(),
      getItem: vi.fn(),
      clear: vi.fn(),
    };
    
    cryptoServiceSpy = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      getStorageKey: vi.fn(),
      clearTaskStorage: vi.fn(),
    };
    
    validationServiceSpy = {
      validateTaskTitle: vi.fn(),
      validateTaskDescription: vi.fn(),
      validateCSP: vi.fn(),
    };
    
    authServiceSpy = {
      requireAuthentication: vi.fn(),
      getUserContext: vi.fn(),
      logSecurityEvent: vi.fn(),
      isAuthenticated: vi.fn(),
      createAnonymousUser: vi.fn(),
    };
    
    securityServiceSpy = {
      checkRateLimit: vi.fn(),
      validateRequest: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        AutoSaveService,
        { provide: LocalStorageService, useValue: localStorageServiceSpy },
        { provide: CryptoService, useValue: cryptoServiceSpy },
        { provide: ValidationService, useValue: validationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SecurityService, useValue: securityServiceSpy }
      ]
    });

    taskService = TestBed.inject(TaskService);
    autoSaveService = TestBed.inject(AutoSaveService);

    mockTask = {
      id: 'integration-test-task',
      title: 'Integration Test Task',
      description: 'Test Description',
      priority: 'medium',
      status: 'TODO',
      project: 'Work',
      createdAt: new Date('2024-01-01T00:00:00'),
      updatedAt: new Date('2024-01-01T00:00:00')
    };

    // Setup default spy returns
    authServiceSpy.isAuthenticated.mockReturnValue(true);
    authServiceSpy.getUserContext.mockReturnValue({ userId: 'test-user' });
    authServiceSpy.logSecurityEvent.mockReturnValue();
    securityServiceSpy.checkRateLimit.mockReturnValue({ allowed: true });
    securityServiceSpy.validateRequest.mockReturnValue({ valid: true, threats: [] });
    validationServiceSpy.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Test Title' });
    validationServiceSpy.validateTaskDescription.mockReturnValue({ isValid: true, sanitized: 'Test Description' });
    validationServiceSpy.validateCSP.mockReturnValue({ isValid: true, violations: [] });
    cryptoServiceSpy.getStorageKey.mockReturnValue('test_key');
    cryptoServiceSpy.getItem.mockReturnValue([]);
    localStorageServiceSpy.setItem.mockResolvedValue({ success: true, data: [] });
    localStorageServiceSpy.getItem.mockResolvedValue({ success: true, data: [] });
  });

  describe('Task Creation with Auto-Save', () => {
    it('should auto-save after task creation', async () => {
      const taskData = {
        title: 'New Task',
        description: 'New Description',
        priority: 'high' as const,
        status: 'TODO' as const,
        project: 'Work' as const
      };

      const createdTask = taskService.createTask(taskData);

      expect(createdTask).toBeTruthy();
      expect(createdTask.title).toBe('New Task');

      // Wait for auto-save processing
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(localStorageServiceSpy.setItem).toHaveBeenCalledWith('tasks', expect.any(Array));
      expect(autoSaveService.getPendingOperations()).toHaveLength(0);
    });

    it('should maintain optimistic updates during task creation', () => {
      const taskData = {
        title: 'Optimistic Task',
        priority: 'medium' as const,
        status: 'TODO' as const,
        project: 'Personal' as const
      };

      const createdTask = taskService.createTask(taskData);

      const pendingOps = autoSaveService.getPendingOperations();
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0].optimisticData).toBeDefined();
      expect(pendingOps[0].optimisticData).toContain(createdTask);
    });

    it('should handle rapid task creation with debouncing', async () => {
      const taskData1 = { title: 'Task 1', priority: 'medium' as const, status: 'TODO' as const, project: 'Work' as const };
      const taskData2 = { title: 'Task 2', priority: 'high' as const, status: 'TODO' as const, project: 'Personal' as const };

      taskService.createTask(taskData1);
      taskService.createTask(taskData2);

      // Should have pending operations
      expect(autoSaveService.getPendingOperations()).toHaveLength(2);

      // Wait for debouncing
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should be processed
      expect(autoSaveService.getPendingOperations()).toHaveLength(0);
      expect(localStorageServiceSpy.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('Task Update with Auto-Save', () => {
    beforeEach(() => {
      cryptoServiceSpy.getItem.mockReturnValue([mockTask]);
      taskService.createTask({
        title: 'Original Task',
        priority: 'medium',
        status: 'TODO',
        project: 'Work'
      });
    });

    it('should auto-save after task update', async () => {
      const updatedTask = taskService.updateTask(mockTask.id, { title: 'Updated Task' });

      expect(updatedTask).toBeTruthy();
      expect(updatedTask?.title).toBe('Updated Task');

      // Wait for auto-save processing
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(localStorageServiceSpy.setItem).toHaveBeenCalledWith('tasks', expect.any(Array));
    });

    it('should maintain optimistic updates during task update', () => {
      const updatedTask = taskService.updateTask(mockTask.id, { title: 'Optimistic Update' });

      expect(updatedTask).toBeTruthy();

      const pendingOps = autoSaveService.getPendingOperations();
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0].optimisticData).toBeDefined();
      expect(pendingOps[0].optimisticData?.some(t => t.title === 'Optimistic Update')).toBe(true);
    });

    it('should handle concurrent updates gracefully', async () => {
      // Simulate concurrent updates
      const update1 = taskService.updateTask(mockTask.id, { title: 'Update 1' });
      const update2 = taskService.updateTask(mockTask.id, { title: 'Update 2' });

      expect(update1).toBeTruthy();
      expect(update2).toBeTruthy();
      expect(update2?.title).toBe('Update 2');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should have processed both operations
      const metrics = autoSaveService.getMetrics();
      expect(metrics.totalOperations).toBeGreaterThan(0);
    });
  });

  describe('Task Deletion with Auto-Save', () => {
    beforeEach(() => {
      cryptoServiceSpy.getItem.mockReturnValue([mockTask]);
      taskService.createTask({
        title: 'Task to Delete',
        priority: 'low',
        status: 'TODO',
        project: 'General'
      });
    });

    it('should auto-save after task deletion', async () => {
      const deleted = taskService.deleteTask(mockTask.id);

      expect(deleted).toBe(true);

      // Wait for auto-save processing
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(localStorageServiceSpy.setItem).toHaveBeenCalledWith('tasks', expect.any(Array));
    });

    it('should maintain optimistic updates during task deletion', () => {
      taskService.deleteTask(mockTask.id);

      const pendingOps = autoSaveService.getPendingOperations();
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0].optimisticData).toBeDefined();
      expect(pendingOps[0].optimisticData?.some(t => t.id === mockTask.id)).toBe(false);
    });
  });

  describe('Status Changes with Auto-Save', () => {
    beforeEach(() => {
      cryptoServiceSpy.getItem.mockReturnValue([mockTask]);
    });

    it('should auto-save after status change', async () => {
      const updatedTask = taskService.changeStatus(mockTask.id, 'IN_PROGRESS');

      expect(updatedTask).toBeTruthy();
      expect(updatedTask?.status).toBe('IN_PROGRESS');

      // Wait for auto-save processing
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(localStorageServiceSpy.setItem).toHaveBeenCalledWith('tasks', expect.any(Array));
    });

    it('should auto-save after multiple status changes', async () => {
      const step1 = taskService.changeStatus(mockTask.id, 'IN_PROGRESS');
      const step2 = taskService.changeStatus(mockTask.id, 'DONE');

      expect(step1?.status).toBe('IN_PROGRESS');
      expect(step2?.status).toBe('DONE');

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(localStorageServiceSpy.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling and Rollback', () => {
    it('should handle auto-save failures gracefully', async () => {
      localStorageServiceSpy.setItem.mockResolvedValue({
        success: false,
        error: new Error('Storage unavailable')
      });

      const taskData = {
        title: 'Task During Error',
        priority: 'medium',
        status: 'TODO',
        project: 'Work'
      };

      const createdTask = taskService.createTask(taskData);

      expect(createdTask).toBeTruthy();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 600));

      const metrics = autoSaveService.getMetrics();
      expect(metrics.failedSaves).toBeGreaterThan(0);
      expect(metrics.rollbackCount).toBeGreaterThan(0);
    });

    it('should continue with encrypted storage fallback', async () => {
      localStorageServiceSpy.setItem.mockResolvedValue({
        success: false,
        error: new Error('Auto-save failed')
      });

      cryptoServiceSpy.setItem.mockReturnValue();

      const taskData = {
        title: 'Fallback Task',
        priority: 'low',
        status: 'TODO',
        project: 'Personal'
      };

      const createdTask = taskService.createTask(taskData);

      expect(createdTask).toBeTruthy();
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 600));

      // Encrypted storage should still be called as fallback
      expect(cryptoServiceSpy.setItem).toHaveBeenCalled();
    });
  });

  describe('Performance and Metrics', () => {
    it('should track auto-save metrics through task operations', async () => {
      const taskData = {
        title: 'Metrics Task',
        priority: 'high',
        status: 'TODO',
        project: 'Study'
      };

      taskService.createTask(taskData);
      taskService.updateTask(mockTask.id, { title: 'Updated' });
      taskService.deleteTask(mockTask.id);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 600));

      const metrics = autoSaveService.getMetrics();
      expect(metrics.totalOperations).toBeGreaterThan(0);
      expect(metrics.averageSaveTime).toBeGreaterThan(0);
    });

    it('should provide access to auto-save metrics through TaskService', async () => {
      const taskData = {
        title: 'Accessible Metrics Task',
        priority: 'medium',
        status: 'TODO',
        project: 'Work'
      };

      taskService.createTask(taskData);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 600));

      const metrics = taskService.getAutoSaveMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalOperations).toBeGreaterThan(0);
    });
  });

  describe('Configuration and Control', () => {
    it('should allow updating auto-save configuration', () => {
      taskService.updateAutoSaveConfig({
        debounceTimeMs: 1000,
        enableOptimisticUpdates: false
      });

      const taskData = {
        title: 'Config Test Task',
        priority: 'medium',
        status: 'TODO',
        project: 'General'
      };

      taskService.createTask(taskData);

      const pendingOps = autoSaveService.getPendingOperations();
      expect(pendingOps[0].optimisticData).toBeUndefined();
      expect(pendingOps[0].rollbackData).toBeUndefined();
    });

    it('should allow force sync with localStorage', async () => {
      localStorageServiceSpy.getItem.mockResolvedValue({
        success: true,
        data: [mockTask]
      });

      const result = await taskService.forceSync();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockTask]);
    });

    it('should allow access to pending operations', () => {
      const taskData = {
        title: 'Pending Op Task',
        priority: 'low',
        status: 'TODO',
        project: 'Personal'
      };

      taskService.createTask(taskData);

      const pendingOps = taskService.getPendingOperations();
      expect(pendingOps).toHaveLength(1);
      expect(pendingOps[0].type).toBe('create');
    });
  });

  describe('Integration with Security', () => {
    it('should log security events for auto-save operations', async () => {
      localStorageServiceSpy.setItem.mockResolvedValue({
        success: true,
        data: [mockTask]
      });

      const taskData = {
        title: 'Security Test Task',
        priority: 'medium',
        status: 'TODO',
        project: 'Work'
      };

      taskService.createTask(taskData);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(authServiceSpy.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_ACCESS',
        message: expect.stringContaining('Auto-save operation completed'),
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });

    it('should handle rate limiting for auto-save operations', async () => {
      securityServiceSpy.checkRateLimit.mockReturnValue({ allowed: false });

      const taskData = {
        title: 'Rate Limited Task',
        priority: 'high',
        status: 'TODO',
        project: 'Study'
      };

      expect(() => taskService.createTask(taskData)).toThrow('Rate limit exceeded');
    });
  });
});