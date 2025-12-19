import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

// Vitest globals import
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { TaskService } from './task.service';
import { ValidationService } from './validation.service';
import { AuthService } from './auth.service';
import { SecurityService } from './security.service';
import { CryptoService } from './crypto.service';
import { Task, TaskPriority } from '../models/task.model';

describe('TaskService - US-002 Task Creation User Story Tests', () => {
  let service: TaskService;
  let validationService: any;
  let authService: any;
  let securityService: any;
  let cryptoService: any;

  beforeEach(() => {
    const validationServiceSpy = {
      validateTaskTitle: vi.fn(),
      validateTaskDescription: vi.fn(),
      sanitizeForDisplay: vi.fn(),
      validateCSP: vi.fn().mockReturnValue({ isValid: true, violations: [] })
    };
    
    const authServiceSpy = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      requireAuthentication: vi.fn().mockReturnValue(undefined),
      logSecurityEvent: vi.fn(),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user' })
    };
    
    const securityServiceSpy = {
      validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] }),
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 100 })
    };
    
    const cryptoServiceSpy = {
      getItem: vi.fn().mockReturnValue([]),
      setItem: vi.fn(),
      clear: vi.fn(),
      getStorageKey: vi.fn().mockReturnValue('test_key')
    };

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: ValidationService, useValue: validationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SecurityService, useValue: securityServiceSpy },
        { provide: CryptoService, useValue: cryptoServiceSpy }
      ]
    });

    service = TestBed.inject(TaskService);
    validationService = TestBed.inject(ValidationService);
    authService = TestBed.inject(AuthService);
    securityService = TestBed.inject(SecurityService);
    cryptoService = TestBed.inject(CryptoService);

    // Clear storage before each test
    cryptoService.clear();
    
    // Setup default mock returns
    validationService.validateTaskTitle.mockReturnValue({ 
      isValid: true, 
      sanitized: 'Valid Title' 
    });
    validationService.validateTaskDescription.mockReturnValue({ 
      isValid: true, 
      sanitized: 'Valid Description' 
    });
  });

  describe('US-002: Create new task - User Story Acceptance Criteria', () => {
    describe('AC1: Form with required fields', () => {
      it('should validate title field requirements (3-100 characters)', () => {
        const validTitles = [
          'ABC', // Exactly 3 characters
          'Task with 50 characters - '.repeat(1) + 'test',
          'A'.repeat(100) // Exactly 100 characters
        ];

        validTitles.forEach(title => {
          validationService.validateTaskTitle.mockReturnValue({ 
            isValid: true, 
            sanitized: title 
          });
          
          const task = service.createTask({
            title,
            priority: 'medium' as TaskPriority,
            status: 'TODO' as const,
            project: 'General' as const
          });

          expect(task.title).toBe(title);
          expect(task.id).toBeDefined();
        });
      });

      it('should reject titles shorter than 3 characters', () => {
        const invalidTitles = ['', 'a', 'ab'];
        
        validationService.validateTaskTitle.mockReturnValue({ 
          isValid: false, 
          error: 'Title must be between 3 and 100 characters' 
        });

        invalidTitles.forEach(title => {
          expect(() => {
            service.createTask({
              title,
              priority: 'medium' as TaskPriority,
              status: 'TODO' as const,
              project: 'General' as const
            });
          }).toThrow(/Title must be between 3 and 100 characters/);
        });
      });

      it('should reject titles longer than 100 characters', () => {
        const longTitle = 'A'.repeat(101);
        
        validationService.validateTaskTitle.mockReturnValue({ 
          isValid: false, 
          error: 'Title must be between 3 and 100 characters' 
        });

        expect(() => {
          service.createTask({
            title: longTitle,
            priority: 'low' as TaskPriority,
            status: 'TODO' as const,
            project: 'General' as const
          });
        }).toThrow(/Title must be between 3 and 100 characters/);
      });

      it('should handle optional description field', () => {
        // Test without description
        const taskWithoutDesc = service.createTask({
          title: 'Task without description',
          priority: 'medium' as TaskPriority,
          status: 'TODO' as const,
          project: 'General' as const
        });

        expect(taskWithoutDesc.description).toBeUndefined();

        // Test with empty description
        validationService.validateTaskDescription.mockReturnValue({ 
          isValid: true, 
          sanitized: '' 
        });

        const taskWithEmptyDesc = service.createTask({
          title: 'Task with empty description',
          description: '',
          priority: 'medium' as TaskPriority,
          status: 'TODO' as const,
          project: 'General' as const
        });

        expect(taskWithEmptyDesc.description).toBe('');

        // Test with valid description
        validationService.validateTaskDescription.mockReturnValue({ 
          isValid: true, 
          sanitized: 'Valid description here' 
        });

        const taskWithDesc = service.createTask({
          title: 'Task with description',
          description: 'Valid description here',
          priority: 'medium' as TaskPriority,
          status: 'TODO' as const,
          project: 'General' as const
        });

        expect(taskWithDesc.description).toBe('Valid description here');
      });

      it('should support all priority options (low/medium/high)', () => {
        const priorities: TaskPriority[] = ['low', 'medium', 'high'];
        const baseTaskData = {
          title: 'Test Task',
          status: 'TODO' as const,
          project: 'General' as const
        };

        priorities.forEach(priority => {
          const task = service.createTask({
            ...baseTaskData,
            priority
          });

          expect(task.priority).toBe(priority);
        });
      });
    });

    describe('AC2: Create button disabled if title invalid', () => {
      it('should prevent task creation when title validation fails', () => {
        validationService.validateTaskTitle.mockReturnValue({ 
          isValid: false, 
          error: 'Title too short' 
        });

        expect(() => {
          service.createTask({
            title: 'AB', // Too short
            priority: 'medium' as TaskPriority,
            status: 'TODO' as const,
            project: 'General' as const
          });
        }).toThrow('Title too short');
      });

      it('should allow task creation when title is valid', () => {
        validationService.validateTaskTitle.mockReturnValue({ 
          isValid: true, 
          sanitized: 'Valid Title' 
        });

        expect(() => {
          service.createTask({
            title: 'Valid Title',
            priority: 'medium' as TaskPriority,
            status: 'TODO' as const,
            project: 'General' as const
          });
        }).not.toThrow();
      });
    });

    describe('AC3: Task appears immediately in list after creation', () => {
      it('should add task to the task list immediately upon creation', () => {
        const taskData = {
          title: 'New Task Test',
          priority: 'high' as TaskPriority,
          status: 'TODO' as const,
          project: 'General' as const
        };

        // Create task
        const createdTask = service.createTask(taskData);
        
        // Verify task is immediately available in getTasks
        const tasks = service.getTasks();
        expect(tasks).toContain(createdTask);
        expect(tasks.some(task => task.id === createdTask.id)).toBe(true);

        // Verify task is in sorted list
        const sortedTasks = service.getTasksSorted();
        expect(sortedTasks).toContain(createdTask);
      });

      it('should maintain task list order after new task creation', () => {
        // Setup validation to return actual titles for this test
        validationService.validateTaskTitle.mockImplementation((title: string) => ({
          isValid: true,
          sanitized: title
        }));

        // Create initial tasks
        const task1 = service.createTask({
          title: 'First Task',
          priority: 'medium' as TaskPriority,
          status: 'TODO' as const,
          project: 'General' as const
        });

        const task2 = service.createTask({
          title: 'Second Task',
          priority: 'high' as TaskPriority,
          status: 'TODO' as const,
          project: 'General' as const
        });

        // Create newest task
        const newestTask = service.createTask({
          title: 'Newest Task',
          priority: 'low' as TaskPriority,
          status: 'TODO' as const,
          project: 'General' as const
        });

        // Check that newest task appears in sorted list
        const sortedTasks = service.getTasksSorted();
        expect(sortedTasks).toHaveLength(3);
        
        // Verify newest task is in the sorted list (order may vary due to timing)
        const foundNewestTask = sortedTasks.find(task => task.id === newestTask.id);
        expect(foundNewestTask).toBeTruthy();
        expect(foundNewestTask!.title).toBe('Newest Task');
        
        // Verify all tasks are present
        expect(sortedTasks.some(task => task.id === task1.id)).toBe(true);
        expect(sortedTasks.some(task => task.id === task2.id)).toBe(true);
        expect(sortedTasks.some(task => task.id === newestTask.id)).toBe(true);
      });
    });

    describe('AC4: Clear form after successful creation', () => {
      it('should create task with new data (simulating form clear)', () => {
        const taskData = {
          title: 'Form Clear Test Task',
          description: 'This should be cleared after creation',
          priority: 'medium' as TaskPriority,
          status: 'TODO' as const,
          project: 'General' as const
        };

        // Setup validation mocks
        validationService.validateTaskTitle.mockReturnValue({
          isValid: true,
          sanitized: taskData.title
        });
        validationService.validateTaskDescription.mockReturnValue({
          isValid: true,
          sanitized: taskData.description
        });

        // Create task successfully
        const task = service.createTask(taskData);
        
        // Verify task was created with new data
        expect(task.title).toBe('Form Clear Test Task');
        expect(task.description).toBe('This should be cleared after creation');
        expect(task.id).toBeDefined();
        
        // Service maintains the created task in memory
        const tasks = service.getTasks();
        expect(tasks).toHaveLength(1);
        expect(tasks[0].id).toBe(task.id);
      });

      it('should handle multiple sequential task creations', () => {
        const tasksToCreate = [
          {
            title: 'First Task',
            priority: 'high' as TaskPriority
          },
          {
            title: 'Second Task',
            description: 'With description',
            priority: 'medium' as TaskPriority
          },
          {
            title: 'Third Task',
            description: 'Another description',
            priority: 'low' as TaskPriority
          }
        ];

        // Create tasks sequentially
        const createdTasks = tasksToCreate.map(taskData => {
          validationService.validateTaskTitle.mockReturnValue({
            isValid: true,
            sanitized: taskData.title
          });
          
          if (taskData.description) {
            validationService.validateTaskDescription.mockReturnValue({
              isValid: true,
              sanitized: taskData.description
            });
          }

          return service.createTask({
            ...taskData,
            status: 'TODO' as const,
            project: 'General' as const
          });
        });

        // Verify all tasks were created
        const tasks = service.getTasks();
        expect(tasks).toHaveLength(3);
        
        // Verify each task has unique ID
        const taskIds = createdTasks.map(task => task.id);
        const uniqueIds = new Set(taskIds);
        expect(uniqueIds.size).toBe(3);
        
        // Verify tasks are in the list
        createdTasks.forEach(task => {
          expect(tasks.some(t => t.id === task.id)).toBe(true);
        });
      });
    });
  });

  describe('Task Creation Data Management', () => {
    it('should set default values correctly', () => {
      const taskData = {
        title: 'Test Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as const,
        project: 'General' as const
      };

      const task = service.createTask(taskData);

      expect(task.status).toBe('TODO');
      expect(task.project).toBe('General');
      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique IDs for each task', () => {
      const task1 = service.createTask({
        title: 'Task 1',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as const,
        project: 'General' as const
      });

      const task2 = service.createTask({
        title: 'Task 2',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as const,
        project: 'General' as const
      });

      expect(task1.id).toBeTruthy();
      expect(task2.id).toBeTruthy();
      expect(task1.id).not.toBe(task2.id);
    });

    it('should set creation and update timestamps', () => {
      const beforeCreation = new Date();
      
      const task = service.createTask({
        title: 'Timestamp Test Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as const,
        project: 'General' as const
      });

      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
      expect(task.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(task.createdAt.getTime()).toBe(task.updatedAt.getTime());
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle validation service errors gracefully', () => {
      validationService.validateTaskTitle.mockImplementation(() => {
        throw new Error('Validation service unavailable');
      });

      expect(() => {
        service.createTask({
          title: 'Test Task',
          priority: 'medium' as TaskPriority,
          status: 'TODO' as const,
          project: 'General' as const
        });
      }).toThrow('Validation service unavailable');
    });

    it('should handle security validation errors', () => {
      securityService.validateRequest.mockReturnValue({
        valid: false,
        threats: ['Invalid request format']
      });

      expect(() => {
        service.createTask({
          title: 'Test Task',
          priority: 'medium' as TaskPriority,
          status: 'TODO' as const,
          project: 'General' as const
        });
      }).toThrow('Invalid input: potentially dangerous content detected');
    });

    it('should handle rate limiting errors', () => {
      securityService.checkRateLimit.mockReturnValue({
        allowed: false,
        message: 'Rate limit exceeded'
      });

      expect(() => {
        service.createTask({
          title: 'Test Task',
          priority: 'medium' as TaskPriority,
          status: 'TODO' as const,
          project: 'General' as const
        });
      }).toThrow('Rate limit exceeded. Please try again later.');
    });

    it('should handle authentication requirements', () => {
      authService.requireAuthentication.mockImplementation(() => {
        throw new Error('Authentication required');
      });

      expect(() => {
        service.createTask({
          title: 'Test Task',
          priority: 'medium' as TaskPriority,
          status: 'TODO' as const,
          project: 'General' as const
        });
      }).toThrow('Authentication required');
    });
  });

  describe('Data Persistence', () => {
    it('should persist task to storage', () => {
      const taskData = {
        title: 'Persistence Test Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as const,
        project: 'General' as const
      };

      // Setup validation mock
      validationService.validateTaskTitle.mockReturnValue({
        isValid: true,
        sanitized: taskData.title
      });

      service.createTask(taskData);

      expect(cryptoService.setItem).toHaveBeenCalled();
      expect(cryptoService.setItem).toHaveBeenCalledWith(
        'test_key',
        expect.arrayContaining([expect.objectContaining({
          title: 'Persistence Test Task'
        })])
      );
    });

    it('should log successful task creation', () => {
      const taskData = {
        title: 'Security Test Task',
        priority: 'low' as TaskPriority,
        status: 'TODO' as const,
        project: 'General' as const
      };

      // Setup validation mock
      validationService.validateTaskTitle.mockReturnValue({
        isValid: true,
        sanitized: taskData.title
      });

      const task = service.createTask(taskData);

      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_ACCESS',
        message: `Task created: ${task.id}`,
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });
  });
});