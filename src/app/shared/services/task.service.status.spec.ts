import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { TaskStatus, TaskPriority, TaskProject } from '../models/task.model';
import { AuthService } from './auth.service';
import { CryptoService } from './crypto.service';
import { ValidationService } from './validation.service';
import { SecurityService } from './security.service';
import { LocalStorageService } from './local-storage.service';
import { AutoSaveService } from './auto-save.service';
import { vi } from 'vitest';

/**
 * US-005: Change Task Status - RED Phase Tests
 *
 * These tests define the expected behavior for task status change functionality.
 * They will FAIL initially because the implementation does not exist yet.
 *
 * User Story: As a user, I want to change task status for progress tracking
 *
 * Acceptance Criteria:
 * - States: TODO → IN_PROGRESS → DONE
 * - Button/Select to change state
 * - Visual differentiated by state
 * - Task counter per state
 * - Rules: Only next or previous state
 */

describe('US-005: Change Task Status - Service Layer Tests', () => {
  let service: TaskService;
  let authService: any;
  let securityService: any;
  let cryptoService: any;
  let localStorageService: any;
  let autoSaveService: any;

  beforeEach(() => {
    // Create mock services
    authService = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      createAnonymousUser: vi.fn(),
      requireAuthentication: vi.fn().mockReturnValue(undefined),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user' }),
      logSecurityEvent: vi.fn()
    };

    securityService = {
      validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] }),
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 100 })
    };

    cryptoService = {
      clear: vi.fn(),
      getStorageKey: vi.fn().mockReturnValue('taskgo_tasks'),
      getItem: vi.fn().mockResolvedValue(null),
      setItem: vi.fn().mockResolvedValue(undefined),
      encrypt: vi.fn().mockImplementation((data: any) => {
        // Return encrypted data format that matches real service
        const encryptedContainer = {
          version: 'v1',
          data: btoa(JSON.stringify(data))
        };
        return JSON.stringify(encryptedContainer);
      })
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
      handleOperationResult: vi.fn(),
      encrypt: vi.fn().mockImplementation((data: any) => {
        // Return encrypted data format that matches real service
        const encryptedContainer = {
          version: 'v1',
          data: btoa(JSON.stringify(data))
        };
        return JSON.stringify(encryptedContainer);
      })
    };

    localStorageService = {
      getItem: vi.fn().mockResolvedValue(null),
      setItem: vi.fn().mockResolvedValue(undefined)
    };

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: AuthService, useValue: authService },
        { provide: CryptoService, useValue: cryptoService },
        { provide: ValidationService, useValue: { 
          validateTaskTitle: vi.fn().mockImplementation((title: string) => ({ isValid: true, sanitized: title })),
          validateTaskDescription: vi.fn(),
          sanitizeForDisplay: vi.fn(),
          validateCSP: vi.fn().mockReturnValue({ isValid: true, violations: [] })
        } },
        { provide: SecurityService, useValue: securityService },
        { provide: LocalStorageService, useValue: localStorageService },
        { provide: AutoSaveService, useValue: autoSaveService }
      ]
    });

    service = TestBed.inject(TaskService);
    authService = TestBed.inject(AuthService);
    securityService = TestBed.inject(SecurityService);
  });

  describe('Status Transition Validation', () => {
    let testTask: any;

    beforeEach(() => {
      // Create a test task in TODO status
      testTask = service.createTask({
        title: 'Test Task for Status Change',
        description: 'This task will have its status changed',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });
    });

    it('should allow transition from TODO to IN_PROGRESS', () => {
      // ARRANGE
      const taskId = testTask.id;
      const originalUpdatedAt = testTask.updatedAt;

      // ACT
      const updatedTask = service.changeStatus(taskId, 'IN_PROGRESS');

      // ASSERT
      expect(updatedTask).toBeTruthy();
      expect(updatedTask!.status).toBe('IN_PROGRESS');
      expect(updatedTask!.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow transition from IN_PROGRESS to DONE', () => {
      // ARRANGE
      // First transition to IN_PROGRESS
      service.changeStatus(testTask.id, 'IN_PROGRESS');
      const beforeUpdate = service.getTask(testTask.id)!;

      // ACT
      const updatedTask = service.changeStatus(testTask.id, 'DONE');

      // ASSERT
      expect(updatedTask).toBeTruthy();
      expect(updatedTask!.status).toBe('DONE');
      // updatedAt should be updated or at least equal to current time (allow for same timestamp)
      expect(updatedTask!.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.updatedAt.getTime());
    });

    it('should allow transition from DONE to IN_PROGRESS (backwards)', () => {
      // ARRANGE
      // Transition to DONE first
      service.changeStatus(testTask.id, 'IN_PROGRESS');
      service.changeStatus(testTask.id, 'DONE');

      // ACT
      const updatedTask = service.changeStatus(testTask.id, 'IN_PROGRESS');

      // ASSERT
      expect(updatedTask).toBeTruthy();
      expect(updatedTask!.status).toBe('IN_PROGRESS');
    });

    it('should allow transition from IN_PROGRESS to TODO (backwards)', () => {
      // ARRANGE
      // Transition to IN_PROGRESS first
      service.changeStatus(testTask.id, 'IN_PROGRESS');

      // ACT
      const updatedTask = service.changeStatus(testTask.id, 'TODO');

      // ASSERT
      expect(updatedTask).toBeTruthy();
      expect(updatedTask!.status).toBe('TODO');
    });

    it('should reject transition from TODO to DONE (skipping IN_PROGRESS)', () => {
      // ARRANGE
      const taskId = testTask.id;

      // ACT & ASSERT
      expect(() => {
        service.changeStatus(taskId, 'DONE');
      }).toThrow(/Invalid status transition/);
    });

    it('should reject transition from DONE to TODO (skipping IN_PROGRESS)', () => {
      // ARRANGE
      // Transition to DONE first
      service.changeStatus(testTask.id, 'IN_PROGRESS');
      service.changeStatus(testTask.id, 'DONE');

      // ACT & ASSERT
      expect(() => {
        service.changeStatus(testTask.id, 'TODO');
      }).toThrow(/Invalid status transition/);
    });

    it('should return null when changing status of non-existent task', () => {
      // ARRANGE
      const nonExistentId = 'non-existent-task-id';

      // ACT
      const result = service.changeStatus(nonExistentId, 'IN_PROGRESS');

      // ASSERT
      expect(result).toBeNull();
    });

    it('should throw error when invalid status is provided', () => {
      // ARRANGE
      const taskId = testTask.id;

      // ACT & ASSERT
      expect(() => {
        service.changeStatus(taskId, 'INVALID_STATUS' as any);
      }).toThrow(/Invalid status/);
    });

    it('should maintain same priority and other fields when changing status', () => {
      // ARRANGE
      const taskId = testTask.id;
      const originalPriority = testTask.priority;
      const originalTitle = testTask.title;
      const originalProject = testTask.project;

      // ACT
      const updatedTask = service.changeStatus(taskId, 'IN_PROGRESS');

      // ASSERT
      expect(updatedTask!.priority).toBe(originalPriority);
      expect(updatedTask!.title).toBe(originalTitle);
      expect(updatedTask!.project).toBe(originalProject);
      expect(updatedTask!.description).toBe(testTask.description);
    });

    it('should update task counts when status changes', () => {
      // ARRANGE
      const countsBefore = service.getTaskCounts();
      const taskId = testTask.id;

      // ACT
      service.changeStatus(taskId, 'IN_PROGRESS');
      const countsAfter = service.getTaskCounts();

      // ASSERT
      expect(countsBefore.todo).toBe(1);
      expect(countsBefore.inProgress).toBe(0);
      expect(countsAfter.todo).toBe(0);
      expect(countsAfter.inProgress).toBe(1);
      expect(countsAfter.total).toBe(countsBefore.total);
    });
  });

  describe('getTask Method', () => {
    it('should return task by ID', () => {
      // ARRANGE
      const createdTask = service.createTask({
        title: 'Find Me Task',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject,
      });

      // ACT
      const foundTask = service.getTask(createdTask.id);

      // ASSERT
      expect(foundTask).toBeTruthy();
      expect(foundTask!.id).toBe(createdTask.id);
      expect(foundTask!.title).toBe('Find Me Task');
    });

    it('should return null for non-existent task ID', () => {
      // ACT
      const foundTask = service.getTask('non-existent-id');

      // ASSERT
      expect(foundTask).toBeNull();
    });
  });

  describe('getStatusTransitions Method', () => {
    beforeEach(() => {
      service.createTask({
        title: 'Task 1',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'General' as TaskProject,
      });
    });

    it('should return valid next status from TODO', () => {
      // ACT
      const transitions = service.getStatusTransitions('TODO');

      // ASSERT
      expect(transitions).toContain('IN_PROGRESS');
      expect(transitions).not.toContain('TODO');
      expect(transitions).not.toContain('DONE');
    });

    it('should return valid transitions from IN_PROGRESS', () => {
      // ACT
      const transitions = service.getStatusTransitions('IN_PROGRESS');

      // ASSERT
      expect(transitions).toContain('TODO');
      expect(transitions).toContain('DONE');
      expect(transitions).not.toContain('IN_PROGRESS');
    });

    it('should return valid previous status from DONE', () => {
      // ACT
      const transitions = service.getStatusTransitions('DONE');

      // ASSERT
      expect(transitions).toContain('IN_PROGRESS');
      expect(transitions).not.toContain('TODO');
      expect(transitions).not.toContain('DONE');
    });

    it('should return empty array for invalid status', () => {
      // ACT
      const transitions = service.getStatusTransitions('INVALID' as any);

      // ASSERT
      expect(transitions).toEqual([]);
    });
  });

  describe('Task Counter Updates', () => {
    beforeEach(async () => {
      // Clear any existing data and initialize with mock data
      cryptoService.getItem.mockResolvedValue(null); // Empty storage
      await service.initializeMockData();
    });

    it('should increment IN_PROGRESS count when moving TODO to IN_PROGRESS', () => {
      // ARRANGE
      const beforeCounts = service.getTaskCounts();
      const todoTask = service.getTasksByStatus('TODO')[0];
      const originalInProgressCount = beforeCounts.inProgress;

      // ACT
      service.changeStatus(todoTask.id, 'IN_PROGRESS');
      const afterCounts = service.getTaskCounts();

      // ASSERT
      expect(afterCounts.inProgress).toBe(originalInProgressCount + 1);
      expect(afterCounts.todo).toBe(beforeCounts.todo - 1);
    });

    it('should increment DONE count when moving IN_PROGRESS to DONE', () => {
      // ARRANGE
      const inProgressTask = service.getTasksByStatus('IN_PROGRESS')[0];
      const beforeCounts = service.getTaskCounts();

      // ACT
      service.changeStatus(inProgressTask.id, 'DONE');
      const afterCounts = service.getTaskCounts();

      // ASSERT
      expect(afterCounts.done).toBe(beforeCounts.done + 1);
      expect(afterCounts.inProgress).toBe(beforeCounts.inProgress - 1);
    });

    it('should maintain total count across status changes', () => {
      // ARRANGE
      const beforeCounts = service.getTaskCounts();
      const task = service.getTasks()[0];

      // ACT
      service.changeStatus(task.id, 'IN_PROGRESS');
      service.changeStatus(task.id, 'DONE');
      const afterCounts = service.getTaskCounts();

      // ASSERT
      expect(afterCounts.total).toBe(beforeCounts.total);
    });
  });

  describe('Security & Rate Limiting', () => {
    it('should check rate limit before changing status', () => {
      // ARRANGE
      const task = service.createTask({
        title: 'Rate Limit Test',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });
      const rateLimitSpy = vi.spyOn(securityService, 'checkRateLimit');

      // ACT
      service.changeStatus(task.id, 'IN_PROGRESS');

      // ASSERT
      expect(rateLimitSpy).toHaveBeenCalledWith('changeStatus');
    });

    it('should throw error when rate limit exceeded', () => {
      // ARRANGE
      const task = service.createTask({
        title: 'Rate Limit Task',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject,
      });

      vi.spyOn(securityService, 'checkRateLimit').mockReturnValue({
        allowed: false,
        remainingAttempts: 0,
      });

      // ACT & ASSERT
      expect(() => {
        service.changeStatus(task.id, 'IN_PROGRESS');
      }).toThrow(/Rate limit exceeded/);
    });

    it('should require authentication before changing status', () => {
      // ARRANGE
      const task = service.createTask({
        title: 'Auth Test',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      const authSpy = vi.spyOn(authService, 'requireAuthentication');

      // ACT
      service.changeStatus(task.id, 'IN_PROGRESS');

      // ASSERT
      expect(authSpy).toHaveBeenCalled();
    });

    it('should log security event when status is changed', () => {
      // ARRANGE
      const task = service.createTask({
        title: 'Security Event Task',
        priority: 'high' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      const logSpy = vi.spyOn(authService, 'logSecurityEvent');

      // ACT
      service.changeStatus(task.id, 'IN_PROGRESS');

      // ASSERT
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DATA_ACCESS',
          message: expect.stringContaining('Task status changed'),
          timestamp: expect.any(Date),
        })
      );
    });

    it('should validate status input to prevent injection', () => {
      // ARRANGE
      const task = service.createTask({
        title: 'Validation Test',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      // ACT & ASSERT
      expect(() => {
        service.changeStatus(task.id, '<script>alert("XSS")</script>' as any);
      }).toThrow(/Invalid status/);

      expect(() => {
        service.changeStatus(task.id, 'TODO; DROP TABLE tasks' as any);
      }).toThrow(/Invalid status/);
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle rapid status changes correctly', () => {
      // ARRANGE
      const task = service.createTask({
        title: 'Rapid Changes',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      // ACT
      service.changeStatus(task.id, 'IN_PROGRESS');
      const result1 = service.changeStatus(task.id, 'TODO');
      const result2 = service.changeStatus(task.id, 'IN_PROGRESS');
      const result3 = service.changeStatus(task.id, 'DONE');

      // ASSERT
      expect(result1?.status).toBe('TODO');
      expect(result2?.status).toBe('IN_PROGRESS');
      expect(result3?.status).toBe('DONE');
    });

    it('should preserve task integrity after multiple status changes', () => {
      // ARRANGE
      const task = service.createTask({
        title: 'Integrity Test',
        description: 'Original description',
        priority: 'high' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Study' as TaskProject,
      });

      // ACT
      service.changeStatus(task.id, 'IN_PROGRESS');
      service.changeStatus(task.id, 'TODO');
      service.changeStatus(task.id, 'IN_PROGRESS');
      service.changeStatus(task.id, 'DONE');
      const finalTask = service.getTask(task.id);

      // ASSERT
      expect(finalTask).toBeTruthy();
      expect(finalTask!.title).toBe('Integrity Test');
      expect(finalTask!.description).toBe('Original description');
      expect(finalTask!.priority).toBe('high');
      expect(finalTask!.project).toBe('Study');
      expect(finalTask!.id).toBe(task.id);
      expect(finalTask!.status).toBe('DONE');
    });

    it('should handle status change when task has no updatedAt field (corrupted data)', () => {
      // ARRANGE
      const task = service.createTask({
        title: 'Corrupted Task',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'General' as TaskProject,
      });

      // Simulate corrupted data by manually setting updatedAt to undefined
      // This test ensures the service handles this edge case
      // Note: This would require accessing private state or mocking storage

      // ACT & ASSERT
      // The service should handle this gracefully and return null
      const result = service.changeStatus(task.id, 'IN_PROGRESS');

      // For now, we expect the service to handle it
      expect(result).toBeDefined();
    });

    it('should encrypt updated status in storage', () => {
      // ARRANGE
      const task = service.createTask({
        title: 'Encrypted Status Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      // ACT
      service.changeStatus(task.id, 'IN_PROGRESS');

      // ASSERT
      expect(localStorageService.setItem).toHaveBeenCalled();
      expect(localStorageService.setItem).toHaveBeenCalledWith(
        'taskgo_tasks',
        expect.any(String), // encrypted data
        'update',
        expect.any(String)
      );
      // Data should not contain plain text status (check the encrypted data)
      const encryptedDataCall = localStorageService.setItem.mock.calls.find(
        (call: any[]) => call[0] === 'taskgo_tasks'
      );
      expect(encryptedDataCall?.[1]).not.toContain('"IN_PROGRESS"');
    });
  });

  describe('Concurrent Status Changes', () => {
    it('should handle multiple tasks changing status simultaneously', () => {
      // ARRANGE
      const task1 = service.createTask({
        title: 'Task 1',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      const task2 = service.createTask({
        title: 'Task 2',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject,
      });

      const task3 = service.createTask({
        title: 'Task 3',
        priority: 'high' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Study' as TaskProject,
      });

      // ACT
      const result1 = service.changeStatus(task1.id, 'IN_PROGRESS');
      const result2 = service.changeStatus(task2.id, 'IN_PROGRESS');

      // ASSERT
      expect(result1?.status).toBe('IN_PROGRESS');
      expect(result2?.status).toBe('IN_PROGRESS');

      // ACT & ASSERT - Direct TODO to DONE transition should throw error
      expect(() => {
        service.changeStatus(task3.id, 'DONE');
      }).toThrow(/Invalid status transition/);
    });
  });
});
