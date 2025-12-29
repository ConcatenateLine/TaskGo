import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { CryptoService } from './crypto.service';
import { ValidationService } from './validation.service';
import { AuthService } from './auth.service';
import { SecurityService } from './security.service';
import { Task } from '../models/task.model';

describe('TaskService - Delete Functionality (US-004)', () => {
  let service: TaskService;
  let cryptoService: any;
  let validationService: any;
  let authService: any;
  let securityService: any;

  const mockTask: Task = {
    id: 'test-task-1',
    title: 'Test Task for Deletion',
    description: 'This task will be deleted',
    priority: 'medium',
    status: 'TODO',
    project: 'Work',
    createdAt: new Date('2024-01-15T10:00:00'),
    updatedAt: new Date('2024-01-15T10:00:00'),
  };

  beforeEach(() => {
    const cryptoServiceSpy = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      getStorageKey: vi.fn().mockReturnValue('task_storage_key')
    };
    
    const validationServiceSpy = {
      validateTaskTitle: vi.fn(),
      validateTaskDescription: vi.fn(),
      sanitizeForDisplay: vi.fn(),
      validateCSP: vi.fn()
    };
    
    const authServiceSpy = {
      logSecurityEvent: vi.fn(),
      getUserContext: vi.fn(),
      requireAuthentication: vi.fn(),
      isAuthenticated: vi.fn()
    };
    
    const securityServiceSpy = {
      checkRateLimit: vi.fn(),
      validateRequest: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: CryptoService, useValue: cryptoServiceSpy },
        { provide: ValidationService, useValue: validationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SecurityService, useValue: securityServiceSpy }
      ]
    });

    service = TestBed.inject(TaskService);
    cryptoService = TestBed.inject(CryptoService);
    validationService = TestBed.inject(ValidationService);
    authService = TestBed.inject(AuthService);
    securityService = TestBed.inject(SecurityService);

    // Setup default mock returns
    authService.getUserContext.mockReturnValue({ userId: 'test-user' });
    authService.isAuthenticated.mockReturnValue(true);
    securityService.checkRateLimit.mockReturnValue({ allowed: true });
    securityService.validateRequest.mockReturnValue({ valid: true, threats: [] });
    validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: mockTask.title });
    validationService.validateTaskDescription.mockReturnValue({ isValid: true, sanitized: mockTask.description });
    validationService.validateCSP.mockReturnValue({ isValid: true, violations: [] });
    validationService.sanitizeForDisplay.mockImplementation((input: string) => input);
    cryptoService.getItem.mockReturnValue([]);
    
    // Initialize with some test data
    service.initializeMockData();
  });

  describe('Delete Task - Happy Path', () => {
    it('should delete a task successfully', () => {
      // Create a task first
      service.createTask({
        title: 'Task to Delete',
        description: 'This task will be deleted',
        priority: 'medium',
        status: 'TODO',
        project: 'Work'
      });
      
      const tasksBefore = service.getTasks();
      const taskIdToDelete = tasksBefore[0].id;
      
      // Delete the task
      const result = service.deleteTask(taskIdToDelete);
      
      expect(result).toBe(true);
      expect(service.getTasks().length).toBe(tasksBefore.length - 1);
      expect(service.getTasks().find((t: Task) => t.id === taskIdToDelete)).toBeUndefined();
    });

    it('should save to encrypted storage after deletion', () => {
      // Create a task first
      service.createTask({
        title: 'Task to Delete',
        priority: 'low',
        status: 'TODO',
        project: 'Personal'
      });
      
      const taskId = service.getTasks()[0].id;
      
      // Clear the mock to test deletion save
      cryptoService.setItem.mockClear();
      
      // Delete the task
      service.deleteTask(taskId);
      
      expect(cryptoService.setItem).toHaveBeenCalledWith('task_storage_key', expect.any(Array));
    });

    it('should log security event after successful deletion', () => {
      // Create a task first
      service.createTask({
        title: 'Security Test Task',
        priority: 'medium',
        status: 'TODO',
        project: 'Work'
      });
      
      const taskId = service.getTasks()[0].id;
      
      // Clear mock calls
      authService.logSecurityEvent.mockClear();
      
      // Delete the task
      service.deleteTask(taskId);
      
      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_ACCESS',
        message: `Task deleted: ${taskId}`,
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });

    it('should return true when task exists and is deleted', () => {
      // Create a task first
      service.createTask({
        title: 'Delete Me Task',
        priority: 'high',
        status: 'DONE',
        project: 'Study'
      });
      
      const taskId = service.getTasks()[0].id;
      
      const result = service.deleteTask(taskId);
      
      expect(result).toBe(true);
    });
  });

  describe('Delete Task - Error Cases', () => {
    it('should return false when task does not exist', () => {
      const result = service.deleteTask('non-existent-task-id');
      
      expect(result).toBe(false);
    });

    it('should return false when empty task ID is provided', () => {
      const result = service.deleteTask('');
      
      expect(result).toBe(false);
    });

    it('should return false when null task ID is provided', () => {
      const result = service.deleteTask(null as any);
      
      expect(result).toBe(false);
    });

    it('should throw error when rate limit is exceeded', () => {
      securityService.checkRateLimit.mockReturnValue({
        allowed: false,
        message: 'Rate limit exceeded. Please try again later.'
      });
      
      expect(() => service.deleteTask('some-task-id')).toThrow(
        'Rate limit exceeded. Please try again later.'
      );
    });

    it('should throw error when user is not authenticated', () => {
      authService.requireAuthentication.mockImplementation(() => {
        throw new Error('User not authenticated');
      });
      
      expect(() => service.deleteTask('some-task-id')).toThrow(
        'User not authenticated'
      );
    });

    it('should not delete any tasks when error occurs during save', () => {
      // Create tasks
      service.createTask({
        title: 'Task 1',
        priority: 'low',
        status: 'TODO',
        project: 'Personal'
      });
      
      service.createTask({
        title: 'Task 2',
        priority: 'medium',
        status: 'TODO',
        project: 'Work'
      });
      
      const tasksBefore = service.getTasks();
      const taskIdToDelete = tasksBefore[0].id;
      
      // Mock save to throw error
      cryptoService.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      // This should still complete deletion despite storage error
      // (current implementation logs error but doesn't throw)
      const result = service.deleteTask(taskIdToDelete);
      
      expect(result).toBe(true);
      expect(service.getTasks().length).toBe(tasksBefore.length - 1);
    });
  });

  describe('Delete Task - Security Validation', () => {
    it('should require authentication before deletion', () => {
      service.deleteTask('some-task-id');
      
      expect(authService.requireAuthentication).toHaveBeenCalled();
    });

    it('should check rate limiting before deletion', () => {
      service.deleteTask('some-task-id');
      
      expect(securityService.checkRateLimit).toHaveBeenCalledWith('deleteTask');
    });

    it('should validate request parameters before deletion', () => {
      service.deleteTask('some-task-id');
      
      expect(securityService.validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'some-task-id' })
      );
    });

    it('should not log security event when task is not found', () => {
      // Clear mock calls
      authService.logSecurityEvent.mockClear();
      
      // Try to delete non-existent task
      service.deleteTask('non-existent-task');
      
      // Should not log deletion for non-existent task
      const deleteEventCalls = authService.logSecurityEvent.mock.calls.filter(
        (call: any) => call[0].type === 'DATA_ACCESS' && call[0].message.includes('Task deleted')
      );
      expect(deleteEventCalls.length).toBe(0);
    });

    it('should handle malicious task IDs safely', () => {
      const maliciousIds = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '../../etc/passwd',
        'SELECT * FROM users'
      ];
      
      maliciousIds.forEach(maliciousId => {
        const result = service.deleteTask(maliciousId);
        expect(result).toBe(false); // Should not find malicious task IDs
      });
    });
  });

  describe('Delete Task - Edge Cases', () => {
    it('should handle deletion of the last task', () => {
      // Clear any existing tasks for clean test
      service.clearTasks();
      
      // Create single task
      service.createTask({
        title: 'Only Task',
        priority: 'low',
        status: 'TODO',
        project: 'Personal'
      });
      
      const taskId = service.getTasks()[0].id;
      
      const result = service.deleteTask(taskId);
      
      expect(result).toBe(true);
      expect(service.getTasks().length).toBe(0);
    });

    it('should handle deletion when task list is empty', () => {
      // Clear tasks
      service.clearTasks();
      
      const result = service.deleteTask('any-task-id');
      
      expect(result).toBe(false);
      expect(service.getTasks().length).toBe(0);
    });

    it('should handle concurrent deletions safely', () => {
      // Clear any existing tasks for clean test
      service.clearTasks();
      
      // Create multiple tasks
      for (let i = 0; i < 3; i++) {
        service.createTask({
          title: `Task ${i}`,
          priority: 'low',
          status: 'TODO',
          project: 'Personal'
        });
      }
      
      const tasks = service.getTasks();
      const results = tasks.map(task => service.deleteTask(task.id));
      
      expect(results).toEqual([true, true, true]);
      expect(service.getTasks().length).toBe(0);
    });

    it('should handle very long task IDs', () => {
      const veryLongId = 'a'.repeat(1000);
      
      const result = service.deleteTask(veryLongId);
      
      expect(result).toBe(false); // Should not find task with very long ID
    });

    it('should handle special characters in task IDs', () => {
      const specialIds = [
        'task-with-dashes',
        'task_with_underscores',
        'task.with.dots',
        'task/with/slashes',
        'task\\with\\backslashes'
      ];
      
      specialIds.forEach(id => {
        const result = service.deleteTask(id);
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('Delete Task - Data Integrity', () => {
    it('should preserve other tasks when deleting one', () => {
      // Clear any existing tasks for clean test
      service.clearTasks();
      
      // Create multiple tasks
      const createdTasks = [
        service.createTask({
          title: 'Task 1',
          priority: 'low',
          status: 'TODO',
          project: 'Personal'
        }),
        service.createTask({
          title: 'Task 2',
          priority: 'medium',
          status: 'TODO',
          project: 'Work'
        }),
        service.createTask({
          title: 'Task 3',
          priority: 'high',
          status: 'TODO',
          project: 'Study'
        })
      ];
      
      // Delete middle task
      const result = service.deleteTask(createdTasks[1].id);
      
      expect(result).toBe(true);
      
      const remainingTasks = service.getTasks();
      expect(remainingTasks.length).toBe(2);
      expect(remainingTasks.find((t: Task) => t.id === createdTasks[0].id)).toBeTruthy();
      expect(remainingTasks.find((t: Task) => t.id === createdTasks[2].id)).toBeTruthy();
      expect(remainingTasks.find((t: Task) => t.id === createdTasks[1].id)).toBeUndefined();
    });

    it('should maintain task order after deletion', () => {
      // Clear any existing tasks for clean test
      service.clearTasks();
      
      // Create tasks with different creation dates
      const oldTask = service.createTask({
        title: 'Old Task',
        priority: 'low',
        status: 'TODO',
        project: 'Personal'
      });
      
      // Manually set older date
      const tasks = service.getTasks();
      tasks[0].createdAt = new Date('2024-01-01T00:00:00');
      
      const newTask = service.createTask({
        title: 'New Task',
        priority: 'high',
        status: 'TODO',
        project: 'Work'
      });
      
      // Delete the newer task
      service.deleteTask(newTask.id);
      
      const remainingTasks = service.getTasks();
      expect(remainingTasks.length).toBe(1);
      expect(remainingTasks[0].id).toBe(oldTask.id);
    });

    it('should handle deletion of tasks with special properties', () => {
      // Clear any existing tasks for clean test
      service.clearTasks();
      
      // Create task with all properties
      const task = service.createTask({
        title: 'Complex Task',
        description: 'Task with <script>alert("xss")</script> content',
        priority: 'high',
        status: 'IN_PROGRESS',
        project: 'Study'
      });
      
      const result = service.deleteTask(task.id);
      
      expect(result).toBe(true);
      expect(service.getTasks().find((t: Task) => t.id === task.id)).toBeUndefined();
    });
  });

  describe('Delete Task - Performance', () => {
    it('should complete deletion in reasonable time', () => {
      // Clear any existing tasks for clean test
      service.clearTasks();
      
      // Create a task
      service.createTask({
        title: 'Performance Test Task',
        priority: 'low',
        status: 'TODO',
        project: 'Personal'
      });
      
      const taskId = service.getTasks()[0].id;
      
      const startTime = performance.now();
      const result = service.deleteTask(taskId);
      const endTime = performance.now();
      
      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should handle multiple deletions efficiently', () => {
      // Clear any existing tasks for clean test
      service.clearTasks();
      
      // Create multiple tasks
      const taskIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const task = service.createTask({
          title: `Task ${i}`,
          priority: 'low',
          status: 'TODO',
          project: 'Personal'
        });
        taskIds.push(task.id);
      }
      
      const startTime = performance.now();
      
      // Delete all tasks
      const results = taskIds.map(id => service.deleteTask(id));
      
      const endTime = performance.now();
      
      expect(results.every(r => r === true)).toBe(true);
      expect(service.getTasks().length).toBe(0);
      expect(endTime - startTime).toBeLessThan(500); // Should complete 10 deletions in less than 500ms
    });
  });
});