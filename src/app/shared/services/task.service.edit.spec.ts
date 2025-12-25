import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { Task, TaskPriority, TaskProject } from '../models/task.model';
import { ValidationService } from './validation.service';
import { SecurityService } from './security.service';
import { AuthService } from './auth.service';
import { CryptoService } from './crypto.service';

describe('TaskService - Edit Functionality (US-003)', () => {
  let taskService: TaskService;
  let validationService: any;
  let securityService: any;
  let authService: any;
  let cryptoService: any;
  let mockTasks: Task[];

  beforeEach(() => {
    const validationServiceSpy = {
      validateTaskTitle: vi.fn().mockReturnValue({ 
        isValid: true, 
        sanitized: 'Default Title',
        error: undefined 
      }),
      validateTaskDescription: vi.fn().mockReturnValue({ 
        isValid: true, 
        sanitized: 'Default Description',
        error: undefined 
      }),
      sanitizeForDisplay: vi.fn().mockImplementation((input: string) => input),
      validateCSP: vi.fn().mockReturnValue({ isValid: true, violations: [] })
    };

    const securityServiceSpy = {
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
      validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] })
    };

    const authServiceSpy = {
      logSecurityEvent: vi.fn(),
      isAuthenticated: vi.fn().mockReturnValue(true),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user' }),
      requireAuthentication: vi.fn().mockImplementation(function() {
        if (!authService.isAuthenticated()) {
          throw new Error('Authentication required to perform this operation');
        }
      }),
      createAnonymousUser: vi.fn()
    };

    const cryptoServiceSpy = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      getStorageKey: vi.fn().mockReturnValue('taskgo_tasks'),
      encryptData: vi.fn(),
      decryptData: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: ValidationService, useValue: validationServiceSpy },
        { provide: SecurityService, useValue: securityServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CryptoService, useValue: cryptoServiceSpy }
      ]
    });

    taskService = TestBed.inject(TaskService);
    validationService = TestBed.inject(ValidationService) as any;
    securityService = TestBed.inject(SecurityService) as any;
    authService = TestBed.inject(AuthService) as any;
    cryptoService = TestBed.inject(CryptoService) as any;

    mockTasks = [
      {
        id: 'task-1',
        title: 'Original Task',
        description: 'Original Description',
        priority: 'medium' as TaskPriority,
        status: 'TODO',
        project: 'Work' as TaskProject,
        createdAt: new Date('2024-01-15T10:00:00'),
        updatedAt: new Date('2024-01-15T10:00:00')
      },
      {
        id: 'task-2',
        title: 'Another Task',
        priority: 'low' as TaskPriority,
        status: 'DONE',
        project: 'Personal' as TaskProject,
        createdAt: new Date('2024-01-14T10:00:00'),
        updatedAt: new Date('2024-01-14T10:00:00')
      }
    ];

    // Initialize service with mock data
    cryptoService.getItem.mockReturnValue(mockTasks);
    taskService.initializeMockData();
  });

  describe('updateTask - Core Functionality', () => {
    it('should update task with valid data', () => {
      const updateData = {
        title: 'Updated Task Title',
        description: 'Updated Description',
        priority: 'high' as TaskPriority,
        project: 'Study' as TaskProject
      };

      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Updated Task Title' });
      validationService.validateTaskDescription.mockReturnValue({ isValid: true, sanitized: 'Updated Description' });

      const result = taskService.updateTask('task-1', updateData);

      expect(result).toBeTruthy();
      expect(result?.title).toBe('Updated Task Title');
      expect(result?.description).toBe('Updated Description');
      expect(result?.priority).toBe('high');
      expect(result?.project).toBe('Study');
      expect(result?.updatedAt).not.toEqual(mockTasks[0].updatedAt);
    });

    it('should return null for non-existent task', () => {
      const updateData = { title: 'Updated Title' };

      const result = taskService.updateTask('non-existent-id', updateData);

      expect(result).toBeNull();
    });

    it('should preserve unchanged fields', () => {
      const updateData = { title: 'Updated Title' }; // Only updating title

      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Updated Title' });

      const result = taskService.updateTask('task-1', updateData);

      expect(result?.description).toBe(mockTasks[0].description);
      expect(result?.priority).toBe(mockTasks[0].priority);
      expect(result?.status).toBe(mockTasks[0].status);
      expect(result?.project).toBe(mockTasks[0].project);
      expect(result?.createdAt).toEqual(mockTasks[0].createdAt);
    });

    it('should update the updatedAt timestamp', () => {
      const originalTime = new Date('2024-01-15T10:00:00');
      const updatedTime = new Date('2024-01-20T15:30:00');
      
      vi.setSystemTime(updatedTime);

      const updateData = { title: 'Updated Title' };
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Updated Title' });

      const result = taskService.updateTask('task-1', updateData);

      expect(result?.updatedAt).toEqual(updatedTime);
      expect(result?.updatedAt).not.toEqual(originalTime);

      vi.useRealTimers();
    });
  });

  describe('updateTask - Validation', () => {
    it('should validate title through ValidationService', () => {
      const updateData = { title: 'Updated Title' };
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Updated Title' });

      taskService.updateTask('task-1', updateData);

      expect(validationService.validateTaskTitle).toHaveBeenCalledWith('Updated Title');
    });

    it('should reject invalid title', () => {
      const updateData = { title: 'ab' }; // Too short
      validationService.validateTaskTitle.mockReturnValue({ 
        isValid: false, 
        error: 'Title must be at least 3 characters' 
      });

      expect(() => {
        taskService.updateTask('task-1', updateData);
      }).toThrow('Title must be at least 3 characters');

      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'VALIDATION_FAILURE',
        message: 'Task title validation failed: Title must be at least 3 characters',
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });

    it('should validate description through ValidationService', () => {
      const updateData = { description: 'Updated Description' };
      validationService.validateTaskDescription.mockReturnValue({ isValid: true, sanitized: 'Updated Description' });

      taskService.updateTask('task-1', updateData);

      expect(validationService.validateTaskDescription).toHaveBeenCalledWith('Updated Description');
    });

    it('should reject invalid description', () => {
      const updateData = { description: '<script>alert("xss")</script>' };
      validationService.validateTaskDescription.mockReturnValue({ 
        isValid: false, 
        error: 'HTML content not allowed' 
      });

      expect(() => {
        taskService.updateTask('task-1', updateData);
      }).toThrow('HTML content not allowed');
    });

    it('should allow empty description', () => {
      const updateData = { description: '' };
      validationService.validateTaskDescription.mockReturnValue({ isValid: true });

      const result = taskService.updateTask('task-1', updateData);

      expect(result?.description).toBe('');
    });

    it('should allow undefined description', () => {
      const updateData = { description: undefined };

      const result = taskService.updateTask('task-1', updateData);

      expect(result?.description).toBeUndefined();
    });
  });

  describe('updateTask - Security', () => {
    it('should check rate limiting', () => {
      securityService.checkRateLimit.mockReturnValue({ allowed: false, retryAfter: 60 });

      expect(() => {
        taskService.updateTask('task-1', { title: 'Updated Title' });
      }).toThrow('Rate limit exceeded. Please try again later.');
    });

    it('should require authentication', () => {
      authService.isAuthenticated.mockReturnValue(false);

      expect(() => {
        taskService.updateTask('task-1', { title: 'Updated Title' });
      }).toThrow();

      expect(authService.requireAuthentication).toHaveBeenCalled();
    });

    it('should validate request for security threats', () => {
      const updateData = { title: '<script>alert("xss")</script>' };
      securityService.validateRequest.mockReturnValue({ 
        valid: false, 
        threats: ['XSS detected'] 
      });

      expect(() => {
        taskService.updateTask('task-1', updateData);
      }).toThrow('Invalid input: potentially dangerous content detected');

      expect(securityService.validateRequest).toHaveBeenCalledWith(updateData);
    });

    it('should log security events for validation failures', () => {
      const updateData = { title: 'Invalid<script>Title' };
      validationService.validateTaskTitle.mockReturnValue({ 
        isValid: false, 
        error: 'Invalid title' 
      });

      try {
        taskService.updateTask('task-1', updateData);
      } catch (error) {
        // Expected
      }

      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'VALIDATION_FAILURE',
        message: 'Task title validation failed: Invalid title',
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });

    it('should log security events for attack attempts', () => {
      const updateData = { title: 'Malicious Content' };
      securityService.validateRequest.mockReturnValue({ 
        valid: false, 
        threats: ['SQL injection', 'XSS'] 
      });

      try {
        taskService.updateTask('task-1', updateData);
      } catch (error) {
        // Expected
      }

      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'XSS_ATTEMPT',
        message: 'Update attack attempt detected: SQL injection, XSS',
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });
  });

  describe('updateTask - Data Persistence', () => {
    it('should save updated tasks to storage', () => {
      const updateData = { title: 'Updated Title' };
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Updated Title' });

      taskService.updateTask('task-1', updateData);

      expect(cryptoService.setItem).toHaveBeenCalledWith('taskgo_tasks', expect.any(Array));
    });

    it('should maintain data integrity in storage', () => {
      const updateData = { title: 'Updated Title' };
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Updated Title' });

      taskService.updateTask('task-1', updateData);

      const savedData = (cryptoService.setItem as any).mock.calls[0][1];
      const updatedTask = savedData.find((task: Task) => task.id === 'task-1');
      
      expect(updatedTask.title).toBe('Updated Title');
      expect(updatedTask.id).toBe('task-1');
      expect(updatedTask.createdAt).toEqual(mockTasks[0].createdAt);
      expect(updatedTask.updatedAt).not.toEqual(mockTasks[0].updatedAt);
    });

    it('should not affect other tasks in storage', () => {
      const updateData = { title: 'Updated Title' };
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Updated Title' });

      taskService.updateTask('task-1', updateData);

      const savedData = (cryptoService.setItem as any).mock.calls[0][1];
      const otherTask = savedData.find((task: Task) => task.id === 'task-2');
      
      expect(otherTask).toEqual(mockTasks[1]); // Should be unchanged
    });
  });

  describe('updateTask - Edge Cases', () => {
    it('should handle update with no changes', () => {
      const updateData = { title: mockTasks[0].title }; // Same as current
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: mockTasks[0].title });

      const result = taskService.updateTask('task-1', updateData);

      expect(result).toBeTruthy();
      expect(result?.title).toBe(mockTasks[0].title);
      expect(result?.updatedAt).not.toEqual(mockTasks[0].updatedAt); // Should still update timestamp
    });

    it('should handle empty update object', () => {
      const result = taskService.updateTask('task-1', {});

      expect(result).toBeTruthy();
      expect(result?.title).toBe(mockTasks[0].title);
      expect(result?.updatedAt).not.toEqual(mockTasks[0].updatedAt);
    });

    it('should handle concurrent updates safely', () => {
      const updateData1 = { title: 'First Update' };
      const updateData2 = { title: 'Second Update' };
      
      validationService.validateTaskTitle
        .mockReturnValueOnce({ isValid: true, sanitized: 'First Update' })
        .mockReturnValueOnce({ isValid: true, sanitized: 'Second Update' });

      const result1 = taskService.updateTask('task-1', updateData1);
      const result2 = taskService.updateTask('task-1', updateData2);

      expect(result1?.title).toBe('First Update');
      expect(result2?.title).toBe('Second Update');
    });

    it('should handle malformed dates in existing task', () => {
      // Create a task with invalid date
      const malformedTask = {
        ...mockTasks[0],
        updatedAt: new Date('invalid-date')
      };

      cryptoService.getItem.mockReturnValue([malformedTask]);

      const updateData = { title: 'Updated Title' };
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Updated Title' });

      expect(() => {
        taskService.updateTask('task-1', updateData);
      }).not.toThrow();
    });
  });

  describe('updateTask - Performance', () => {
    it('should handle large number of tasks efficiently', () => {
      const largeTaskList = Array.from({ length: 1000 }, (_, index) => ({
        id: `task-${index}`,
        title: `Task ${index}`,
        description: `Description ${index}`,
        priority: 'medium' as TaskPriority,
        status: 'TODO' as Task['status'],
        project: 'Work' as TaskProject,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      cryptoService.getItem.mockReturnValue(largeTaskList);
      taskService.initializeMockData(); // Reinitialize with large dataset

      const startTime = performance.now();
      
      const updateData = { title: 'Updated Title' };
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Updated Title' });

      const result = taskService.updateTask('task-500', updateData);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result).toBeTruthy();
      expect(executionTime).toBeLessThan(100); // Should complete in under 100ms
    });
  });

  describe('updateTask - Logging and Monitoring', () => {
    it('should log successful update events', () => {
      const updateData = { title: 'Updated Title' };
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Updated Title' });

      taskService.updateTask('task-1', updateData);

      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_ACCESS',
        message: 'Task updated: task-1',
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });

    it('should include relevant context in security logs', () => {
      const updateData = { title: '<script>alert("xss")</script>' };
      securityService.validateRequest.mockReturnValue({ 
        valid: false, 
        threats: ['XSS detected'] 
      });

      try {
        taskService.updateTask('task-1', updateData);
      } catch (error) {
        // Expected
      }

      const logCall = authService.logSecurityEvent.mock.calls[0][0];
      expect(logCall.type).toBe('XSS_ATTEMPT');
      expect(logCall.message).toContain('Update attack attempt detected');
      expect(logCall.timestamp).toBeInstanceOf(Date);
      expect(logCall.userId).toBe('test-user');
    });
  });
});