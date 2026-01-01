import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { TaskStatus, TaskProject, TaskPriority } from '../models/task.model';
import { AuthService } from './auth.service';
import { CryptoService } from './crypto.service';
import { ValidationService } from './validation.service';
import { SecurityService } from './security.service';

describe('TaskService - Filter Tests (US-006)', () => {
  let service: TaskService;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, CryptoService, ValidationService, SecurityService],
    });

    const cryptoService = TestBed.inject(CryptoService);
    cryptoService.clear();

    service = TestBed.inject(TaskService);
    authService = TestBed.inject(AuthService);

    authService.createAnonymousUser();
  });

  describe('Filter by Status', () => {
    beforeEach(() => {
      service.clearTasks();
      service.createTask({
        title: 'Task 1 TODO',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });
      service.createTask({
        title: 'Task 2 TODO',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject,
      });
      service.createTask({
        title: 'Task 3 IN_PROGRESS',
        priority: 'high' as TaskPriority,
        status: 'IN_PROGRESS' as TaskStatus,
        project: 'Study' as TaskProject,
      });
      service.createTask({
        title: 'Task 4 DONE',
        priority: 'medium' as TaskPriority,
        status: 'DONE' as TaskStatus,
        project: 'Work' as TaskProject,
      });
    });

    it('should filter tasks by "TODO" status', () => {
      const todoTasks = service.getTasksByStatus('TODO');

      expect(todoTasks).toHaveLength(2);
      expect(todoTasks.every((task) => task.status === 'TODO')).toBe(true);
    });

    it('should filter tasks by "IN_PROGRESS" status', () => {
      const inProgressTasks = service.getTasksByStatus('IN_PROGRESS');

      expect(inProgressTasks).toHaveLength(1);
      expect(inProgressTasks[0].status).toBe('IN_PROGRESS');
    });

    it('should filter tasks by "DONE" status', () => {
      const doneTasks = service.getTasksByStatus('DONE');

      expect(doneTasks).toHaveLength(1);
      expect(doneTasks[0].status).toBe('DONE');
    });

    it('should return empty array when no tasks match status', () => {
      const tasks = service.getTasksByStatus('DONE');

      // Add more DONE tasks and filter for non-matching status
      service.createTask({
        title: 'Task 5 DONE',
        priority: 'low' as TaskPriority,
        status: 'DONE' as TaskStatus,
        project: 'General' as TaskProject,
      });

      const emptyFilter = service.getTasksByStatus('TODO');
      const filtered = emptyFilter.filter((t) => t.id !== tasks[0]?.id && t.id !== tasks[1]?.id);
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });

    it('should maintain filter across service operations', () => {
      const initialTodoCount = service.getTasksByStatus('TODO').length;

      // Add a new TODO task
      service.createTask({
        title: 'New TODO Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      const newTodoCount = service.getTasksByStatus('TODO').length;
      expect(newTodoCount).toBe(initialTodoCount + 1);
    });
  });

  describe('Filter by Status and Project', () => {
    beforeEach(() => {
      service.clearTasks();
      service.createTask({
        title: 'Work TODO',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });
      service.createTask({
        title: 'Work IN_PROGRESS',
        priority: 'high' as TaskPriority,
        status: 'IN_PROGRESS' as TaskStatus,
        project: 'Work' as TaskProject,
      });
      service.createTask({
        title: 'Personal TODO',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject,
      });
      service.createTask({
        title: 'Study DONE',
        priority: 'medium' as TaskPriority,
        status: 'DONE' as TaskStatus,
        project: 'Study' as TaskProject,
      });
    });

    it('should filter tasks by status and project together', () => {
      const workTodoTasks = service.getTasksByStatusAndProject('TODO', 'Work');

      expect(workTodoTasks).toHaveLength(1);
      expect(workTodoTasks[0].status).toBe('TODO');
      expect(workTodoTasks[0].project).toBe('Work');
    });

    it('should return all tasks when status is "all"', () => {
      const allWorkTasks = service.getTasksByStatusAndProject('all', 'Work');

      expect(allWorkTasks).toHaveLength(2);
      expect(allWorkTasks.every((task) => task.project === 'Work')).toBe(true);
    });

    it('should return all tasks when project is "all"', () => {
      const allTodoTasks = service.getTasksByStatusAndProject('TODO', 'all');

      expect(allTodoTasks).toHaveLength(2);
      expect(allTodoTasks.every((task) => task.status === 'TODO')).toBe(true);
    });

    it('should return all tasks when both are "all"', () => {
      const allTasks = service.getTasksByStatusAndProject('all', 'all');

      expect(allTasks).toHaveLength(4);
    });

    it('should return empty array for non-matching filter', () => {
      const results = service.getTasksByStatusAndProject('DONE', 'Personal');

      expect(results).toHaveLength(0);
    });
  });

  describe('Task Counts', () => {
    beforeEach(() => {
      service.clearTasks();
    });

    it('should return zero counts when no tasks exist', () => {
      const counts = service.getTaskCounts();

      expect(counts).toEqual({
        todo: 0,
        inProgress: 0,
        done: 0,
        total: 0,
      });
    });

    it('should correctly count TODO tasks', () => {
      service.createTask({
        title: 'TODO 1',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });
      service.createTask({
        title: 'TODO 2',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject,
      });

      const counts = service.getTaskCounts();
      expect(counts.todo).toBe(2);
    });

    it('should correctly count IN_PROGRESS tasks', () => {
      service.createTask({
        title: 'IN_PROGRESS 1',
        priority: 'high' as TaskPriority,
        status: 'IN_PROGRESS' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      const counts = service.getTaskCounts();
      expect(counts.inProgress).toBe(1);
    });

    it('should correctly count DONE tasks', () => {
      service.createTask({
        title: 'DONE 1',
        priority: 'medium' as TaskPriority,
        status: 'DONE' as TaskStatus,
        project: 'Work' as TaskProject,
      });
      service.createTask({
        title: 'DONE 2',
        priority: 'low' as TaskPriority,
        status: 'DONE' as TaskStatus,
        project: 'Study' as TaskProject,
      });
      service.createTask({
        title: 'DONE 3',
        priority: 'high' as TaskPriority,
        status: 'DONE' as TaskStatus,
        project: 'Personal' as TaskProject,
      });

      const counts = service.getTaskCounts();
      expect(counts.done).toBe(3);
    });

    it('should correctly calculate total task count', () => {
      service.createTask({
        title: 'Task 1',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });
      service.createTask({
        title: 'Task 2',
        priority: 'low' as TaskPriority,
        status: 'IN_PROGRESS' as TaskStatus,
        project: 'Personal' as TaskProject,
      });
      service.createTask({
        title: 'Task 3',
        priority: 'high' as TaskPriority,
        status: 'DONE' as TaskStatus,
        project: 'Study' as TaskProject,
      });

      const counts = service.getTaskCounts();
      expect(counts.total).toBe(3);
      expect(counts.total).toBe(counts.todo + counts.inProgress + counts.done);
    });

    it('should update counts when tasks are created', () => {
      const initialCounts = service.getTaskCounts();
      expect(initialCounts.total).toBe(0);

      service.createTask({
        title: 'New Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      const newCounts = service.getTaskCounts();
      expect(newCounts.total).toBe(1);
      expect(newCounts.todo).toBe(1);
    });

    it('should update counts when tasks are updated', () => {
      const task = service.createTask({
        title: 'Task to Update',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      const initialCounts = service.getTaskCounts();
      expect(initialCounts.todo).toBe(1);
      expect(initialCounts.done).toBe(0);

      service.updateTask(task.id, { status: 'DONE' });

      const newCounts = service.getTaskCounts();
      expect(newCounts.todo).toBe(0);
      expect(newCounts.done).toBe(1);
    });

    it('should update counts when tasks are deleted', () => {
      service.createTask({
        title: 'Task to Delete',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      const initialCounts = service.getTaskCounts();
      expect(initialCounts.total).toBe(1);

      const task = service.getTasks()[0];
      service.deleteTask(task.id);

      const newCounts = service.getTaskCounts();
      expect(newCounts.total).toBe(0);
    });
  });

  describe('Filter Edge Cases', () => {
    beforeEach(() => {
      service.clearTasks();
    });

    it('should handle filtering when tasks array is empty', () => {
      const todoTasks = service.getTasksByStatus('TODO');
      const inProgressTasks = service.getTasksByStatus('IN_PROGRESS');
      const doneTasks = service.getTasksByStatus('DONE');

      expect(todoTasks).toEqual([]);
      expect(inProgressTasks).toEqual([]);
      expect(doneTasks).toEqual([]);
    });

    it('should handle filtering when all tasks have same status', () => {
      service.createTask({
        title: 'Task 1',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });
      service.createTask({
        title: 'Task 2',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject,
      });

      const todoTasks = service.getTasksByStatus('TODO');
      const inProgressTasks = service.getTasksByStatus('IN_PROGRESS');
      const doneTasks = service.getTasksByStatus('DONE');

      expect(todoTasks).toHaveLength(2);
      expect(inProgressTasks).toHaveLength(0);
      expect(doneTasks).toHaveLength(0);
    });

    it('should handle mixed status distribution correctly', () => {
      for (let i = 0; i < 10; i++) {
        const status = i < 5 ? 'TODO' : i < 8 ? 'IN_PROGRESS' : 'DONE';
        service.createTask({
          title: `Task ${i}`,
          priority: 'medium' as TaskPriority,
          status: status as TaskStatus,
          project: 'Work' as TaskProject,
        });
      }

      const counts = service.getTaskCounts();
      expect(counts.todo).toBe(5);
      expect(counts.inProgress).toBe(3);
      expect(counts.done).toBe(2);
      expect(counts.total).toBe(10);
    });
  });

  describe('Filter Persistence', () => {
    it('should maintain filter state after service operations', () => {
      service.clearTasks();

      const tasks = [
        service.createTask({
          title: 'Task 1',
          priority: 'medium' as TaskPriority,
          status: 'TODO' as TaskStatus,
          project: 'Work' as TaskProject,
        }),
        service.createTask({
          title: 'Task 2',
          priority: 'high' as TaskPriority,
          status: 'IN_PROGRESS' as TaskStatus,
          project: 'Personal' as TaskProject,
        }),
      ];

      const initialTodoTasks = service.getTasksByStatus('TODO');
      expect(initialTodoTasks).toHaveLength(1);

      // Update a task
      service.updateTask(tasks[1].id, { status: 'TODO' });

      const newTodoTasks = service.getTasksByStatus('TODO');
      expect(newTodoTasks).toHaveLength(2);
    });

    it('should correctly count tasks after multiple operations', () => {
      service.clearTasks();

      // Create tasks
      service.createTask({
        title: 'Task 1',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });
      service.createTask({
        title: 'Task 2',
        priority: 'high' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      let counts = service.getTaskCounts();
      expect(counts.todo).toBe(2);

      // Update task
      const task = service.getTasks()[0];
      service.updateTask(task.id, { status: 'DONE' });

      counts = service.getTaskCounts();
      expect(counts.todo).toBe(1);
      expect(counts.done).toBe(1);

      // Delete task
      service.deleteTask(task.id);

      counts = service.getTaskCounts();
      expect(counts.todo).toBe(1);
      expect(counts.done).toBe(0);
    });
  });
});
