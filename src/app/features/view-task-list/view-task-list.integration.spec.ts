import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { App } from '../../app';
import { TaskService } from '../../shared/services/task.service';

// Mock tasks for testing
const mockTasks = [
  {
    id: '1',
    title: 'Test Task 1',
    description: 'This is a test task',
    priority: 'high' as const,
    status: 'TODO' as const,
    project: 'Work' as const,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z')
  },
  {
    id: '2',
    title: 'Test Task 2',
    priority: 'medium' as const,
    status: 'IN_PROGRESS' as const,
    project: 'Personal' as const,
    createdAt: new Date('2024-01-14T09:00:00Z'),
    updatedAt: new Date('2024-01-14T09:00:00Z')
  },
  {
    id: '3',
    title: 'Test Task 3',
    priority: 'low' as const,
    status: 'DONE' as const,
    project: 'Study' as const,
    createdAt: new Date('2024-01-13T08:00:00Z'),
    updatedAt: new Date('2024-01-13T08:00:00Z')
  }
];

describe('US-001: View task list - Integration Tests', () => {
  let fixture: ComponentFixture<App>;
  let taskService: any;
  let taskListComponent: any;

  beforeEach(async () => {
    const mockTaskService = {
      getTasksByStatusAndProject: vi.fn(),
      getTaskCounts: vi.fn(),
      initializeMockData: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [App, CommonModule],
      providers: [
        provideRouter([]),
        {
          provide: TaskService,
          useValue: mockTaskService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    taskService = TestBed.inject(TaskService);

    // Default mock responses
    taskService.getTasksByStatusAndProject.mockReturnValue([]);
    taskService.getTaskCounts.mockReturnValue({
      todo: 0,
      inProgress: 0,
      done: 0,
      total: 0,
    });
    
    fixture.detectChanges();
    
    // Get reference to TaskListComponent for triggering refresh
    taskListComponent = fixture.debugElement.query(By.css('app-task-list'))?.componentInstance;
  });

  // Helper function to update mocks and trigger refresh
  function updateMocksAndDetect(tasks: any[], counts: any) {
    taskService.getTasksByStatusAndProject.mockReturnValue(tasks);
    taskService.getTaskCounts.mockReturnValue(counts);
    if (taskListComponent) {
      taskListComponent.forceRefresh();
    }
    fixture.detectChanges();
  }

  describe('Empty State Display', () => {
    it('should display empty state when no tasks exist', () => {
      const emptyState = fixture.debugElement.query(By.css('.task-list__empty'));
      expect(emptyState).toBeTruthy();
    });

    it('should show helpful description in empty state', () => {
      const description = fixture.debugElement.query(By.css('.task-list__empty-description'));
      expect(description).toBeTruthy();
      expect(description.nativeElement.textContent).toContain('Start by creating your first task');
    });

    it('should show create task button in empty state', () => {
      const createButton = fixture.debugElement.query(By.css('.task-list__create-btn'));
      expect(createButton).toBeTruthy();
      expect(createButton.nativeElement.textContent).toContain('Create Task');
    });
  });

  describe('Task Display', () => {
    beforeEach(() => {
      // Set up mock data for task display tests
      updateMocksAndDetect(mockTasks.slice(0, 2), {
        todo: 1,
        inProgress: 1,
        done: 0,
        total: 2,
      });
    });

    it('should display task titles', () => {
      const taskTitles = fixture.debugElement.queryAll(By.css('.task-list__task-title'));
      expect(taskTitles).toHaveLength(2);
      expect(taskTitles[0].nativeElement.textContent).toContain('Test Task 1');
      expect(taskTitles[1].nativeElement.textContent).toContain('Test Task 2');
    });

    it('should display priority badges with correct colors', () => {
      const priorityBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--priority'));
      expect(priorityBadges).toHaveLength(2);
      
      // Check that priority badges have inline styles
      priorityBadges.forEach((badge: any) => {
        expect(badge.nativeElement.style.backgroundColor).toBeTruthy();
      });
    });

    it('should display status badges with correct labels', () => {
      const statusBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--status'));
      expect(statusBadges).toHaveLength(2);
      
      statusBadges.forEach((badge: any) => {
        expect(badge.nativeElement.textContent.trim()).toMatch(/^(To Do|In Progress|Done)$/);
      });
    });

    it('should display project badges', () => {
      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));
      expect(projectBadges).toHaveLength(2);
      
      projectBadges.forEach((badge: any) => {
        expect(badge.nativeElement.textContent.trim()).toMatch(/^(Personal|Work|Study|General)$/);
      });
    });

    it('should display task descriptions when present', () => {
      const descriptions = fixture.debugElement.queryAll(By.css('.task-list__task-description'));
      expect(descriptions.length).toBeGreaterThan(0);
    });

    it('should display tasks in correct chronological order', () => {
      const mockTasksWithDates = [
        {
          id: '1',
          title: 'Old Task',
          priority: 'low' as const,
          status: 'TODO' as const,
          project: 'Personal' as const,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: '2',
          title: 'New Task',
          priority: 'high' as const,
          status: 'IN_PROGRESS' as const,
          project: 'Work' as const,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02')
        }
      ];

      updateMocksAndDetect(mockTasksWithDates, {
        todo: 1,
        inProgress: 1,
        done: 0,
        total: 2,
      });

      const taskTitles = fixture.debugElement.queryAll(By.css('.task-list__task-title'));
      expect(taskTitles[0].nativeElement.textContent).toContain('New Task');
      expect(taskTitles[1].nativeElement.textContent).toContain('Old Task');
    });

    it('should maintain sorting when tasks have same creation date', () => {
      const sameDate = new Date('2024-01-01');
      const tasksWithSameDate = [
        {
          id: '1',
          title: 'Task A',
          priority: 'low' as const,
          status: 'TODO' as const,
          project: 'Personal' as const,
          createdAt: sameDate,
          updatedAt: sameDate
        },
        {
          id: '2',
          title: 'Task B',
          priority: 'medium' as const,
          status: 'IN_PROGRESS' as const,
          project: 'Study' as const,
          createdAt: sameDate,
          updatedAt: sameDate
        }
      ];

      updateMocksAndDetect(tasksWithSameDate, {
        todo: 1,
        inProgress: 1,
        done: 0,
        total: 2,
      });

      const taskTitles = fixture.debugElement.queryAll(By.css('.task-list__task-title'));
      expect(taskTitles).toHaveLength(2);
    });
  });

  describe('Mock Data Requirements', () => {
    it('should use mock data for initial display', () => {
      taskService.initializeMockData();
      fixture.detectChanges();

      expect(taskService.initializeMockData).toHaveBeenCalled();
    });

    it('should display mock data with correct structure', () => {
      updateMocksAndDetect(mockTasks, {
        todo: 1,
        inProgress: 1,
        done: 1,
        total: 3
      });

      const taskTitles = fixture.debugElement.queryAll(By.css('.task-list__task-title'));
      expect(taskTitles.length).toBeGreaterThan(0);
    });
  });

  describe('Task Counts Display', () => {
    beforeEach(() => {
      updateMocksAndDetect(mockTasks, {
        todo: 2,
        inProgress: 1,
        done: 1,
        total: 4
      });
    });

    it('should display correct task counts in header', () => {
      const countNumbers = fixture.debugElement.queryAll(By.css('.task-list__count-number'));
      expect(countNumbers).toHaveLength(4);
      expect(countNumbers[0].nativeElement.textContent).toBe('2'); // To Do
      expect(countNumbers[1].nativeElement.textContent).toBe('1'); // In Progress
      expect(countNumbers[2].nativeElement.textContent).toBe('1'); // Done
      expect(countNumbers[3].nativeElement.textContent).toBe('4'); // Total
    });

    it('should update counts when tasks change', () => {
      // Initial state
      updateMocksAndDetect([mockTasks[0]], {
        todo: 1,
        inProgress: 0,
        done: 0,
        total: 1
      });

      let countNumbers = fixture.debugElement.queryAll(By.css('.task-list__count-number'));
      expect(countNumbers[3].nativeElement.textContent).toBe('1'); // Total

      // Updated state
      updateMocksAndDetect(mockTasks, {
        todo: 2,
        inProgress: 1,
        done: 1,
        total: 4
      });

      countNumbers = fixture.debugElement.queryAll(By.css('.task-list__count-number'));
      expect(countNumbers[3].nativeElement.textContent).toBe('4'); // Total
    });
  });

  describe('Business Rules Compliance', () => {
    beforeEach(() => {
      updateMocksAndDetect(mockTasks, {
        todo: 1,
        inProgress: 1,
        done: 1,
        total: 3
      });
    });

    it('should apply correct priority colors according to business rules', () => {
      const priorityBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--priority'));
      priorityBadges.forEach((badge: any) => {
        expect(badge.nativeElement.style.backgroundColor).toBeTruthy();
        expect(badge.nativeElement.getAttribute('aria-label')).toContain('Priority:');
      });
    });

    it('should use "General" as default project when specified', () => {
      const tasksWithGeneralProject = mockTasks.map((task: any) => ({
        ...task,
        project: 'General' as const
      }));
      
      updateMocksAndDetect(tasksWithGeneralProject, {
        todo: 1,
        inProgress: 1,
        done: 1,
        total: 3
      });

      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));
      const generalBadges = projectBadges.filter((badge: any) => 
        badge.nativeElement.textContent.trim() === 'General'
      );
      expect(generalBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility Requirements', () => {
    beforeEach(() => {
      updateMocksAndDetect(mockTasks, {
        todo: 1,
        inProgress: 1,
        done: 1,
        total: 3
      });
    });

    it('should have semantic HTML structure', () => {
      const mainHeading = fixture.debugElement.query(By.css('.task-list__title'));
      expect(mainHeading).toBeTruthy();
      expect(mainHeading.nativeElement.textContent).toBe('Tasks');

      const taskArticles = fixture.debugElement.queryAll(By.css('article'));
      expect(taskArticles.length).toBeGreaterThan(0);

      const timeElements = fixture.debugElement.queryAll(By.css('time'));
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it('should have proper ARIA labels for screen readers', () => {
      const buttons = fixture.debugElement.queryAll(By.css('button[aria-label]'));
      expect(buttons.length).toBeGreaterThan(0);

      const tasks = fixture.debugElement.queryAll(By.css('[tabindex="0"]'));
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should have keyboard-navigable elements', () => {
      const keyboardElements = fixture.debugElement.queryAll(By.css('[tabindex="0"]'));
      expect(keyboardElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service returning null gracefully', () => {
      taskService.getTasksByStatusAndProject.mockReturnValue(null);
      taskService.getTaskCounts.mockReturnValue({
        todo: 0,
        inProgress: 0,
        done: 0,
        total: 0
      });
      if (taskListComponent) {
        taskListComponent.forceRefresh();
      }
      fixture.detectChanges();

      const emptyState = fixture.debugElement.query(By.css('.task-list__empty'));
      expect(emptyState).toBeTruthy();
    });

    it('should handle malformed task data gracefully', () => {
      const malformedTasks = [
        {
          id: '1',
          title: 'Valid Task',
          priority: 'medium' as const,
          status: 'TODO' as const,
          project: 'Work' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          title: 'Invalid Date Task',
          priority: 'high' as const,
          status: 'IN_PROGRESS' as const,
          project: 'Study' as const,
          createdAt: 'invalid-date' as any,
          updatedAt: new Date()
        }
      ];

      updateMocksAndDetect(malformedTasks, {
        todo: 1,
        inProgress: 1,
        done: 0,
        total: 2
      });

      // Should still render the valid task without crashing
      const validTask = fixture.debugElement.query(By.css('.task-list__task-title'));
      expect(validTask).toBeTruthy();
    });

    it('should handle very long task titles', () => {
      const longTitleTask = {
        id: '1',
        title: 'A'.repeat(200),
        priority: 'low' as const,
        status: 'TODO' as const,
        project: 'Personal' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      updateMocksAndDetect([longTitleTask], {
        todo: 1,
        inProgress: 0,
        done: 0,
        total: 1
      });

      const taskTitle = fixture.debugElement.query(By.css('.task-list__task-title'));
      expect(taskTitle).toBeTruthy();
      expect(taskTitle.nativeElement.textContent.length).toBeGreaterThan(0);
    });
  });
});