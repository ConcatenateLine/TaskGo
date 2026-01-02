import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { TaskService } from './task.service';
import { Task, TaskProject, TaskStatus } from '../models/task.model';
import { CryptoService } from './crypto.service';
import { ValidationService } from './validation.service';
import { AuthService } from './auth.service';
import { SecurityService } from './security.service';

describe('TaskService - US-007: Project Handling', () => {
  let taskService: TaskService;
  let cryptoService: any;
  let validationService: any;
  let authService: any;
  let securityService: any;

  const mockTaskData = {
    id: 'test-1',
    title: 'Test Task',
    description: 'Test Description',
    priority: 'medium' as const,
    status: 'TODO' as const,
    project: 'General' as TaskProject,
    createdAt: new Date('2024-01-20T10:00:00'),
    updatedAt: new Date('2024-01-20T10:00:00')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        TaskService,
        {
          provide: CryptoService,
          useValue: {
            getItem: vi.fn().mockReturnValue([]),
            setItem: vi.fn(),
            clearTaskStorage: vi.fn(),
            getStorageKey: vi.fn().mockReturnValue('test_key')
          }
        },
        {
          provide: ValidationService,
          useValue: {
            validateTaskTitle: vi.fn().mockReturnValue({ isValid: true, sanitized: 'Sanitized Title' }),
            validateTaskDescription: vi.fn().mockReturnValue({ isValid: true, sanitized: 'Sanitized Description' }),
            validateCSP: vi.fn().mockReturnValue({ isValid: true, violations: [] }),
            sanitizeForDisplay: vi.fn((text: string) => text)
          }
        },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: vi.fn().mockReturnValue(true),
            requireAuthentication: vi.fn().mockReturnValue(undefined),
            logSecurityEvent: vi.fn(),
            getUserContext: vi.fn().mockReturnValue({ userId: 'test-user' }),
            createAnonymousUser: vi.fn()
          }
        },
        {
          provide: SecurityService,
          useValue: {
            validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] }),
            checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 100 })
          }
        }
      ]
    }).compileComponents();

    taskService = TestBed.inject(TaskService);
    cryptoService = TestBed.inject(CryptoService);
    validationService = TestBed.inject(ValidationService);
    authService = TestBed.inject(AuthService);
    securityService = TestBed.inject(SecurityService);
  });

  afterEach(() => {
    taskService.clearTasks();
  });

  describe('getTasksByProject', () => {
    beforeEach(() => {
      taskService.clearTasks();
      taskService.createTask({
        title: 'Work Task',
        description: 'Work Description',
        priority: 'high',
        status: 'TODO',
        project: 'Work'
      });
      taskService.createTask({
        title: 'Personal Task',
        description: 'Personal Description',
        priority: 'medium',
        status: 'IN_PROGRESS',
        project: 'Personal'
      });
      taskService.createTask({
        title: 'Study Task',
        description: 'Study Description',
        priority: 'low',
        status: 'DONE',
        project: 'Study'
      });
      taskService.createTask({
        title: 'General Task',
        description: 'General Description',
        priority: 'medium',
        status: 'TODO',
        project: 'General'
      });
    });

    it('should return all tasks for Personal project', () => {
      const personalTasks = taskService.getTasksByProject('Personal');

      expect(personalTasks).toHaveLength(1);
      expect(personalTasks[0].project).toBe('Personal');
      expect(personalTasks[0].title).toBe('Personal Task');
    });

    it('should return all tasks for Work project', () => {
      const workTasks = taskService.getTasksByProject('Work');

      expect(workTasks).toHaveLength(1);
      expect(workTasks[0].project).toBe('Work');
      expect(workTasks[0].title).toBe('Work Task');
    });

    it('should return all tasks for Study project', () => {
      const studyTasks = taskService.getTasksByProject('Study');

      expect(studyTasks).toHaveLength(1);
      expect(studyTasks[0].project).toBe('Study');
      expect(studyTasks[0].title).toBe('Study Task');
    });

    it('should return all tasks for General project', () => {
      const generalTasks = taskService.getTasksByProject('General');

      expect(generalTasks).toHaveLength(1);
      expect(generalTasks[0].project).toBe('General');
      expect(generalTasks[0].title).toBe('General Task');
    });

    it('should return empty array when no tasks in project', () => {
      const personalTasks = taskService.getTasksByProject('Personal');
      const filteredTasks = personalTasks.filter((t: Task) => t.title !== 'Personal Task');

      taskService.clearTasks();
      filteredTasks.forEach(task => taskService.createTask(task));

      const result = taskService.getTasksByProject('Personal');

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getTasksByStatusAndProject', () => {
    beforeEach(() => {
      taskService.clearTasks();
      taskService.createTask({
        title: 'Work TODO',
        description: 'Work TODO Description',
        priority: 'high',
        status: 'TODO',
        project: 'Work'
      });
      taskService.createTask({
        title: 'Personal IN_PROGRESS',
        description: 'Personal IN_PROGRESS Description',
        priority: 'medium',
        status: 'IN_PROGRESS',
        project: 'Personal'
      });
      taskService.createTask({
        title: 'Study DONE',
        description: 'Study DONE Description',
        priority: 'low',
        status: 'DONE',
        project: 'Study'
      });
      taskService.createTask({
        title: 'General TODO',
        description: 'General TODO Description',
        priority: 'medium',
        status: 'TODO',
        project: 'General'
      });
      taskService.createTask({
        title: 'Work IN_PROGRESS',
        description: 'Work IN_PROGRESS Description',
        priority: 'high',
        status: 'IN_PROGRESS',
        project: 'Work'
      });
    });

    it('should return tasks filtered by both status and project', () => {
      const workTodoTasks = taskService.getTasksByStatusAndProject('TODO', 'Work');

      expect(workTodoTasks).toHaveLength(1);
      expect(workTodoTasks[0].status).toBe('TODO');
      expect(workTodoTasks[0].project).toBe('Work');
    });

    it('should return tasks when status is all', () => {
      const personalAllTasks = taskService.getTasksByStatusAndProject('all', 'Personal');

      expect(personalAllTasks).toHaveLength(1);
      expect(personalAllTasks[0].project).toBe('Personal');
    });

    it('should return tasks when project is all', () => {
      const todoAllProjects = taskService.getTasksByStatusAndProject('TODO', 'all');

      expect(todoAllProjects.length).toBeGreaterThan(0);
      todoAllProjects.forEach(task => {
        expect(task.status).toBe('TODO');
      });
    });

    it('should return all tasks when both filters are all', () => {
      const allTasks = taskService.getTasksByStatusAndProject('all', 'all');

      expect(allTasks.length).toBeGreaterThan(0);
    });

    it('should return empty array when no tasks match both filters', () => {
      const result = taskService.getTasksByStatusAndProject('DONE', 'Personal');

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('createTask with Project', () => {
    it('should create task with Personal project', () => {
      const newTask = taskService.createTask({
        title: 'New Personal Task',
        description: 'Personal Description',
        priority: 'medium',
        status: 'TODO',
        project: 'Personal'
      });

      expect(newTask).toBeTruthy();
      expect(newTask.project).toBe('Personal');
      expect(newTask.id).toBeTruthy();
    });

    it('should create task with Work project', () => {
      const newTask = taskService.createTask({
        title: 'New Work Task',
        description: 'Work Description',
        priority: 'high',
        status: 'TODO',
        project: 'Work'
      });

      expect(newTask).toBeTruthy();
      expect(newTask.project).toBe('Work');
      expect(newTask.id).toBeTruthy();
    });

    it('should create task with Study project', () => {
      const newTask = taskService.createTask({
        title: 'New Study Task',
        description: 'Study Description',
        priority: 'low',
        status: 'TODO',
        project: 'Study'
      });

      expect(newTask).toBeTruthy();
      expect(newTask.project).toBe('Study');
      expect(newTask.id).toBeTruthy();
    });

    it('should create task with General project', () => {
      const newTask = taskService.createTask({
        title: 'New General Task',
        description: 'General Description',
        priority: 'medium',
        status: 'TODO',
        project: 'General'
      });

      expect(newTask).toBeTruthy();
      expect(newTask.project).toBe('General');
      expect(newTask.id).toBeTruthy();
    });

    it('should persist project value in storage', () => {
      const newTask = taskService.createTask({
        title: 'Persistent Project Task',
        description: 'Description',
        priority: 'medium',
        status: 'TODO',
        project: 'Work'
      });

      expect(cryptoService.setItem).toHaveBeenCalledWith(
        'test_key',
        expect.arrayContaining(
          expect.objectContaining({ project: 'Work' })
        )
      );
    });

    it('should log security event for project creation', () => {
      taskService.createTask({
        title: 'Project Task',
        description: 'Description',
        priority: 'medium',
        status: 'TODO',
        project: 'Personal'
      });

      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_ACCESS',
        message: expect.stringContaining('Task created'),
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });
  });

  describe('updateTask with Project', () => {
    beforeEach(() => {
      taskService.clearTasks();
      taskService.createTask(mockTaskData);
    });

    it('should update task project from General to Personal', () => {
      const updatedTask = taskService.updateTask(mockTaskData.id, {
        project: 'Personal'
      });

      expect(updatedTask).toBeTruthy();
      expect(updatedTask!.project).toBe('Personal');
      expect(updatedTask!.updatedAt).not.toEqual(mockTaskData.updatedAt);
    });

    it('should update task project from General to Work', () => {
      const updatedTask = taskService.updateTask(mockTaskData.id, {
        project: 'Work'
      });

      expect(updatedTask).toBeTruthy();
      expect(updatedTask!.project).toBe('Work');
    });

    it('should update task project from General to Study', () => {
      const updatedTask = taskService.updateTask(mockTaskData.id, {
        project: 'Study'
      });

      expect(updatedTask).toBeTruthy();
      expect(updatedTask!.project).toBe('Study');
    });

    it('should update task with other fields along with project', () => {
      const updatedTask = taskService.updateTask(mockTaskData.id, {
        title: 'Updated Title',
        project: 'Personal',
        priority: 'high'
      });

      expect(updatedTask).toBeTruthy();
      expect(updatedTask!.project).toBe('Personal');
      expect(updatedTask!.title).toBe('Updated Title');
      expect(updatedTask!.priority).toBe('high');
    });

    it('should validate project before updating', () => {
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Sanitized Title' });

      taskService.updateTask(mockTaskData.id, {
        title: 'New Title',
        project: 'Work'
      });

      expect(validationService.validateTaskTitle).toHaveBeenCalled();
    });

    it('should log security event for project update', () => {
      taskService.updateTask(mockTaskData.id, {
        project: 'Personal'
      });

      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_ACCESS',
        message: expect.stringContaining('Task updated'),
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });
  });

  describe('Project Validation', () => {
    it('should create task with valid project values', () => {
      const validProjects: TaskProject[] = ['Personal', 'Work', 'Study', 'General'];

      validProjects.forEach(project => {
        const task: Task = taskService.createTask({
          title: `Task for ${project}`,
          description: 'Description',
          priority: 'medium',
          status: 'TODO',
          project
        });

        expect(task.project).toBe(project);
      });
    });

    it('should maintain project value through updates', () => {
      const createdTask = taskService.createTask({
        title: 'Original Task',
        description: 'Original Description',
        priority: 'medium',
        status: 'TODO',
        project: 'Work'
      });

      const updatedTask = taskService.updateTask(createdTask.id, {
        title: 'Updated Title'
      });

      expect(updatedTask!.project).toBe('Work');
    });

    it('should handle project in getTask method', () => {
      const createdTask = taskService.createTask({
        title: 'Test Task',
        description: 'Test Description',
        priority: 'medium',
        status: 'TODO',
        project: 'Study'
      });

      const retrievedTask = taskService.getTask(createdTask.id);

      expect(retrievedTask).toBeTruthy();
      expect(retrievedTask!.project).toBe('Study');
    });
  });

  describe('Project Filtering Edge Cases', () => {
    beforeEach(() => {
      taskService.clearTasks();
    });

    it('should handle empty results gracefully', () => {
      const result = taskService.getTasksByProject('Personal');

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle multiple tasks with same project', () => {
      taskService.createTask({
        title: 'Work Task 1',
        description: 'Description 1',
        priority: 'high',
        status: 'TODO',
        project: 'Work'
      });
      taskService.createTask({
        title: 'Work Task 2',
        description: 'Description 2',
        priority: 'medium',
        status: 'IN_PROGRESS',
        project: 'Work'
      });
      taskService.createTask({
        title: 'Work Task 3',
        description: 'Description 3',
        priority: 'low',
        status: 'DONE',
        project: 'Work'
      });

      const workTasks = taskService.getTasksByProject('Work');

      expect(workTasks).toHaveLength(3);
      workTasks.forEach((task: Task) => {
        expect(task.project).toBe('Work');
      });
    });

    it('should correctly filter by status and project combination', () => {
      taskService.createTask({
        title: 'Work TODO',
        description: 'Description',
        priority: 'high',
        status: 'TODO',
        project: 'Work'
      });
      taskService.createTask({
        title: 'Work DONE',
        description: 'Description',
        priority: 'high',
        status: 'DONE',
        project: 'Work'
      });
      taskService.createTask({
        title: 'Personal TODO',
        description: 'Description',
        priority: 'medium',
        status: 'TODO',
        project: 'Personal'
      });

      const workTodoTasks: Task[] = taskService.getTasksByStatusAndProject('TODO', 'Work');

      expect(workTodoTasks).toHaveLength(1);
      expect(workTodoTasks[0].project).toBe('Work');
      expect(workTodoTasks[0].status).toBe('TODO');
    });
  });

  describe('Security - Project Field', () => {
    it('should validate project value through security service', () => {
      taskService.createTask({
        title: 'Test Task',
        description: 'Description',
        priority: 'medium',
        status: 'TODO',
        project: 'Personal'
      });

      expect(securityService.validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'Personal'
        })
      );
    });

    it('should require authentication for project operations', () => {
      taskService.getTasksByProject('Personal');

      expect(authService.requireAuthentication).toHaveBeenCalled();
    });

    it('should log security events for project operations', () => {
      taskService.createTask({
        title: 'Security Test Task',
        description: 'Description',
        priority: 'medium',
        status: 'TODO',
        project: 'Work'
      });

      expect(authService.logSecurityEvent).toHaveBeenCalled();
    });
  });

  describe('Integration - Complete Project Workflow', () => {
    it('should support full project lifecycle: create -> filter -> update', () => {
      // Create tasks
      const task1 = taskService.createTask({
        title: 'Personal Task',
        description: 'Description',
        priority: 'medium',
        status: 'TODO',
        project: 'Personal'
      });

      const task2 = taskService.createTask({
        title: 'Work Task',
        description: 'Description',
        priority: 'high',
        status: 'TODO',
        project: 'Work'
      });

      // Filter by project
      const personalTasks = taskService.getTasksByProject('Personal');
      expect(personalTasks).toHaveLength(1);

      // Update task project
      const updatedTask = taskService.updateTask(task1.id, {
        project: 'Work'
      });

      expect(updatedTask!.project).toBe('Work');

      // Verify updated task appears in different project filter
      const workTasks = taskService.getTasksByProject('Work');
      expect(workTasks).toHaveLength(2);
    });

    it('should maintain project data integrity through multiple operations', () => {
      const originalTask = taskService.createTask({
        title: 'Original Task',
        description: 'Original Description',
        priority: 'medium',
        status: 'TODO',
        project: 'Study'
      });

      // Update with multiple changes
      const updated1 = taskService.updateTask(originalTask.id, {
        title: 'Updated Title',
        project: 'Work'
      });

      const updated2 = taskService.updateTask(originalTask.id, {
        priority: 'high',
        description: 'Updated Description'
      });

      // Final retrieval
      const finalTask = taskService.getTask(originalTask.id);

      expect(finalTask!.project).toBe('Work');
      expect(finalTask!.title).toBe('Updated Title');
      expect(finalTask!.description).toBe('Updated Description');
      expect(finalTask!.priority).toBe('high');
    });
  });
});
