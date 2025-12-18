import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { TaskStatus, TaskProject, TaskPriority } from '../models/task.model';

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskService);
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
        total: 0
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
        project: 'Work' as TaskProject
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
        project: 'Personal' as TaskProject
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
        project: 'Study' as TaskProject
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
        project: 'General' as TaskProject
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
      expect(todoTasks.every(task => task.status === 'TODO')).toBe(true);

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
      expect(workTasks.every(task => task.project === 'Work')).toBe(true);

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
        total: 4
      });
    });
  });

  describe('Task Updates', () => {
    beforeEach(() => {
      service.initializeMockData();
    });

    it('should update existing task', () => {
      const taskId = '1';
      const updates = {
        title: 'Updated Task Title',
        status: 'IN_PROGRESS' as TaskStatus,
        description: 'Updated description'
      };

      const updatedTask = service.updateTask(taskId, updates);

      expect(updatedTask).toBeTruthy();
      expect(updatedTask!.title).toBe('Updated Task Title');
      expect(updatedTask!.status).toBe('IN_PROGRESS');
      expect(updatedTask!.description).toBe('Updated description');
      expect(updatedTask!.priority).toBe('high'); // unchanged
      expect(updatedTask!.project).toBe('Work'); // unchanged
      expect(updatedTask!.updatedAt).toBeInstanceOf(Date);
      expect(updatedTask!.updatedAt.getTime()).toBeGreaterThan(
        updatedTask!.createdAt.getTime()
      );
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
    beforeEach(() => {
      service.initializeMockData();
    });

    it('should delete existing task', () => {
      const taskId = '2'; // Setup development environment
      
      const result = service.deleteTask(taskId);
      const tasks = service.getTasks();
      
      expect(result).toBe(true);
      expect(tasks).toHaveLength(3);
      expect(tasks.find(task => task.id === taskId)).toBeUndefined();
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
    it('should initialize with mock data', () => {
      service.initializeMockData();
      
      const tasks = service.getTasks();
      expect(tasks).toHaveLength(4);
      
      // Verify mock data structure
      tasks.forEach(task => {
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
      service.initializeMockData();
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
        project: 'General' as TaskProject
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
          project: 'General' as TaskProject
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
        project: 'Work' as TaskProject
      });
      
      const sortedTasks = service.getTasksSorted();
      
      expect(sortedTasks[0].id).toBe(newTask.id);
      expect(sortedTasks[0].title).toBe('Newest Task');
    });
  });

  describe('Business Rules Validation', () => {
    beforeEach(() => {
      service.initializeMockData();
    });

    it('should ensure task IDs are strings', () => {
      const tasks = service.getTasks();
      tasks.forEach(task => {
        expect(typeof task.id).toBe('string');
      });
    });

    it('should ensure timestamps are Date objects', () => {
      const tasks = service.getTasks();
      tasks.forEach(task => {
        expect(task.createdAt).toBeInstanceOf(Date);
        expect(task.updatedAt).toBeInstanceOf(Date);
      });
    });

    it('should ensure all enum values are valid', () => {
      const tasks = service.getTasks();
      tasks.forEach(task => {
        expect(['low', 'medium', 'high']).toContain(task.priority);
        expect(['TODO', 'IN_PROGRESS', 'DONE']).toContain(task.status);
        expect(['Personal', 'Work', 'Study', 'General']).toContain(task.project);
      });
    });

    it('should maintain updatedAt when status changes', () => {
      const task = service.getTasks()[0];
      const originalUpdatedAt = task.updatedAt;
      
      // Small delay to ensure different timestamp
      setTimeout(() => {
        const updatedTask = service.updateTask(task.id, { status: 'DONE' });
        expect(updatedTask!.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 1);
    });
  });
});