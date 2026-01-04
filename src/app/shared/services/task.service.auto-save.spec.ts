import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { AutoSaveService } from './auto-save.service';
import { LocalStorageService } from './local-storage.service';
import { CryptoService } from './crypto.service';
import { ValidationService } from './validation.service';
import { AuthService } from './auth.service';
import { SecurityService } from './security.service';
import { Task, TaskPriority, TaskStatus, TaskProject } from '../models/task.model';
import { vi } from 'vitest';

describe('TaskService Auto-Save Integration', () => {
  let taskService: TaskService;
  let autoSaveService: AutoSaveService;
  let localStorageServiceSpy: { 
    setItem: ReturnType<typeof vi.fn>, 
    getItem: ReturnType<typeof vi.fn>, 
    clear: ReturnType<typeof vi.fn> 
  };
  let cryptoServiceSpy: { 
    getItem: ReturnType<typeof vi.fn>, 
    setItem: ReturnType<typeof vi.fn>, 
    getStorageKey: ReturnType<typeof vi.fn>, 
    clearTaskStorage: ReturnType<typeof vi.fn>
  };
  let validationServiceSpy: { 
    validateTaskTitle: ReturnType<typeof vi.fn>, 
    validateTaskDescription: ReturnType<typeof vi.fn>, 
    validateCSP: ReturnType<typeof vi.fn>
  };
  let authServiceSpy: { 
    requireAuthentication: ReturnType<typeof vi.fn>, 
    getUserContext: ReturnType<typeof vi.fn>, 
    logSecurityEvent: ReturnType<typeof vi.fn>, 
    isAuthenticated: ReturnType<typeof vi.fn>, 
    createAnonymousUser: ReturnType<typeof vi.fn>
  };
  let securityServiceSpy: { 
    sanitizeData: ReturnType<typeof vi.fn>, 
    validateDataIntegrity: ReturnType<typeof vi.fn>, 
    checkRateLimit: ReturnType<typeof vi.fn>, 
    getUserContext: ReturnType<typeof vi.fn>, 
    validateRequest: ReturnType<typeof vi.fn>
  };

  const mockTask: Task = {
    id: 'test-1',
    title: 'Test Task',
    description: 'Test Description',
    priority: 'medium' as TaskPriority,
    status: 'TODO' as TaskStatus,
    project: 'Work' as TaskProject,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z')
  };

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
      validateTaskTitle: vi.fn().mockImplementation((title: string) => ({ 
        isValid: true, 
        sanitized: title, 
        error: '' 
      })),
      validateTaskDescription: vi.fn().mockImplementation((desc: string) => ({ 
        isValid: true, 
        sanitized: desc, 
        error: '' 
      })),
      validateCSP: vi.fn().mockReturnValue({ valid: true, threats: [] }),
    };
    
    authServiceSpy = {
      requireAuthentication: vi.fn(),
      getUserContext: vi.fn().mockReturnValue({
        userId: 'test-user',
        sessionId: 'test-session'
      }),
      logSecurityEvent: vi.fn(),
      isAuthenticated: vi.fn(),
      createAnonymousUser: vi.fn(),
    };
    
    securityServiceSpy = {
      sanitizeData: vi.fn(),
      validateDataIntegrity: vi.fn(),
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remainingAttempts: 99 }),
      getUserContext: vi.fn(),
      validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] }),
    };

    localStorageServiceSpy.getItem.mockResolvedValue({
      success: true,
      data: [mockTask],
      fallbackUsed: false
    });

    localStorageServiceSpy.setItem.mockResolvedValue({
      success: true,
      data: undefined,
      fallbackUsed: false
    });

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        AutoSaveService,
        { provide: LocalStorageService, useValue: localStorageServiceSpy },
        { provide: CryptoService, useValue: cryptoServiceSpy },
        { provide: ValidationService, useValue: validationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SecurityService, useValue: securityServiceSpy },
      ]
    });

    taskService = TestBed.inject(TaskService);
    autoSaveService = TestBed.inject(AutoSaveService);
  });

  describe('Task Creation with Auto-Save', () => {
    it('should create task and trigger auto-save', async () => {
      const taskData = {
        title: 'New Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject
      };

      // First, let's mock the initial state load that AutoSaveService does on construction
      localStorageServiceSpy.getItem.mockResolvedValueOnce({
        success: true,
        data: [],
        fallbackUsed: false
      });

      const createdTask = taskService.createTask(taskData);

      expect(createdTask).toBeTruthy();
      expect(createdTask.title).toBe('New Task');
      expect(createdTask.priority).toBe('medium');
      expect(createdTask.status).toBe('TODO');
      expect(createdTask.project).toBe('Work');
      expect(createdTask.id).toBeDefined();
      expect(createdTask.createdAt).toBeInstanceOf(Date);
      expect(createdTask.updatedAt).toBeInstanceOf(Date);
      
      // Wait for the debounced auto-save to trigger (default is 500ms)
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Auto-save should be triggered with the new task added
      expect(localStorageServiceSpy.setItem).toHaveBeenCalledWith('tasks', expect.any(Array));
      
      // Verify the task was included in the saved array
      const savedCall = localStorageServiceSpy.setItem.mock.calls.find(
        call => call[0] === 'tasks'
      );
      expect(savedCall).toBeDefined();
      const savedTasks = savedCall![1] as Task[];
      expect(savedTasks).toContainEqual(createdTask);
    });

    it('should handle rate limiting gracefully', () => {
      const taskData = {
        title: 'Rapid Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject
      };

      // Mock rate limiting to fail
      securityServiceSpy.checkRateLimit.mockReturnValue({ 
        allowed: false, 
        remainingAttempts: 0 
      });

      // createTask is SYNCHRONOUS - it throws immediately, no await needed!
      expect(() => taskService.createTask(taskData)).toThrow('Rate limit exceeded. Please try again later.');
    });
  });

  describe('Task Update with Auto-Save', () => {
    beforeEach(() => {
      // Reset all mocks before each test in this section
      vi.clearAllMocks();
      
      // CRITICAL: Set up the getItem mock BEFORE the services are used
      // This ensures AutoSaveService.loadInitialState() gets the correct data
      localStorageServiceSpy.getItem.mockResolvedValue({
        success: true,
        data: [mockTask],
        fallbackUsed: false
      });
      
      // Reset setItem mock to track only this test's calls
      localStorageServiceSpy.setItem.mockResolvedValue({
        success: true,
        data: undefined,
        fallbackUsed: false
      });
    });

    it('should update task and trigger auto-save', async () => {
      // Ensure TaskService has the initial data by forcing a load
      // The AutoSaveService already loaded the data in constructor, but TaskService 
      // needs to have its signal populated. We need to manually sync this in test.
      const initialTasks = taskService.getTasks();
      if (initialTasks.length === 0) {
        // Force load tasks directly to TaskService's signal for test isolation
        // In real app this would be handled by AppStartupService
        (taskService as any).tasks.set([mockTask]);
      }

      const updatedTask = taskService.updateTask('test-1', { title: 'Updated Test Task' });

      expect(updatedTask).toBeTruthy();
      expect(updatedTask?.title).toBe('Updated Test Task');
      expect(updatedTask?.id).toBe('test-1');
      
      // Wait for the debounced auto-save to trigger (default is 500ms)
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Auto-save should be triggered with the updated task
      expect(localStorageServiceSpy.setItem).toHaveBeenCalledWith('tasks', expect.any(Array));
      
      // Verify the task was updated in the saved array
      const savedCall = localStorageServiceSpy.setItem.mock.calls.find(
        call => call[0] === 'tasks'
      );
      expect(savedCall).toBeDefined();
      const savedTasks = savedCall![1] as Task[];
      const updatedTaskInArray = savedTasks.find(task => task.id === 'test-1');
      expect(updatedTaskInArray?.title).toBe('Updated Test Task');
      expect(updatedTaskInArray?.updatedAt).not.toEqual(mockTask.updatedAt); // Should be updated
    });
  });

  describe('Task Deletion with Auto-Save', () => {
    beforeEach(() => {
      localStorageServiceSpy.getItem.mockResolvedValue({
        success: true,
        data: [mockTask],
        fallbackUsed: false
      });
    });

    it('should delete task and trigger auto-save', async () => {
      // Ensure TaskService has the initial data by forcing a load
      // The AutoSaveService already loaded the data in constructor, but TaskService 
      // needs to have its signal populated. We need to manually sync this in test.
      const initialTasks = taskService.getTasks();
      if (initialTasks.length === 0) {
        // Force load tasks directly to TaskService's signal for test isolation
        // In real app this would be handled by AppStartupService
        (taskService as any).tasks.set([mockTask]);
      }

      const deleted = await taskService.deleteTask('test-1');

      expect(deleted).toBe(true);
      
      // Wait for the debounced auto-save to trigger (default is 500ms)
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Auto-save should be triggered with task removed
      expect(localStorageServiceSpy.setItem).toHaveBeenCalledWith('tasks', expect.any(Array));
      
      // Verify the task was removed from the saved array
      const savedCall = localStorageServiceSpy.setItem.mock.calls.find(
        call => call[0] === 'tasks'
      );
      expect(savedCall).toBeDefined();
      const savedTasks = savedCall![1] as Task[];
      expect(savedTasks).not.toContainEqual(mockTask);
      expect(savedTasks).toHaveLength(0); // Should be empty after deletion
    });

    it('should handle deletion of non-existent task', async () => {
      const deleted = await taskService.deleteTask('non-existent');

      expect(deleted).toBe(false);
      
      // No save should be triggered for non-existent task
      expect(localStorageServiceSpy.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Status Changes with Auto-Save', () => {
    beforeEach(() => {
      // Reset all mocks before each test in this section
      vi.clearAllMocks();
      
      // CRITICAL: Set up the getItem mock BEFORE the services are used
      // This ensures AutoSaveService.loadInitialState() gets the correct data
      localStorageServiceSpy.getItem.mockResolvedValue({
        success: true,
        data: [mockTask],
        fallbackUsed: false
      });
      
      // Reset setItem mock to track only this test's calls
      localStorageServiceSpy.setItem.mockResolvedValue({
        success: true,
        data: undefined,
        fallbackUsed: false
      });
    });

    it('should change status and trigger auto-save', async () => {
      // Ensure TaskService has the initial data by forcing a load
      // The AutoSaveService already loaded the data in constructor, but TaskService 
      // needs to have its signal populated. We need to manually sync this in test.
      const initialTasks = taskService.getTasks();
      if (initialTasks.length === 0) {
        // Force load tasks directly to TaskService's signal for test isolation
        // In real app this would be handled by AppStartupService
        (taskService as any).tasks.set([mockTask]);
      }

      // changeStatus is SYNCHRONOUS - no await needed!
      const updatedTask = taskService.changeStatus('test-1', 'IN_PROGRESS' as TaskStatus);

      expect(updatedTask).toBeTruthy();
      expect(updatedTask?.status).toBe('IN_PROGRESS');
      expect(updatedTask?.id).toBe('test-1');
      
      // Wait for the debounced auto-save to trigger (default is 500ms)
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Auto-save should be triggered with the updated task
      expect(localStorageServiceSpy.setItem).toHaveBeenCalledWith('tasks', expect.any(Array));
      
      // Verify the task was updated in the saved array
      const savedCall = localStorageServiceSpy.setItem.mock.calls.find(
        call => call[0] === 'tasks'
      );
      expect(savedCall).toBeDefined();
      const savedTasks = savedCall![1] as Task[];
      const updatedTaskInArray = savedTasks.find(task => task.id === 'test-1');
      expect(updatedTaskInArray?.status).toBe('IN_PROGRESS');
      expect(updatedTaskInArray?.updatedAt).not.toEqual(mockTask.updatedAt); // Should be updated
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle localStorage failures with encrypted storage fallback', async () => {
      localStorageServiceSpy.setItem.mockRejectedValueOnce(new Error('LocalStorage failed'));
      cryptoServiceSpy.setItem.mockResolvedValue({
        success: true,
        data: undefined
      });

      const taskData = {
        title: 'Fallback Task',
        priority: 'high' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject
      };

      const createdTask = await taskService.createTask(taskData);
      
      expect(createdTask).toBeTruthy();
      expect(cryptoServiceSpy.setItem).toHaveBeenCalled();
    });

    it('should handle complete storage failure gracefully', async () => {
      // Mock localStorage setItem to return a failed StorageResult
      localStorageServiceSpy.setItem.mockResolvedValue({
        success: false,
        error: new Error('Storage failed')
      });

      const taskData = {
        title: 'Failure Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject
      };

      // Task should still be created in memory
      const createdTask = taskService.createTask(taskData);
      expect(createdTask).toBeTruthy();
      
      // Wait for the debounced auto-save to trigger and fail (default is 500ms)
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should track the failure
      const metrics = taskService.getAutoSaveMetrics();
      expect(metrics.failedSaves).toBeGreaterThan(0);
    });
  });

  describe('Security Integration', () => {
    it('should log security events for task operations', async () => {
      const taskData = {
        title: 'Security Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject
      };

      await taskService.createTask(taskData);

      expect(authServiceSpy.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Task created:'),
          userId: 'test-user',
          type: 'DATA_ACCESS'
        })
      );
    });
  });

  describe('Metrics and Configuration', () => {
    it('should allow force sync operations', async () => {
      localStorageServiceSpy.getItem.mockResolvedValue({
        success: true,
        data: [mockTask],
        fallbackUsed: false
      });

      const result = await taskService.forceSync();
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockTask]);
    });
  });
});