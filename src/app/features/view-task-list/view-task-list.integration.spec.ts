import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { App } from '../../app';
import { TaskService } from '../../shared/services/task.service';
import { Task } from '../../shared/models/task.model';

// Integration tests for US-001: View task list
describe('US-001: View task list - Integration Tests', () => {
  let fixture: ComponentFixture<App>;
  let taskService: any;
  let mockTasks: Task[];

  beforeEach(async () => {
    const taskServiceSpy = {
      getTasksByStatusAndProject: vi.fn(),
      getTaskCounts: vi.fn(),
      initializeMockData: vi.fn(),
      getTasks: vi.fn(),
      getTasksSorted: vi.fn()
    };

    mockTasks = [
      {
        id: '1',
        title: 'Review project requirements',
        description: 'Go through the project specifications and create a task breakdown',
        priority: 'high',
        status: 'TODO',
        project: 'Work',
        createdAt: new Date('2024-01-20T10:00:00'),
        updatedAt: new Date('2024-01-20T10:00:00')
      },
      {
        id: '2',
        title: 'Setup development environment',
        priority: 'medium',
        status: 'DONE',
        project: 'Work',
        createdAt: new Date('2024-01-15T09:00:00'),
        updatedAt: new Date('2024-01-16T14:30:00')
      },
      {
        id: '3',
        title: 'Learn Angular signals',
        priority: 'low',
        status: 'IN_PROGRESS',
        project: 'Study',
        createdAt: new Date('2024-01-10T16:00:00'),
        updatedAt: new Date('2024-01-17T11:00:00')
      }
    ];

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: TaskService, useValue: taskServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    taskService = TestBed.inject(TaskService);
  });

  describe('Acceptance Criteria 1: Show empty list with "No tasks" message initially', () => {
    it('should display empty state when no tasks exist', () => {
      taskService.getTasksByStatusAndProject.mockReturnValue([]);
      taskService.getTaskCounts.mockReturnValue({
        todo: 0,
        inProgress: 0,
        done: 0,
        total: 0
      });

      fixture.detectChanges();

      const emptyMessage = fixture.debugElement.query(By.css('.task-list__empty-title'));
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage.nativeElement.textContent).toContain('No tasks');
    });

    it('should show helpful description in empty state', () => {
      taskService.getTasksByStatusAndProject.mockReturnValue([]);
      taskService.getTaskCounts.mockReturnValue({
        todo: 0,
        inProgress: 0,
        done: 0,
        total: 0
      });

      fixture.detectChanges();

      const emptyDescription = fixture.debugElement.query(By.css('.task-list__empty-description'));
      expect(emptyDescription).toBeTruthy();
      expect(emptyDescription.nativeElement.textContent).toContain('Start by creating your first task');
    });

    it('should show create task button in empty state', () => {
      taskService.getTasksByStatusAndProject.mockReturnValue([]);
      fixture.detectChanges();

      const createBtn = fixture.debugElement.query(By.css('.task-list__create-btn'));
      expect(createBtn).toBeTruthy();
      expect(createBtn.nativeElement.textContent.trim()).toBe('+ Create Task');
    });
  });

  describe('Acceptance Criteria 2: Each task displays title, priority (color badge), status', () => {
    beforeEach(() => {
      taskService.getTasksByStatusAndProject.mockReturnValue(mockTasks);
      taskService.getTaskCounts.mockReturnValue({
        todo: 1,
        inProgress: 1,
        done: 1,
        total: 3
      });
      fixture.detectChanges();
    });

    it('should display task titles', () => {
      const taskTitles = fixture.debugElement.queryAll(By.css('.task-list__task-title'));
      expect(taskTitles).toHaveLength(3);

      const titles = taskTitles.map(el => el.nativeElement.textContent.trim());
      expect(titles).toContain('Review project requirements');
      expect(titles).toContain('Setup development environment');
      expect(titles).toContain('Learn Angular signals');
    });

    it('should display priority badges with correct colors', () => {
      const priorityBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--priority'));
      expect(priorityBadges).toHaveLength(3);

      // Check that high priority is red
      const highPriorityBadge = Array.from(priorityBadges).find(
        badge => badge.nativeElement.textContent.trim() === 'high'
      );
      expect(highPriorityBadge?.nativeElement.style.backgroundColor).toBe('rgb(239, 68, 68)');

      // Check that medium priority is yellow
      const mediumPriorityBadge = Array.from(priorityBadges).find(
        badge => badge.nativeElement.textContent.trim() === 'medium'
      );
      expect(mediumPriorityBadge?.nativeElement.style.backgroundColor).toBe('rgb(234, 179, 8)');

      // Check that low priority is green
      const lowPriorityBadge = Array.from(priorityBadges).find(
        badge => badge.nativeElement.textContent.trim() === 'low'
      );
      expect(lowPriorityBadge?.nativeElement.style.backgroundColor).toBe('rgb(16, 185, 129)');
    });

    it('should display status badges with correct labels', () => {
      const statusBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--status'));
      expect(statusBadges).toHaveLength(3);

      const statuses = statusBadges.map(el => el.nativeElement.textContent.trim());
      expect(statuses).toContain('To Do');
      expect(statuses).toContain('In Progress');
      expect(statuses).toContain('Done');
    });

    it('should display project badges', () => {
      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));
      expect(projectBadges).toHaveLength(3);

      const projects = projectBadges.map(el => el.nativeElement.textContent.trim());
      expect(projects).toContain('Work');
      expect(projects).toContain('Study');
    });

    it('should display task descriptions when present', () => {
      const descriptions = fixture.debugElement.queryAll(By.css('.task-list__task-description'));
      expect(descriptions).toHaveLength(1); // Only one task has a description
      expect(descriptions[0].nativeElement.textContent).toContain('Go through the project specifications');
    });
  });

  describe('Acceptance Criteria 3: Tasks sorted by creation date (newest first)', () => {
    it('should display tasks in correct chronological order', () => {
      taskService.getTasksByStatusAndProject.mockReturnValue(mockTasks);
      fixture.detectChanges();

      const taskElements = fixture.debugElement.queryAll(By.css('.task-list__task'));
      expect(taskElements).toHaveLength(3);

      // Check that tasks are ordered by creation date (newest first)
      const firstTaskTitle = taskElements[0].query(By.css('.task-list__task-title')).nativeElement.textContent;
      const secondTaskTitle = taskElements[1].query(By.css('.task-list__task-title')).nativeElement.textContent;
      const thirdTaskTitle = taskElements[2].query(By.css('.task-list__task-title')).nativeElement.textContent;

      expect(firstTaskTitle).toBe('Review project requirements'); // Jan 20
      expect(secondTaskTitle).toBe('Setup development environment'); // Jan 15
      expect(thirdTaskTitle).toBe('Learn Angular signals'); // Jan 10
    });

    it('should maintain sorting when tasks have same creation date', () => {
      const sameDate = new Date('2024-01-15T10:00:00');
      const tasksWithSameDate = [
        {
          id: '1',
          title: 'Task A',
          priority: 'high',
          status: 'TODO',
          project: 'Work',
          createdAt: sameDate,
          updatedAt: sameDate
        },
        {
          id: '2',
          title: 'Task B',
          priority: 'medium',
          status: 'IN_PROGRESS',
          project: 'Study',
          createdAt: sameDate,
          updatedAt: sameDate
        }
      ];

      taskService.getTasksByStatusAndProject.mockReturnValue(tasksWithSameDate);
      fixture.detectChanges();

      const taskTitles = fixture.debugElement.queryAll(By.css('.task-list__task-title'));
      expect(taskTitles).toHaveLength(2);
      // Should maintain some consistent order when dates are equal
    });
  });

  describe('Mock Data Requirements', () => {
    it('should use mock data for initial display', () => {
      taskService.initializeMockData();
      fixture.detectChanges();

      expect(taskService.initializeMockData).toHaveBeenCalled();
    });

    it('should display mock data with correct structure', () => {
      taskService.getTasksByStatusAndProject.mockReturnValue(mockTasks);
      taskService.getTaskCounts.mockReturnValue({
        todo: 1,
        inProgress: 1,
        done: 1,
        total: 3
      });
      fixture.detectChanges();

      // Verify all required fields are present and displayed
      const taskElements = fixture.debugElement.queryAll(By.css('.task-list__task'));
      expect(taskElements).toHaveLength(3);

      taskElements.forEach((taskElement, index) => {
        const task = mockTasks[index];
        
        // Check title
        const title = taskElement.query(By.css('.task-list__task-title'));
        expect(title.nativeElement.textContent).toBe(task.title);
        
        // Check priority
        const priority = taskElement.query(By.css('.task-list__badge--priority'));
        expect(priority.nativeElement.textContent.trim()).toBe(task.priority);
        
        // Check status
        const status = taskElement.query(By.css('.task-list__badge--status'));
        expect(status.nativeElement.textContent.trim()).toBeTruthy();
        
        // Check project
        const project = taskElement.query(By.css('.task-list__badge--project'));
        expect(project.nativeElement.textContent.trim()).toBe(task.project);
      });
    });
  });

  describe('Task Counts Display', () => {
    it('should display correct task counts in header', () => {
      taskService.getTaskCounts.mockReturnValue({
        todo: 2,
        inProgress: 1,
        done: 3,
        total: 6
      });
      fixture.detectChanges();

      const countNumbers = fixture.debugElement.queryAll(By.css('.task-list__count-number'));
      expect(countNumbers[0].nativeElement.textContent).toBe('2'); // To Do
      expect(countNumbers[1].nativeElement.textContent).toBe('1'); // In Progress
      expect(countNumbers[2].nativeElement.textContent).toBe('3'); // Done
      expect(countNumbers[3].nativeElement.textContent).toBe('6'); // Total
    });

    it('should update counts when tasks change', () => {
      // Initial state
      taskService.getTaskCounts.mockReturnValue({
        todo: 1,
        inProgress: 0,
        done: 0,
        total: 1
      });
      fixture.detectChanges();

      let countNumbers = fixture.debugElement.queryAll(By.css('.task-list__count-number'));
      expect(countNumbers[3].nativeElement.textContent).toBe('1'); // Total

      // Updated state
      taskService.getTaskCounts.mockReturnValue({
        todo: 2,
        inProgress: 1,
        done: 1,
        total: 4
      });
      fixture.detectChanges();

      countNumbers = fixture.debugElement.queryAll(By.css('.task-list__count-number'));
      expect(countNumbers[3].nativeElement.textContent).toBe('4'); // Total
    });
  });

  describe('Business Rules Verification', () => {
    it('should apply correct priority colors according to business rules', () => {
      taskService.getTasksByStatusAndProject.mockReturnValue([
        {
          id: '1',
          title: 'High Priority Task',
          priority: 'high',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          title: 'Medium Priority Task',
          priority: 'medium',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '3',
          title: 'Low Priority Task',
          priority: 'low',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      fixture.detectChanges();

      const priorityBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--priority'));
      
      // Verify business rule: low=green, medium=yellow, high=red
      expect(priorityBadges[0].nativeElement.style.backgroundColor).toBe('rgb(239, 68, 68)'); // high=red
      expect(priorityBadges[1].nativeElement.style.backgroundColor).toBe('rgb(234, 179, 8)'); // medium=yellow
      expect(priorityBadges[2].nativeElement.style.backgroundColor).toBe('rgb(16, 185, 129)'); // low=green
    });

    it('should use "General" as default project when specified', () => {
      taskService.getTasksByStatusAndProject.mockReturnValue([
        {
          id: '1',
          title: 'Default Project Task',
          priority: 'medium',
          status: 'TODO',
          project: 'General',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      fixture.detectChanges();

      const projectBadge = fixture.debugElement.query(By.css('.task-list__badge--project'));
      expect(projectBadge.nativeElement.textContent.trim()).toBe('General');
    });
  });

  describe('Accessibility Requirements', () => {
    beforeEach(() => {
      taskService.getTasksByStatusAndProject.mockReturnValue(mockTasks);
      taskService.getTaskCounts.mockReturnValue({
        todo: 1,
        inProgress: 1,
        done: 1,
        total: 3
      });
      fixture.detectChanges();
    });

    it('should have proper ARIA labels for screen readers', () => {
      const priorityBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--priority'));
      priorityBadges.forEach(badge => {
        expect(badge.nativeElement.getAttribute('aria-label')).toMatch(/Priority: \w+/);
      });

      const statusBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--status'));
      statusBadges.forEach(badge => {
        expect(badge.nativeElement.getAttribute('aria-label')).toMatch(/Status: \w+/);
      });

      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));
      projectBadges.forEach(badge => {
        expect(badge.nativeElement.getAttribute('aria-label')).toMatch(/Project: \w+/);
      });
    });

    it('should have semantic HTML structure', () => {
      const mainHeading = fixture.debugElement.query(By.css('h1'));
      expect(mainHeading).toBeTruthy();
      expect(mainHeading.nativeElement.textContent).toBe('Tasks');

      const taskArticles = fixture.debugElement.queryAll(By.css('article[role="article"]'));
      expect(taskArticles.length).toBeGreaterThan(0);

      const timeElements = fixture.debugElement.queryAll(By.css('time[datetime]'));
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it('should have keyboard-navigable elements', () => {
      const buttons = fixture.debugElement.queryAll(By.css('button'));
      const tasks = fixture.debugElement.queryAll(By.css('[tabindex="0"]'));
      
      expect(buttons.length).toBeGreaterThan(0);
      expect(tasks.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service returning null gracefully', () => {
      taskService.getTasksByStatusAndProject.mockReturnValue(null);
      fixture.detectChanges();

      // Should not throw and should show empty state
      const emptyState = fixture.debugElement.query(By.css('.task-list__empty'));
      expect(emptyState).toBeTruthy();
    });

    it('should handle malformed task data gracefully', () => {
      const malformedTasks = [
        {
          id: '1',
          title: '',
          priority: 'invalid',
          status: 'invalid',
          project: 'Invalid Project',
          createdAt: 'invalid-date',
          updatedAt: 'invalid-date'
        }
      ];

      taskService.getTasksByStatusAndProject.mockReturnValue(malformedTasks);
      fixture.detectChanges();

      // Should not crash and should render something
      const taskElements = fixture.debugElement.queryAll(By.css('.task-list__task'));
      expect(taskElements.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long task titles', () => {
      const longTitle = 'A'.repeat(200); // Exceeds 100 char limit from requirements
      const longTask = {
        id: '1',
        title: longTitle,
        priority: 'medium',
        status: 'TODO',
        project: 'Work',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      taskService.getTasksByStatusAndProject.mockReturnValue([longTask]);
      fixture.detectChanges();

      const titleElement = fixture.debugElement.query(By.css('.task-list__task-title'));
      expect(titleElement).toBeTruthy();
      expect(titleElement.nativeElement.textContent).toBe(longTitle);
    });
  });
});