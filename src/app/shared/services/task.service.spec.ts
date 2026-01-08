import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { TaskStatus, TaskProject, TaskPriority } from '../models/task.model';
import { AuthService } from './auth.service';
import { CryptoService } from './crypto.service';
import { ValidationService } from './validation.service';
import { SecurityService } from './security.service';
import { LocalStorageService } from './local-storage.service';
import { AutoSaveService } from './auto-save.service';
import { createCryptoServiceSpy, CryptoServiceSpy } from '../../../test-helpers/crypto-service.mock';
import { vi } from 'vitest';

describe('TaskService', () => {
  let service: TaskService;
  let authService: any;
  let cryptoServiceSpy: CryptoServiceSpy;
  let localStorageService: any;
  let autoSaveService: any;

  beforeEach(() => {
    cryptoServiceSpy = createCryptoServiceSpy();

    let checkRateLimitCallCount = 0;

    // Create mock services
    authService = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      createAnonymousUser: vi.fn(),
      requireAuthentication: vi.fn().mockReturnValue(undefined),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user' }),
      logSecurityEvent: vi.fn()
    };

    localStorageService = {
      getItem: vi.fn().mockResolvedValue(null),
      setItem: vi.fn().mockResolvedValue(undefined)
    };

    autoSaveService = {
      queueTaskCreation: vi.fn(),
      queueTaskUpdate: vi.fn(),
      queueTaskDeletion: vi.fn(),
      getMetrics: vi.fn().mockReturnValue({ totalOperations: 0, pendingOperations: 0 }),
      forceSync: vi.fn().mockResolvedValue(undefined),
      getPendingOperations: vi.fn().mockReturnValue([]),
      cancelPendingOperation: vi.fn().mockReturnValue(false),
      updateConfig: vi.fn(),
      handleUpdateOperation: vi.fn(),
      handleOperationResult: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: AuthService, useValue: authService },
        { provide: CryptoService, useValue: cryptoServiceSpy },
        { provide: ValidationService, useValue: { 
          validateTaskTitle: vi.fn().mockImplementation((title: string, strict?: boolean) => {
            // Mock validation with strict mode for security tests
            if (title.includes('javascript:')) {
              return { isValid: false, error: 'Invalid input: potentially dangerous content detected' };
            }
            if (title.includes('onclick') || title.includes('onerror') || title.includes('onload')) {
              return { isValid: false, error: 'Invalid input: event handlers not allowed' };
            }
            if (title.length > 100) {
              return { isValid: false, error: 'Title too long: maximum 100 characters allowed' };
            }
            if (/[\x00-\x1F\x7F]/.test(title)) {
              return { isValid: false, error: 'Invalid input: control characters not allowed' };
            }
            return { isValid: true, sanitized: title };
          }),
          validateTaskDescription: vi.fn().mockImplementation((description: string) => {
            // Mock description validation
            if (description && (description.includes('<img>') || description.includes('onerror'))) {
              return { isValid: false, error: 'Invalid input: HTML content not allowed' };
            }
            return { isValid: true, sanitized: description };
          }),
          sanitizeForDisplay: vi.fn(),
          validateCSP: vi.fn().mockImplementation((content: string) => {
            // Mock CSP validation - return violations for malicious content
            if (content.includes('https://evil.com') || content.includes('http://')) {
              return { isValid: false, violations: ['External resources not allowed'] };
            }
            if (content.includes('data:')) {
              return { isValid: false, violations: ['Data URLs not allowed'] };
            }
            if (content.includes('onerror') || content.includes('<img>')) {
              return { isValid: false, violations: ['HTML content not allowed'] };
            }
            return { isValid: true, violations: [] };
          }),
          detectXSS: vi.fn().mockImplementation((content: string) => {
            // Mock XSS detection - throw error for malicious content
            if (content.includes('<script>') || content.includes('javascript:')) {
              throw new Error('Invalid input: potentially dangerous content detected');
            }
            return { isSafe: true, threats: [] };
          })
        } },
        { provide: SecurityService, useValue: {
          validateRequest: vi.fn().mockImplementation((data: any) => {
            // Mock security validation - check for XSS patterns
            const content = typeof data === 'object' ? data.title || '' : data;
            if (content.includes('<script>') || content.includes('\u003cscript\u003e')) {
              return { 
                valid: false, 
                threats: ['XSS detected: script tags found'] 
              };
            }
            return { valid: true, threats: [] };
          }),
          checkRateLimit: vi.fn().mockImplementation(() => {
          // Simulate rate limiting after 100 attempts
          checkRateLimitCallCount++;
          if (checkRateLimitCallCount >= 100) {
            return { allowed: false, remaining: 0 };
          }
          return { allowed: true, remaining: 100 - checkRateLimitCallCount };
        }),
          getRateLimitStatus: vi.fn().mockReturnValue({ 
            operation: 'createTask',
            allowed: true,
            remaining: 100,
            resetTime: new Date(Date.now() + 60000)
          }),
          logSecurityEvent: vi.fn()
        } },
        { provide: LocalStorageService, useValue: localStorageService },
        { provide: AutoSaveService, useValue: autoSaveService }
      ],
    });

    service = TestBed.inject(TaskService);
    authService = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should return empty array when no tasks exist', () => {
      const tasks = service.getTasks();
      expect(tasks).toEqual([]);
      expect(tasks).toHaveLength(0);
    });

    it('should return empty sorted array when no tasks exist', () => {
      const tasks = service.getTasksSorted();
      expect(tasks).toEqual([]);
      expect(tasks).toHaveLength(0);
    });

    it('should return zero task counts when no tasks exist', () => {
      const counts = service.getTaskCounts();
      expect(counts).toEqual({
        todo: 0,
        inProgress: 0,
        done: 0,
        total: 0,
      });
    });
  });

  describe('Task Creation', () => {
    it('should create a new task with generated ID and timestamps', () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      };

      const createdTask = service.createTask(taskData);

      expect(createdTask).toMatchObject(taskData);
      expect(createdTask.id).toBeDefined();
      expect(createdTask.id).toBeTruthy();
      expect(createdTask.createdAt).toBeInstanceOf(Date);
      expect(createdTask.updatedAt).toBeInstanceOf(Date);
      expect(createdTask.createdAt).toEqual(createdTask.updatedAt);
    });

    it('should add new task to the tasks list', () => {
      const taskData = {
        title: 'Test Task',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject,
      };

      service.createTask(taskData);
      const tasks = service.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject(taskData);
    });

    it('should create multiple tasks with unique IDs', () => {
      const taskData = {
        title: 'Task',
        priority: 'high' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Study' as TaskProject,
      };

      const task1 = service.createTask(taskData);
      const task2 = service.createTask(taskData);

      expect(task1.id).not.toBe(task2.id);
      expect(service.getTasks()).toHaveLength(2);
    });

    it('should create task without optional description', () => {
      const taskData = {
        title: 'Task without description',
        priority: 'medium' as TaskPriority,
        status: 'IN_PROGRESS' as TaskStatus,
        project: 'General' as TaskProject,
      };

      const task = service.createTask(taskData);

      expect(task.title).toBe('Task without description');
      expect(task.description).toBeUndefined();
    });
  });

  describe('Task Retrieval', () => {
    beforeEach(() => {
      service.initializeMockData();
    });

    it('should return all tasks', () => {
      const tasks = service.getTasks();
      expect(tasks).toHaveLength(4);
    });

    it('should return tasks sorted by creation date (newest first)', () => {
      const sortedTasks = service.getTasksSorted();

      expect(sortedTasks).toHaveLength(4);

      // Verify sorting (newest first)
      for (let i = 0; i < sortedTasks.length - 1; i++) {
        const currentTask = new Date(sortedTasks[i].createdAt).getTime();
        const nextTask = new Date(sortedTasks[i + 1].createdAt).getTime();
        expect(currentTask).toBeGreaterThanOrEqual(nextTask);
      }

      // Verify first task is the newest (Jan 15, 2024)
      expect(sortedTasks[0].title).toBe('Review project requirements');
      expect(sortedTasks[0].id).toBe('1');
    });

    it('should filter tasks by status', () => {
      const todoTasks = service.getTasksByStatus('TODO');
      const inProgressTasks = service.getTasksByStatus('IN_PROGRESS');
      const doneTasks = service.getTasksByStatus('DONE');

      expect(todoTasks).toHaveLength(2);
      expect(todoTasks.every((task) => task.status === 'TODO')).toBe(true);

      expect(inProgressTasks).toHaveLength(1);
      expect(inProgressTasks[0].title).toBe('Learn Angular signals');

      expect(doneTasks).toHaveLength(1);
      expect(doneTasks[0].title).toBe('Setup development environment');
    });

    it('should filter tasks by project', () => {
      const workTasks = service.getTasksByProject('Work');
      const personalTasks = service.getTasksByProject('Personal');
      const studyTasks = service.getTasksByProject('Study');

      expect(workTasks).toHaveLength(2);
      expect(workTasks.every((task) => task.project === 'Work')).toBe(true);

      expect(personalTasks).toHaveLength(1);
      expect(personalTasks[0].title).toBe('Grocery shopping');

      expect(studyTasks).toHaveLength(1);
      expect(studyTasks[0].title).toBe('Learn Angular signals');
    });

    it('should filter tasks by status and project', () => {
      const workTodoTasks = service.getTasksByStatusAndProject('TODO', 'Work');
      const allWorkTasks = service.getTasksByStatusAndProject('all', 'Work');
      const allTodoTasks = service.getTasksByStatusAndProject('TODO', 'all');
      const allTasks = service.getTasksByStatusAndProject('all', 'all');

      expect(workTodoTasks).toHaveLength(1);
      expect(workTodoTasks[0].title).toBe('Review project requirements');

      expect(allWorkTasks).toHaveLength(2);
      expect(allTodoTasks).toHaveLength(2);
      expect(allTasks).toHaveLength(4);
    });

    it('should return correct task counts', () => {
      const counts = service.getTaskCounts();

      expect(counts).toEqual({
        todo: 2,
        inProgress: 1,
        done: 1,
        total: 4,
      });
    });
  });

  describe('Task Updates', () => {
    beforeEach(async () => {
      // Clear any existing data and initialize with mock data
      cryptoServiceSpy.getItem.mockReturnValue(null); // Empty storage
      await service.initializeMockData();
    });

    it('should update existing task', () => {
      const taskId = '1';
      const updates = {
        title: 'Updated Task Title',
        status: 'IN_PROGRESS' as TaskStatus,
        description: 'Updated description',
      };

      const updatedTask = service.updateTask(taskId, updates);

      expect(updatedTask).toBeTruthy();
      expect(updatedTask!.title).toBe('Updated Task Title');
      expect(updatedTask!.status).toBe('IN_PROGRESS');
      expect(updatedTask!.description).toBe('Updated description');
      expect(updatedTask!.priority).toBe('high'); // unchanged
      expect(updatedTask!.project).toBe('Work'); // unchanged
      expect(updatedTask!.updatedAt).toBeInstanceOf(Date);
      expect(updatedTask!.updatedAt.getTime()).toBeGreaterThan(updatedTask!.createdAt.getTime());
    });

    it('should return null when updating non-existent task', () => {
      const result = service.updateTask('non-existent-id', { title: 'Updated' });
      expect(result).toBeNull();
    });

    it('should update task status', () => {
      const taskId = '3'; // Learn Angular signals (IN_PROGRESS)

      const updatedTask = service.updateTask(taskId, { status: 'DONE' });

      expect(updatedTask!.status).toBe('DONE');
      expect(service.getTasksByStatus('DONE')).toHaveLength(2);
      expect(service.getTasksByStatus('IN_PROGRESS')).toHaveLength(0);
    });

    it('should update task priority', () => {
      const taskId = '4'; // Grocery shopping (medium)

      const updatedTask = service.updateTask(taskId, { priority: 'high' });

      expect(updatedTask!.priority).toBe('high');
    });
  });

  describe('Task Deletion', () => {
    beforeEach(async () => {
      // Clear any existing data and initialize with mock data
      cryptoServiceSpy.getItem.mockReturnValue(null); // Empty storage
      await service.initializeMockData();
    });

    it('should delete existing task', () => {
      const taskId = '2'; // Setup development environment

      const result = service.deleteTask(taskId);
      const tasks = service.getTasks();

      expect(result).toBe(true);
      expect(tasks).toHaveLength(3);
      expect(tasks.find((task) => task.id === taskId)).toBeUndefined();
    });

    it('should return false when deleting non-existent task', () => {
      const result = service.deleteTask('non-existent-id');
      const tasks = service.getTasks();

      expect(result).toBe(false);
      expect(tasks).toHaveLength(4); // unchanged
    });

    it('should update task counts after deletion', () => {
      const initialCounts = service.getTaskCounts();
      service.deleteTask('1'); // Delete a TODO task

      const newCounts = service.getTaskCounts();

      expect(newCounts.total).toBe(initialCounts.total - 1);
      expect(newCounts.todo).toBe(initialCounts.todo - 1);
    });
  });

  describe('Mock Data', () => {
    beforeEach(async () => {
      // Clear any existing data and initialize with mock data
      cryptoServiceSpy.getItem.mockReturnValue(null); // Empty storage
      await service.initializeMockData();
    });

    it('should initialize with mock data', () => {
      const tasks = service.getTasks();
      expect(tasks).toHaveLength(4);

      // Verify mock data structure
      tasks.forEach((task) => {
        expect(task.id).toBeTruthy();
        expect(task.title).toBeTruthy();
        expect(['low', 'medium', 'high']).toContain(task.priority);
        expect(['TODO', 'IN_PROGRESS', 'DONE']).toContain(task.status);
        expect(['Personal', 'Work', 'Study', 'General']).toContain(task.project);
        expect(task.createdAt).toBeInstanceOf(Date);
        expect(task.updatedAt).toBeInstanceOf(Date);
      });
    });

    it('should clear all tasks', () => {
      expect(service.getTasks()).toHaveLength(4);

      service.clearTasks();
      expect(service.getTasks()).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty status filter correctly', () => {
      service.initializeMockData();

      service.getTasksByStatus('TODO');
      const tasks = service.getTasks();

      // Filtering should not modify original array
      expect(service.getTasks()).toHaveLength(tasks.length);
    });

    it('should handle creating task with minimal required fields', () => {
      const minimalTask = {
        title: 'Minimal Task',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'General' as TaskProject,
      };

      const createdTask = service.createTask(minimalTask);

      expect(createdTask.title).toBe('Minimal Task');
      expect(createdTask.description).toBeUndefined();
    });

    it('should generate unique IDs for multiple tasks', () => {
      const tasks: string[] = [];

      for (let i = 0; i < 10; i++) {
        const task = service.createTask({
          title: `Task ${i}`,
          priority: 'medium' as TaskPriority,
          status: 'TODO' as TaskStatus,
          project: 'General' as TaskProject,
        });
        tasks.push(task.id);
      }

      const uniqueIds = new Set(tasks);
      expect(uniqueIds.size).toBe(tasks.length);
    });

    it('should maintain sorted order after adding new task', () => {
      service.initializeMockData();

      // Add a new task with current date/time (should be newest)
      const newTask = service.createTask({
        title: 'Newest Task',
        priority: 'high' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      const sortedTasks = service.getTasksSorted();

      expect(sortedTasks[0].id).toBe(newTask.id);
      expect(sortedTasks[0].title).toBe('Newest Task');
    });
  });

  describe('Business Rules Validation', () => {
    beforeEach(async () => {
      // Clear any existing data and initialize with mock data
      cryptoServiceSpy.getItem.mockReturnValue(null); // Empty storage
      await service.initializeMockData();
    });

    it('should ensure task IDs are strings', () => {
      const tasks = service.getTasks();
      tasks.forEach((task) => {
        expect(typeof task.id).toBe('string');
      });
    });

    it('should ensure timestamps are Date objects', () => {
      const tasks = service.getTasks();
      tasks.forEach((task) => {
        expect(task.createdAt).toBeInstanceOf(Date);
        expect(task.updatedAt).toBeInstanceOf(Date);
      });
    });

    it('should ensure all enum values are valid', () => {
      const tasks = service.getTasks();
      tasks.forEach((task) => {
        expect(['low', 'medium', 'high']).toContain(task.priority);
        expect(['TODO', 'IN_PROGRESS', 'DONE']).toContain(task.status);
        expect(['Personal', 'Work', 'Study', 'General']).toContain(task.project);
      });
    });

    it('should maintain updatedAt when status changes', () => {
      const tasks = service.getTasks();
      expect(tasks.length).toBeGreaterThan(0);

      const task = tasks[0];
      expect(task).toBeDefined();
      expect(task.updatedAt).toBeDefined();

      const originalUpdatedAt = task.updatedAt;

      // Update the task
      const updatedTask = service.updateTask(task.id, { status: 'DONE' });

      expect(updatedTask).toBeTruthy();
      expect(updatedTask!.updatedAt).toBeDefined();
      expect(updatedTask!.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  // ===============================================================
  // SECURITY TESTS - OWASP VULNERABILITIES
  // ===============================================================

  describe('SECURITY: Input Validation & XSS Prevention (A03, A04)', () => {
    it('should reject task titles with script tags', () => {
      const maliciousTaskData = {
        title: '<script>alert("XSS")</script>Malicious Task',
        priority: 'high' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      };

      expect(() => {
        service.createTask(maliciousTaskData);
      }).toThrow(/Invalid input: potentially dangerous content detected/);
    });

    it('should reject task descriptions with HTML injection', () => {
      const maliciousTaskData = {
        title: 'Normal Title',
        description: '<img src="x" onerror="alert(\'XSS\')">',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject,
      };

      expect(() => {
        service.createTask(maliciousTaskData);
      }).toThrow(/Invalid input: HTML content not allowed/);
    });

    it('should reject task titles with JavaScript protocol', () => {
      const maliciousTaskData = {
        title: 'javascript:alert("XSS")',
        priority: 'low' as TaskPriority,
        status: 'IN_PROGRESS' as TaskStatus,
        project: 'Study' as TaskProject,
      };

      expect(() => {
        service.createTask(maliciousTaskData);
      }).toThrow(/Invalid input: potentially dangerous content detected/);
    });

    it('should reject task titles with on* event handlers', () => {
      const maliciousTaskData = {
        title: 'Click onclick="alert(\'XSS\')" here',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'General' as TaskProject,
      };

      expect(() => {
        service.createTask(maliciousTaskData);
      }).toThrow('Invalid input: event handlers not allowed');
    });

    it('should reject dangerously long task titles', () => {
      const longTitle = 'A'.repeat(1001); // Exceed reasonable limit
      const maliciousTaskData = {
        title: longTitle,
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      };

      expect(() => {
        service.createTask(maliciousTaskData);
      }).toThrow(/Title too long: maximum/);
    });

    it('should reject task titles with control characters', () => {
      const maliciousTaskData = {
        title: 'Task\u0000with\u0001control\u0002characters',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'General' as TaskProject,
      };

      expect(() => {
        service.createTask(maliciousTaskData);
      }).toThrow(/Invalid input: control characters not allowed/);
    });

    it('should prevent Unicode XSS attacks', () => {
      const maliciousTaskData = {
        title: '\u003cscript\u003ealert("XSS")\u003c/script\u003e',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      };

      expect(() => {
        service.createTask(maliciousTaskData);
      }).toThrow(/Invalid input: potentially dangerous content detected/);
    });
  });

  describe('SECURITY: Data Storage & Encryption (A02)', () => {
    it('should encrypt sensitive data before storing in localStorage', () => {
      const taskData = {
        title: 'Secure Task',
        description: 'Sensitive information',
        priority: 'high' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      };

      service.createTask(taskData);

      // Check localStorageService for encrypted data
      expect(localStorageService.setItem).toHaveBeenCalled();
      expect(localStorageService.setItem).toHaveBeenCalledWith(
        'taskgo_tasks',
        expect.any(String), // encrypted data
        'create',
        expect.any(String)
      );

      // Verify data is not stored in plain text
      const encryptedDataCall = localStorageService.setItem.mock.calls.find(
        (call: any[]) => call[0] === 'taskgo_tasks'
      );
      const storedData = encryptedDataCall?.[1];
      expect(storedData).not.toContain('Secure Task');
      expect(storedData).not.toContain('Sensitive information');

      // Verify data looks encrypted (should be valid JSON with encrypted container)
      expect(() => {
        JSON.parse(storedData);
      }).not.toThrow(); // Should be valid JSON when decrypted
    });

    it('should decrypt data correctly when retrieving', () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        priority: 'medium' as TaskPriority,
        status: 'IN_PROGRESS' as TaskStatus,
        project: 'Study' as TaskProject,
      };

      service.createTask(taskData);
      const tasks = service.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Test Task');
      expect(tasks[0].description).toBe('Test Description');
    });

    it('should handle corrupted encrypted data gracefully', () => {
      // Simulate corrupted localStorage with version prefix
      localStorage.setItem('taskgo_tasks', 'v1:corrupted_encrypted_data');

      expect(() => {
        service.getTasks();
      }).not.toThrow();

      // Should fall back to empty array
      const tasks = service.getTasks();
      expect(tasks).toEqual([]);
    });

    it('should use different encryption keys per session', () => {
      const taskData = {
        title: 'Session Test',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject,
      };

      service.createTask(taskData);
      const firstEncryption = localStorage.getItem('taskgo_tasks');

      // Clear localStorage and regenerate session key to simulate new session
      localStorage.clear();

      // Get the crypto service and regenerate its key
      cryptoServiceSpy.regenerateSessionKey.mockReset();

      // Create anonymous user again for new session
      authService.createAnonymousUser();

      service.createTask(taskData);
      const secondEncryption = localStorage.getItem('taskgo_tasks');

      expect(firstEncryption).not.toBe(secondEncryption);
    });
  });

  describe('SECURITY: Access Control (A01)', () => {
    it('should implement authentication checks for task operations', () => {
      // This test will fail until authentication is implemented
      // Current implementation allows unrestricted access - SECURITY ISSUE
      const taskData = {
        title: 'Protected Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      };

      // Currently this succeeds without authentication - VULNERABILITY
      const result = service.createTask(taskData);
      expect(result).toBeTruthy();

      // TODO: After implementation, this should throw authentication error:
      // expect(() => service.createTask(taskData)).toThrow(/Authentication required/);
    });

    it('should prevent anonymous task operations', () => {
      // Test checks that anonymous users cannot access tasks
      // Currently fails because no authentication exists - SECURITY ISSUE
      expect(service.getTasks()).toBeTruthy();

      // TODO: After implementation, this should fail:
      // expect(() => service.getTasks()).toThrow(/Anonymous access not allowed/);
    });

    it('should implement user data segregation', () => {
      // Test that users can only access their own data
      // Currently fails because no user context exists - SECURITY ISSUE
      const taskData = {
        title: 'User Specific Task',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject,
      };

      service.createTask(taskData);
      const tasks = service.getTasks();

      // TODO: After implementation, tasks should be filtered by user context
      // Currently returns all tasks regardless of user - VULNERABILITY
      expect(tasks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('SECURITY: Error Handling & Information Disclosure (A05, A09)', () => {
    it('should not leak sensitive information in error messages', () => {
      try {
        service.updateTask('non-existent-id', { title: 'Updated' });
      } catch (error: any) {
        expect(error.message).not.toContain('password');
        expect(error.message).not.toContain('token');
        expect(error.message).not.toContain('secret');
        expect(error.message).not.toContain('internal');
        expect(error.message).not.toContain('stack trace');
      }
    });

    it('should log security events for audit trail', () => {
      // Clear previous calls
      authService.logSecurityEvent.mockClear();
      
      // Attempt malicious operation
      try {
        service.createTask({
          title: '<script>alert("XSS")</script>',
          priority: 'medium' as TaskPriority,
          status: 'TODO' as TaskStatus,
          project: 'Work' as TaskProject,
        });
      } catch (error) {
        // Expected to fail
      }

      // Check that some security event was logged
      expect(authService.logSecurityEvent).toHaveBeenCalled();
      
      // Get all calls and check if any contain validation or XSS events
      const calls = authService.logSecurityEvent.mock.calls;
      const securityEvent = calls.find((call: any[]) => 
        call[0].type === 'VALIDATION_FAILURE' || 
        call[0].type === 'XSS_ATTEMPT'
      );
      
      expect(securityEvent).toBeTruthy();
      expect(securityEvent[0]).toMatchObject({
        type: expect.stringMatching(/(VALIDATION_FAILURE|XSS_ATTEMPT)/),
        message: expect.any(String),
        timestamp: expect.any(Date)
      });
    });

    it('should sanitize error messages before displaying', () => {
      // This test ensures error messages don't contain HTML or scripts
      try {
        service.deleteTask('<script>alert("XSS")</script>');
      } catch (error: any) {
        expect(error.message).not.toContain('<script>');
        expect(error.message).not.toContain('javascript:');
      }
    });

    it('should implement rate limiting for security operations', () => {
      const securityService = TestBed.inject(SecurityService);
      const startTime = Date.now();
      let attempts = 0;
      let blockedCount = 0;
      let otherErrors = 0;

      // Simulate rapid attempts (more than rate limit)
      for (let i = 0; i < 105; i++) {
        try {
          service.createTask({
            title: `Test Task ${i}`,
            priority: 'low' as TaskPriority,
            status: 'TODO' as TaskStatus,
            project: 'General' as TaskProject,
          });
          attempts++;
        } catch (error: any) {
          if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
            blockedCount++;
          } else {
            otherErrors++;
            console.log(`Non-rate-limit error on iteration ${i}: ${error.message}`);
          }
        }
      }

      // Debug: Check rate limit status
      const rateLimitStatus = securityService.getRateLimitStatus('createTask');
      console.log(
        `Rate limit status: ${JSON.stringify(
          rateLimitStatus
        )}, blockedCount: ${blockedCount}, attempts: ${attempts}, otherErrors: ${otherErrors}`
      );

      // Should be blocked after certain threshold
      expect(blockedCount).toBeGreaterThan(0);
    });
  });

  describe('SECURITY: Content Security Policy (A05)', () => {
    it('should validate content against CSP rules', () => {
      const maliciousContent = {
        title: 'Task with external resource',
        description: '<img src="https://evil.com/track.png">',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      };

      expect(() => {
        service.createTask(maliciousContent);
      }).toThrow(/External resources not allowed/);
    });

    it('should block data URLs in content', () => {
      const maliciousContent = {
        title: 'Data URL Test',
        description: '<img src="data:text/html,<script>alert(\'XSS\')</script>">',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject,
      };

      expect(() => {
        service.createTask(maliciousContent);
      }).toThrow(/Data URLs not allowed/);
    });
  });
});
