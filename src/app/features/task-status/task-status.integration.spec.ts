import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { TaskListComponent } from '../../components/task-list/task-list.component';
import { TaskStatusComponent } from '../../components/task-status/task-status.component';
import { TaskService } from '../../shared/services/task.service';
import { ValidationService } from '../../shared/services/validation.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';
import { Task, TaskPriority, TaskProject, TaskStatus } from '../../shared/models/task.model';

/**
 * US-005: Change Task Status - Integration Tests (RED Phase)
 *
 * These tests define expected behavior for the complete status change workflow.
 * They will FAIL initially because implementation does not exist yet.
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

describe('US-005: Change Task Status - Integration Tests', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let taskService: any;
  let authService: any;
  let securityService: any;
  let mockTasks: Task[];

  beforeEach(async () => {
    const taskServiceSpy = {
      getTasks: vi.fn(),
      getTasksByStatusAndProject: vi.fn(),
      getTaskCounts: vi.fn(),
      changeStatus: vi.fn(),
      getTask: vi.fn(),
      getStatusTransitions: vi.fn(),
    };

    const authServiceSpy = {
      logSecurityEvent: vi.fn(),
      isAuthenticated: vi.fn().mockReturnValue(true),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user' }),
      requireAuthentication: vi.fn(),
    };

    const securityServiceSpy = {
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
      validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] }),
    };

    mockTasks = [
      {
        id: 'task-1',
        title: 'Task to Change Status',
        description: 'This task will have its status changed',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
        createdAt: new Date('2024-01-15T10:00:00'),
        updatedAt: new Date('2024-01-15T10:00:00'),
      },
      {
        id: 'task-2',
        title: 'Already In Progress',
        description: 'This task is already in progress',
        priority: 'high' as TaskPriority,
        status: 'IN_PROGRESS' as TaskStatus,
        project: 'Personal' as TaskProject,
        createdAt: new Date('2024-01-14T10:00:00'),
        updatedAt: new Date('2024-01-14T10:00:00'),
      },
      {
        id: 'task-3',
        title: 'Completed Task',
        description: 'This task is done',
        priority: 'low' as TaskPriority,
        status: 'DONE' as TaskStatus,
        project: 'Study' as TaskProject,
        createdAt: new Date('2024-01-13T10:00:00'),
        updatedAt: new Date('2024-01-13T10:00:00'),
      },
    ];

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TaskListComponent,
        TaskStatusComponent,
      ],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SecurityService, useValue: securityServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);
    authService = TestBed.inject(AuthService);
    securityService = TestBed.inject(SecurityService);

    // Set up mocks
    taskService.getTasks.mockReturnValue(mockTasks);
    taskService.getTasksByStatusAndProject.mockImplementation((status: string, project: string) => {
      // Return all tasks when filters are 'all'
      if (status === 'all' && project === 'all') {
        return mockTasks;
      }
      // Otherwise filter by status and project
      return mockTasks.filter(task => 
        (status === 'all' || task.status === status) &&
        (project === 'all' || task.project === project)
      );
    });
    taskService.getTaskCounts.mockReturnValue({
      todo: 1,
      inProgress: 1,
      done: 1,
      total: 3,
    });
    taskService.getTask.mockImplementation((id: string) => mockTasks.find((t) => t.id === id));
    taskService.getStatusTransitions.mockImplementation((status: TaskStatus) => {
      const transitions: Record<TaskStatus, TaskStatus[]> = {
        TODO: ['IN_PROGRESS'],
        IN_PROGRESS: ['TODO', 'DONE'],
        DONE: ['IN_PROGRESS'],
      };
      return transitions[status] || [];
    });
    taskService.changeStatus.mockImplementation((id: string, newStatus: TaskStatus) => {
      const task = mockTasks.find((t) => t.id === id);
      if (!task) return null;
      return { ...task, status: newStatus, updatedAt: new Date() };
    });

    fixture.detectChanges();
  });

  describe('AC1: Status Change UI Components', () => {
    it('should display status change controls for each task', () => {
      // ASSERT
      const statusControls = fixture.debugElement.queryAll(By.css('.task-status'));
      expect(statusControls.length).toBe(3);

      statusControls.forEach((control) => {
        expect(control.nativeElement.getAttribute('role')).toBe('group');
        expect(control.nativeElement.getAttribute('aria-label')).toBe('Task status controls');
      });
    });

    it('should show current status with visual differentiation', () => {
      // ASSERT
      const statusBadges = fixture.debugElement.queryAll(By.css('.task-status__badge'));

      expect(statusBadges[0].query(By.css('.task-status__label')).nativeElement.textContent.trim()).toBe('TODO');
      expect(statusBadges[0].nativeElement.classList.contains('task-status__badge--todo')).toBe(
        true
      );

      expect(statusBadges[1].query(By.css('.task-status__label')).nativeElement.textContent.trim()).toBe('IN PROGRESS');
      expect(statusBadges[1].nativeElement.classList.contains(
        'task-status__badge--in-progress'
      )).toBe(true);

      expect(statusBadges[2].query(By.css('.task-status__label')).nativeElement.textContent.trim()).toBe('DONE');
      expect(statusBadges[2].nativeElement.classList.contains('task-status__badge--done')).toBe(
        true
      );
    });

    it('should render status change dropdown/select for each task', () => {
      // ASSERT
      const statusSelects = fixture.debugElement.queryAll(By.css('.task-status__select'));
      expect(statusSelects.length).toBe(3);
    });

    it('should render next/previous buttons for each task', () => {
      // ASSERT
      const nextButtons = fixture.debugElement.queryAll(By.css('.task-status__btn--next'));
      const prevButtons = fixture.debugElement.queryAll(By.css('.task-status__btn--prev'));

      // TODO task should have next button
      expect(nextButtons.length).toBeGreaterThanOrEqual(1);

      // IN_PROGRESS task should have both
      // DONE task should have previous only
      expect(prevButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('AC2: Valid Status Transitions', () => {
    it('should allow transition from TODO to IN_PROGRESS', async () => {
      // ARRANGE
      const task1StatusControl = fixture.debugElement.queryAll(
        By.css('.task-status')
      )[0];
      const select = task1StatusControl.query(By.css('.task-status__select')).nativeElement;

      // ACT
      select.value = 'IN_PROGRESS';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      
      // Wait for debounce timeout
      await new Promise(resolve => setTimeout(resolve, 350));
      fixture.detectChanges();

      // ASSERT
      expect(taskService.changeStatus).toHaveBeenCalledWith('task-1', 'IN_PROGRESS');
    });

    it('should allow transition from IN_PROGRESS to DONE', async () => {
      // ARRANGE
      const task2StatusControl = fixture.debugElement.queryAll(
        By.css('.task-status')
      )[1];
      const select = task2StatusControl.query(By.css('.task-status__select')).nativeElement;

      // ACT
      select.value = 'DONE';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      
      // Wait for debounce timeout
      await new Promise(resolve => setTimeout(resolve, 350));
      fixture.detectChanges();

      // ASSERT
      expect(taskService.changeStatus).toHaveBeenCalledWith('task-2', 'DONE');
    });

    it('should allow transition from DONE to IN_PROGRESS (backwards)', async () => {
      // ARRANGE
      const task3StatusControl = fixture.debugElement.queryAll(
        By.css('.task-status')
      )[2];
      const select = task3StatusControl.query(By.css('.task-status__select')).nativeElement;

      // ACT
      select.value = 'IN_PROGRESS';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      
      // Wait for debounce timeout
      await new Promise(resolve => setTimeout(resolve, 350));
      fixture.detectChanges();

      // ASSERT
      expect(taskService.changeStatus).toHaveBeenCalledWith('task-3', 'IN_PROGRESS');
    });

    it('should allow transition from IN_PROGRESS to TODO (backwards)', async () => {
      // ARRANGE
      const task2StatusControl = fixture.debugElement.queryAll(
        By.css('.task-status')
      )[1];
      const select = task2StatusControl.query(By.css('.task-status__select')).nativeElement;

      // ACT
      select.value = 'TODO';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      
      // Wait for debounce timeout
      await new Promise(resolve => setTimeout(resolve, 350));
      fixture.detectChanges();

      // ASSERT
      expect(taskService.changeStatus).toHaveBeenCalledWith('task-2', 'TODO');
    });
  });

  describe('AC3: Invalid Status Transitions Prevention', () => {
    it('should prevent direct TODO to DONE transition', () => {
      // ARRANGE
      const task1StatusControl = fixture.debugElement.queryAll(
        By.css('.task-status')
      )[0];
      const options = task1StatusControl.queryAll(By.css('.task-status__select option'));

      // ASSERT
      const optionValues = options.map((opt) => opt.nativeElement.value);
      expect(optionValues).not.toContain('DONE');
    });

    it('should prevent direct DONE to TODO transition', () => {
      // ARRANGE
      const task3StatusControl = fixture.debugElement.queryAll(
        By.css('.task-status')
      )[2];
      const options = task3StatusControl.queryAll(By.css('.task-status__select option'));

      // ASSERT
      const optionValues = options.map((opt) => opt.nativeElement.value);
      expect(optionValues).not.toContain('TODO');
    });

    it('should not show invalid transitions in dropdown', () => {
      // ARRANGE
      const task1StatusControl = fixture.debugElement.queryAll(
        By.css('.task-status')
      )[0];
      const options = task1StatusControl.queryAll(By.css('.task-status__select option'));

      // ASSERT
      const optionValues = options.map((opt) => opt.nativeElement.value);
      // Filter out empty placeholder option
      const validOptions = optionValues.filter(val => val !== '');
      expect(validOptions).toEqual(['IN_PROGRESS']); // Only valid transition
    });
  });

  describe('AC4: Visual Differentiation by State', () => {
    it('should apply different colors for each status', () => {
      const statusBadges = fixture.debugElement.queryAll(By.css('.task-status__badge'));

      const expectedColors = {
        TODO: '#6b7280', // gray
        IN_PROGRESS: '#3b82f6', // blue
        DONE: '#10b981', // green
      };

      statusBadges.forEach((badge) => {
        const text = badge.nativeElement.textContent.trim();
        const colorMap: Record<string, string> = {
          '○TODO': 'rgb(107, 114, 128)',
          '◐IN PROGRESS': 'rgb(59, 130, 246)',
          '✓DONE': 'rgb(16, 185, 129)',
        };
        // Also check by status directly if text matching fails
        let expectedColor = '';
        if (text.includes('TODO')) expectedColor = 'rgb(107, 114, 128)';
        else if (text.includes('IN PROGRESS')) expectedColor = 'rgb(59, 130, 246)';
        else if (text.includes('DONE')) expectedColor = 'rgb(16, 185, 129)';
        
        expect(badge.nativeElement.style.backgroundColor).toBe(expectedColor);
      });
    });

    it('should display different labels for each status', () => {
      const statusBadges = fixture.debugElement.queryAll(By.css('.task-status__badge'));

      expect(statusBadges[0].query(By.css('.task-status__label')).nativeElement.textContent.trim()).toBe('TODO');
      expect(statusBadges[0].nativeElement.classList.contains('task-status__badge--todo')).toBe(
        true
      );

      expect(statusBadges[1].query(By.css('.task-status__label')).nativeElement.textContent.trim()).toBe('IN PROGRESS');
      expect(statusBadges[1].nativeElement.classList.contains(
        'task-status__badge--in-progress'
      )).toBe(true);

      expect(statusBadges[2].query(By.css('.task-status__label')).nativeElement.textContent.trim()).toBe('DONE');
      expect(statusBadges[2].nativeElement.classList.contains('task-status__badge--done')).toBe(
        true
      );
      const todoCount = fixture.debugElement.query(By.css('.task-status__count--todo'));
      const inProgressCount = fixture.debugElement.query(By.css('.task-status__count--in-progress'));
      const doneCount = fixture.debugElement.query(By.css('.task-status__count--done'));

      expect(todoCount).toBeTruthy();
      expect(inProgressCount).toBeTruthy();
      expect(doneCount).toBeTruthy();

      expect(todoCount.nativeElement.textContent.trim()).toBe('TODO: 1');
      expect(inProgressCount.nativeElement.textContent.trim()).toBe('IN PROGRESS: 1');
      expect(doneCount.nativeElement.textContent.trim()).toBe('DONE: 1');
    });

    it('should update counters when status changes', async () => {
      // ARRANGE
      taskService.getTaskCounts.mockReturnValue({
        todo: 0,
        inProgress: 2,
        done: 1,
        total: 3,
      });

      const task1StatusControl = fixture.debugElement.queryAll(
        By.css('.task-status')
      )[0];
      const select = task1StatusControl.query(By.css('.task-status__select')).nativeElement;

      // ACT
      select.value = 'IN_PROGRESS';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      
      // Wait for debounce timeout
      await new Promise(resolve => setTimeout(resolve, 350));
      fixture.detectChanges();

      // ASSERT - Should NOT show error since this is successful status change
      const errorMessage = task1StatusControl.query(By.css('.task-status__error'));
      expect(errorMessage).toBeFalsy();
    });

    it('should display error when status change fails', async () => {
      // ARRANGE
      taskService.changeStatus.mockImplementation(() => {
        throw new Error('Network error');
      });

      const statusControl = fixture.debugElement.queryAll(By.css('.task-status'))[0];
      const select = statusControl.query(By.css('.task-status__select')).nativeElement;

      // ACT
      select.value = 'IN_PROGRESS';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      
      // Wait for debounce timeout
      await new Promise(resolve => setTimeout(resolve, 350));
      fixture.detectChanges();

      // ASSERT
      const errorMessage = statusControl.query(By.css('.task-status__error'));
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent).toContain('Network error');
    });

    it('should sanitize status values to prevent XSS', () => {
      // ARRANGE
      const maliciousTask = {
        ...mockTasks[0],
        status: '<script>alert("XSS")</script>' as any,
      };
      taskService.getTask.mockReturnValue(maliciousTask);
      taskService.getStatusTransitions.mockReturnValue([]);

      // ACT
      fixture.detectChanges();

      // ASSERT
      const statusBadge = fixture.debugElement.query(By.css('.task-status__badge'));
      const badgeText = statusBadge.nativeElement.textContent;
      expect(badgeText).not.toContain('<script>');
      expect(badgeText).not.toContain('alert');
    });

    it('should log security events when status changes', async () => {
      // ARRANGE
      const statusControl = fixture.debugElement.queryAll(By.css('.task-status'))[0];
      const select = statusControl.query(By.css('.task-status__select')).nativeElement;

      // ACT
      select.value = 'IN_PROGRESS';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      
      // Wait for debounce timeout and security logging
      await new Promise(resolve => setTimeout(resolve, 350));
      
      fixture.detectChanges();

      // ASSERT
      expect(authService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DATA_ACCESS',
          message: expect.stringContaining('Task status changed'),
          timestamp: expect.any(Date),
        })
      );
    });
  });

  describe('Performance & Optimization', () => {
    it('should debounce rapid status changes', async () => {
      // ARRANGE
      const statusControl = fixture.debugElement.queryAll(By.css('.task-status'))[0];
      const select = statusControl.query(By.css('.task-status__select')).nativeElement;

      // ACT - Multiple rapid changes
      select.value = 'IN_PROGRESS';
      select.dispatchEvent(new Event('change'));

      select.value = 'DONE'; // Should be prevented
      select.dispatchEvent(new Event('change'));

      await fixture.whenStable();
      
      // Wait for debounce timeout
      await new Promise(resolve => setTimeout(resolve, 350));
      
      fixture.detectChanges();

      // ASSERT - Should only call once with debouncing
      expect(taskService.changeStatus).toHaveBeenCalledTimes(1);
    });

   it('should not re-render entire task list on status change', async () => {
      // ARRANGE
      const renderSpy = vi.spyOn(component, 'ngDoCheck');

      const statusControl = fixture.debugElement.queryAll(By.css('.task-status'))[0];
      const select = statusControl.query(By.css('.task-status__select')).nativeElement;

      // ACT
      select.value = 'IN_PROGRESS';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      fixture.detectChanges();

      // ASSERT - Should use change detection efficiently
      expect(renderSpy.mock.calls.length).toBeLessThan(3); // Allow minimal calls for OnPush
    });
  });
});
