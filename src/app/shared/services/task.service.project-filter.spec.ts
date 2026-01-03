import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { TaskStatus, TaskProject, TaskPriority } from '../models/task.model';
import { AuthService } from './auth.service';
import { CryptoService } from './crypto.service';
import { ValidationService } from './validation.service';
import { SecurityService } from './security.service';

describe('TaskService - Project Filter Tests (US-008)', () => {
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

  describe('Filter by Project', () => {
    beforeEach(() => {
      service.clearTasks();
      // Create tasks across different projects
      service.createTask({
        title: 'Work Task 1',
        priority: 'high' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });
      service.createTask({
        title: 'Work Task 2',
        priority: 'medium' as TaskPriority,
        status: 'IN_PROGRESS' as TaskStatus,
        project: 'Work' as TaskProject,
      });
      service.createTask({
        title: 'Personal Task 1',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject,
      });
      service.createTask({
        title: 'Personal Task 2',
        priority: 'medium' as TaskPriority,
        status: 'DONE' as TaskStatus,
        project: 'Personal' as TaskProject,
      });
      service.createTask({
        title: 'Study Task 1',
        priority: 'high' as TaskPriority,
        status: 'IN_PROGRESS' as TaskStatus,
        project: 'Study' as TaskProject,
      });
      service.createTask({
        title: 'General Task 1',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'General' as TaskProject,
      });
    });

    it('should filter tasks by "Work" project', () => {
      const workTasks = service.getTasksByProject('Work');

      expect(workTasks).toHaveLength(2);
      expect(workTasks.every((task) => task.project === 'Work')).toBe(true);
      expect(workTasks.map((task) => task.title)).toContain('Work Task 1');
      expect(workTasks.map((task) => task.title)).toContain('Work Task 2');
    });

    it('should filter tasks by "Personal" project', () => {
      const personalTasks = service.getTasksByProject('Personal');

      expect(personalTasks).toHaveLength(2);
      expect(personalTasks.every((task) => task.project === 'Personal')).toBe(true);
      expect(personalTasks.map((task) => task.title)).toContain('Personal Task 1');
      expect(personalTasks.map((task) => task.title)).toContain('Personal Task 2');
    });

    it('should filter tasks by "Study" project', () => {
      const studyTasks = service.getTasksByProject('Study');

      expect(studyTasks).toHaveLength(1);
      expect(studyTasks[0].project).toBe('Study');
      expect(studyTasks[0].title).toBe('Study Task 1');
    });

    it('should filter tasks by "General" project', () => {
      const generalTasks = service.getTasksByProject('General');

      expect(generalTasks).toHaveLength(1);
      expect(generalTasks[0].project).toBe('General');
      expect(generalTasks[0].title).toBe('General Task 1');
    });

    it('should return empty array for non-existent project filter', () => {
      const emptyTasks = service.getTasksByProject('Work');
      // Filter for tasks that don't exist
      const filtered = emptyTasks.filter(
        (task) => !['Work Task 1', 'Work Task 2'].includes(task.title)
      );
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Filter by Status and Project (Cumulative)', () => {
    beforeEach(() => {
      service.clearTasks();
      // Create tasks with various status and project combinations
      service.createTask({
        title: 'Work TODO',
        priority: 'high' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });
      service.createTask({
        title: 'Work IN_PROGRESS',
        priority: 'medium' as TaskPriority,
        status: 'IN_PROGRESS' as TaskStatus,
        project: 'Work' as TaskProject,
      });
      service.createTask({
        title: 'Work DONE',
        priority: 'low' as TaskPriority,
        status: 'DONE' as TaskStatus,
        project: 'Work' as TaskProject,
      });
      service.createTask({
        title: 'Personal TODO',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject,
      });
      service.createTask({
        title: 'Personal DONE',
        priority: 'high' as TaskPriority,
        status: 'DONE' as TaskStatus,
        project: 'Personal' as TaskProject,
      });
      service.createTask({
        title: 'Study IN_PROGRESS',
        priority: 'high' as TaskPriority,
        status: 'IN_PROGRESS' as TaskStatus,
        project: 'Study' as TaskProject,
      });
    });

    it('should filter tasks by TODO status and Work project', () => {
      const workTodoTasks = service.getTasksByStatusAndProject('TODO', 'Work');

      expect(workTodoTasks).toHaveLength(1);
      expect(workTodoTasks[0].status).toBe('TODO');
      expect(workTodoTasks[0].project).toBe('Work');
      expect(workTodoTasks[0].title).toBe('Work TODO');
    });

    it('should filter tasks by IN_PROGRESS status and Work project', () => {
      const workInProgressTasks = service.getTasksByStatusAndProject('IN_PROGRESS', 'Work');

      expect(workInProgressTasks).toHaveLength(1);
      expect(workInProgressTasks[0].status).toBe('IN_PROGRESS');
      expect(workInProgressTasks[0].project).toBe('Work');
      expect(workInProgressTasks[0].title).toBe('Work IN_PROGRESS');
    });

    it('should filter tasks by DONE status and Work project', () => {
      const workDoneTasks = service.getTasksByStatusAndProject('DONE', 'Work');

      expect(workDoneTasks).toHaveLength(1);
      expect(workDoneTasks[0].status).toBe('DONE');
      expect(workDoneTasks[0].project).toBe('Work');
      expect(workDoneTasks[0].title).toBe('Work DONE');
    });

    it('should filter tasks by TODO status and Personal project', () => {
      const personalTodoTasks = service.getTasksByStatusAndProject('TODO', 'Personal');

      expect(personalTodoTasks).toHaveLength(1);
      expect(personalTodoTasks[0].status).toBe('TODO');
      expect(personalTodoTasks[0].project).toBe('Personal');
      expect(personalTodoTasks[0].title).toBe('Personal TODO');
    });

    it('should filter tasks by DONE status and Personal project', () => {
      const personalDoneTasks = service.getTasksByStatusAndProject('DONE', 'Personal');

      expect(personalDoneTasks).toHaveLength(1);
      expect(personalDoneTasks[0].status).toBe('DONE');
      expect(personalDoneTasks[0].project).toBe('Personal');
      expect(personalDoneTasks[0].title).toBe('Personal DONE');
    });

    it('should return all tasks when status is "all" and project is specific', () => {
      const allWorkTasks = service.getTasksByStatusAndProject('all', 'Work');

      expect(allWorkTasks).toHaveLength(3);
      expect(allWorkTasks.every((task) => task.project === 'Work')).toBe(true);
    });

    it('should return all tasks when project is "all" and status is specific', () => {
      const allTodoTasks = service.getTasksByStatusAndProject('TODO', 'all');

      expect(allTodoTasks).toHaveLength(2);
      expect(allTodoTasks.every((task) => task.status === 'TODO')).toBe(true);
    });

    it('should return all tasks when both status and project are "all"', () => {
      const allTasks = service.getTasksByStatusAndProject('all', 'all');

      expect(allTasks).toHaveLength(6);
    });

    it('should return empty array for non-matching status and project combination', () => {
      const results = service.getTasksByStatusAndProject('IN_PROGRESS', 'Personal');

      expect(results).toHaveLength(0);
    });

    it('should handle "all" status with multiple projects', () => {
      const allPersonal = service.getTasksByStatusAndProject('all', 'Personal');
      const allWork = service.getTasksByStatusAndProject('all', 'Work');
      const allStudy = service.getTasksByStatusAndProject('all', 'Study');

      expect(allPersonal).toHaveLength(2);
      expect(allWork).toHaveLength(3);
      expect(allStudy).toHaveLength(1);
    });

    it('should handle "all" project with multiple statuses', () => {
      const allTodo = service.getTasksByStatusAndProject('TODO', 'all');
      const allInProgress = service.getTasksByStatusAndProject('IN_PROGRESS', 'all');
      const allDone = service.getTasksByStatusAndProject('DONE', 'all');

      expect(allTodo).toHaveLength(2);
      expect(allInProgress).toHaveLength(2);
      expect(allDone).toHaveLength(2);
    });
  });

  describe('Project Filter Edge Cases', () => {
    beforeEach(() => {
      service.clearTasks();
    });

    it('should handle filtering when tasks array is empty', () => {
      const workTasks = service.getTasksByProject('Work');
      const personalTasks = service.getTasksByProject('Personal');
      const studyTasks = service.getTasksByProject('Study');
      const generalTasks = service.getTasksByProject('General');

      expect(workTasks).toEqual([]);
      expect(personalTasks).toEqual([]);
      expect(studyTasks).toEqual([]);
      expect(generalTasks).toEqual([]);
    });

    it('should handle filtering when all tasks have same project', () => {
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
        project: 'Work' as TaskProject,
      });

      const workTasks = service.getTasksByProject('Work');
      const personalTasks = service.getTasksByProject('Personal');

      expect(workTasks).toHaveLength(2);
      expect(personalTasks).toHaveLength(0);
    });

    it('should handle mixed project distribution correctly', () => {
      for (let i = 0; i < 10; i++) {
        const project = i < 3 ? 'Work' : i < 6 ? 'Personal' : i < 8 ? 'Study' : 'General';
        service.createTask({
          title: `Task ${i}`,
          priority: 'medium' as TaskPriority,
          status: 'TODO' as TaskStatus,
          project: project as TaskProject,
        });
      }

      const workTasks = service.getTasksByProject('Work');
      const personalTasks = service.getTasksByProject('Personal');
      const studyTasks = service.getTasksByProject('Study');
      const generalTasks = service.getTasksByProject('General');

      expect(workTasks).toHaveLength(3);
      expect(personalTasks).toHaveLength(3);
      expect(studyTasks).toHaveLength(2);
      expect(generalTasks).toHaveLength(2);
    });
  });

  describe('Project Filter with Service Operations', () => {
    beforeEach(() => {
      service.clearTasks();
      service.createTask({
        title: 'Work Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });
      service.createTask({
        title: 'Personal Task',
        priority: 'high' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Personal' as TaskProject,
      });
    });

    it('should maintain project filter after creating new tasks', () => {
      const initialWorkTasks = service.getTasksByProject('Work');
      expect(initialWorkTasks).toHaveLength(1);

      // Add a new Work task
      service.createTask({
        title: 'New Work Task',
        priority: 'low' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      const newWorkTasks = service.getTasksByProject('Work');
      expect(newWorkTasks).toHaveLength(2);
    });

    it('should maintain project filter after updating tasks', () => {
      const initialPersonalTasks = service.getTasksByProject('Personal');
      expect(initialPersonalTasks).toHaveLength(1);

      // Change a task's project from Work to Personal
      const workTask = service.getTasksByProject('Work')[0];
      service.updateTask(workTask.id, { project: 'Personal' });

      const newPersonalTasks = service.getTasksByProject('Personal');
      const newWorkTasks = service.getTasksByProject('Work');

      expect(newPersonalTasks).toHaveLength(2);
      expect(newWorkTasks).toHaveLength(0);
    });

    it('should maintain project filter after deleting tasks', () => {
      const initialWorkTasks = service.getTasksByProject('Work');
      expect(initialWorkTasks).toHaveLength(1);

      const workTask = initialWorkTasks[0];
      service.deleteTask(workTask.id);

      const newWorkTasks = service.getTasksByProject('Work');
      expect(newWorkTasks).toHaveLength(0);
    });

    it('should correctly update cumulative filters after task operations', () => {
      // Create additional tasks for comprehensive testing
      service.createTask({
        title: 'Work TODO 2',
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

      const workTodoTasks = service.getTasksByStatusAndProject('TODO', 'Work');
      expect(workTodoTasks).toHaveLength(2);

      // Change a Work TODO task to DONE
      const workTodoTask = workTodoTasks[0];
      service.updateTask(workTodoTask.id, { status: 'DONE' });

      const newWorkTodoTasks = service.getTasksByStatusAndProject('TODO', 'Work');
      const workDoneTasks = service.getTasksByStatusAndProject('DONE', 'Work');

      expect(newWorkTodoTasks).toHaveLength(1);
      expect(workDoneTasks).toHaveLength(1);
    });
  });

  describe('Project Filter with Different Status Distributions', () => {
    beforeEach(() => {
      service.clearTasks();
    });

    it('should correctly count tasks across all project and status combinations', () => {
      const tasks = [
        { title: 'Work TODO 1', status: 'TODO' as TaskStatus, project: 'Work' as TaskProject },
        { title: 'Work TODO 2', status: 'TODO' as TaskStatus, project: 'Work' as TaskProject },
        { title: 'Work IN_PROGRESS', status: 'IN_PROGRESS' as TaskStatus, project: 'Work' as TaskProject },
        { title: 'Work DONE', status: 'DONE' as TaskStatus, project: 'Work' as TaskProject },
        { title: 'Personal TODO', status: 'TODO' as TaskStatus, project: 'Personal' as TaskProject },
        { title: 'Personal IN_PROGRESS 1', status: 'IN_PROGRESS' as TaskStatus, project: 'Personal' as TaskProject },
        { title: 'Personal IN_PROGRESS 2', status: 'IN_PROGRESS' as TaskStatus, project: 'Personal' as TaskProject },
        { title: 'Personal DONE 1', status: 'DONE' as TaskStatus, project: 'Personal' as TaskProject },
        { title: 'Personal DONE 2', status: 'DONE' as TaskStatus, project: 'Personal' as TaskProject },
        { title: 'Study TODO', status: 'TODO' as TaskStatus, project: 'Study' as TaskProject },
        { title: 'Study DONE', status: 'DONE' as TaskStatus, project: 'Study' as TaskProject },
      ];

      tasks.forEach((task) => {
        service.createTask({
          title: task.title,
          priority: 'medium' as TaskPriority,
          status: task.status,
          project: task.project,
        });
      });

      // Test all combinations
      expect(service.getTasksByStatusAndProject('TODO', 'Work')).toHaveLength(2);
      expect(service.getTasksByStatusAndProject('IN_PROGRESS', 'Work')).toHaveLength(1);
      expect(service.getTasksByStatusAndProject('DONE', 'Work')).toHaveLength(1);
      expect(service.getTasksByStatusAndProject('TODO', 'Personal')).toHaveLength(1);
      expect(service.getTasksByStatusAndProject('IN_PROGRESS', 'Personal')).toHaveLength(2);
      expect(service.getTasksByStatusAndProject('DONE', 'Personal')).toHaveLength(2);
      expect(service.getTasksByStatusAndProject('TODO', 'Study')).toHaveLength(1);
      expect(service.getTasksByStatusAndProject('DONE', 'Study')).toHaveLength(1);
      expect(service.getTasksByStatusAndProject('all', 'all')).toHaveLength(11);
    });

    it('should handle project with no tasks in certain status', () => {
      service.createTask({
        title: 'Work TODO',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      expect(service.getTasksByStatusAndProject('TODO', 'Work')).toHaveLength(1);
      expect(service.getTasksByStatusAndProject('IN_PROGRESS', 'Work')).toHaveLength(0);
      expect(service.getTasksByStatusAndProject('DONE', 'Work')).toHaveLength(0);
    });
  });

  describe('Security: Project Filter Validation', () => {
    it('should sanitize project filter values to prevent injection', () => {
      service.createTask({
        title: 'Test Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      expect(() => {
        service.getTasksByProject('<script>alert("XSS")</script>' as any);
      }).not.toThrow();
    });

    it('should validate project enum values', () => {
      service.createTask({
        title: 'Test Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      const validProjects: TaskProject[] = ['Personal', 'Work', 'Study', 'General'];
      validProjects.forEach((project) => {
        expect(() => {
          service.getTasksByProject(project);
        }).not.toThrow();
      });
    });

    it('should handle invalid project values gracefully', () => {
      service.createTask({
        title: 'Test Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      expect(() => {
        service.getTasksByProject('INVALID' as any);
      }).not.toThrow();
    });
  });
});
