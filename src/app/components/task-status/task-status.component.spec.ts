import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { TaskStatusComponent } from './task-status.component';
import { TaskService } from '../../shared/services/task.service';
import { Task, TaskStatus, TaskPriority, TaskProject } from '../../shared/models/task.model';

/**
 * US-005: Change Task Status - Component Tests (RED Phase)
 * 
 * These tests define expected behavior for task status change UI component.
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

describe('US-005: Change Task Status - Component Tests', () => {
  let component: TaskStatusComponent;
  let fixture: ComponentFixture<TaskStatusComponent>;
  let taskService: any;
  let mockTask: Task;

  beforeEach(async () => {
    const taskServiceSpy = {
      getTask: vi.fn(),
      changeStatus: vi.fn(),
      getStatusTransitions: vi.fn(),
      getTaskCounts: vi.fn(),
    };

    mockTask = {
      id: 'task-1',
      title: 'Task with Status',
      description: 'This task needs status change',
      priority: 'medium' as TaskPriority,
      status: 'TODO' as TaskStatus,
      project: 'Work' as TaskProject,
      createdAt: new Date('2024-01-15T10:00:00'),
      updatedAt: new Date('2024-01-15T10:00:00'),
    };

    taskServiceSpy.getTask.mockReturnValue(mockTask);
    taskServiceSpy.getStatusTransitions.mockReturnValue(['IN_PROGRESS']);
    taskServiceSpy.getTaskCounts.mockReturnValue({
      todo: 1,
      inProgress: 0,
      done: 0,
      total: 1,
    });

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, ReactiveFormsModule, TaskStatusComponent],
      providers: [{ provide: TaskService, useValue: taskServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskStatusComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);

    // Set task input
    fixture.componentRef.setInput('task', mockTask);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Inputs & Signals', () => {
    it('should receive task as input', () => {
      // ASSERT
      expect(component.task()).toEqual(mockTask);
    });

    it('should have a current status signal', () => {
      // ASSERT
      expect(component.currentStatus()).toBe('TODO');
    });

    it('should have available transitions signal', () => {
      // ASSERT
      expect(component.availableTransitions()).toEqual(['IN_PROGRESS']);
    });

    it('should update current status when task input changes', () => {
      // ARRANGE
      const updatedTask = { ...mockTask, status: 'IN_PROGRESS' as TaskStatus };

      // ACT
      fixture.componentRef.setInput('task', updatedTask);
      fixture.detectChanges();

      // ASSERT
      expect(component.currentStatus()).toBe('IN_PROGRESS');
    });
  });

  describe('Status Display - Visual Differentiation', () => {
    it('should display TODO status with correct visual style', () => {
      // ACT
      fixture.detectChanges();

      // ASSERT
      const statusBadge = fixture.debugElement.query(By.css('.task-status__badge'));
      expect(statusBadge).toBeTruthy();
      expect(statusBadge.nativeElement.textContent.trim()).toBe('TODO');
      expect(statusBadge.nativeElement.classList.contains('task-status__badge--todo')).toBe(true);
    });

    it('should display IN_PROGRESS status with correct visual style', () => {
      // ARRANGE
      const inProgressTask = { ...mockTask, status: 'IN_PROGRESS' as TaskStatus };
      fixture.componentRef.setInput('task', inProgressTask);
      fixture.detectChanges();

      // ASSERT
      const statusBadge = fixture.debugElement.query(By.css('.task-status__badge'));
      expect(statusBadge.nativeElement.textContent.trim()).toBe('IN PROGRESS');
      expect(statusBadge.nativeElement.classList.contains('task-status__badge--in-progress')).toBe(
        true
      );
    });

    it('should display DONE status with correct visual style', () => {
      // ARRANGE
      const doneTask = { ...mockTask, status: 'DONE' as TaskStatus };
      fixture.componentRef.setInput('task', doneTask);
      fixture.detectChanges();

      // ASSERT
      const statusBadge = fixture.debugElement.query(By.css('.task-status__badge'));
      expect(statusBadge.nativeElement.textContent.trim()).toBe('DONE');
      expect(statusBadge.nativeElement.classList.contains('task-status__badge--done')).toBe(true);
    });

    it('should have different colors for each status', () => {
      const colorTests = [
        { status: 'TODO', expectedColor: '#6b7280' }, // gray
        { status: 'IN_PROGRESS', expectedColor: '#3b82f6' }, // blue
        { status: 'DONE', expectedColor: '#10b981' }, // green
      ];

      colorTests.forEach(({ status, expectedColor }) => {
        const task = { ...mockTask, status: status as TaskStatus };
        fixture.componentRef.setInput('task', task);
        fixture.detectChanges();

        const statusBadge = fixture.debugElement.query(By.css('.task-status__badge'));
        const bgColor = statusBadge.nativeElement.style.backgroundColor;

        expect(bgColor).toBe(expectedColor);
      });
    });
  });

  describe('Status Change Controls', () => {
    it('should render status change dropdown/select', () => {
      // ASSERT
      const statusSelect = fixture.debugElement.query(By.css('.task-status__select'));
      expect(statusSelect).toBeTruthy();
    });

    it('should display available status transitions in dropdown', () => {
      // ASSERT
      const options = fixture.debugElement.queryAll(By.css('.task-status__select option'));
      expect(options.length).toBeGreaterThan(0);
      expect(options[0].nativeElement.textContent).toContain('In Progress');
    });

    it('should show only valid transitions in dropdown', () => {
      // ARRANGE - TODO task should only show IN_PROGRESS
      taskService.getStatusTransitions.mockReturnValue(['IN_PROGRESS']);

      // ACT
      fixture.detectChanges();

      // ASSERT
      const options = fixture.debugElement.queryAll(By.css('.task-status__select option'));
      const optionValues = options.map((opt) => opt.nativeElement.value);
      expect(optionValues).toContain('IN_PROGRESS');
      expect(optionValues).not.toContain('TODO');
      expect(optionValues).not.toContain('DONE');
    });

    it('should emit status change event when new status is selected', () => {
      // ARRANGE
      const statusChangeSpy = vi.spyOn(component.statusChange, 'emit');
      const select = fixture.debugElement.query(By.css('.task-status__select')).nativeElement;

      // ACT
      select.value = 'IN_PROGRESS';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // ASSERT
      expect(statusChangeSpy).toHaveBeenCalledWith({
        taskId: 'task-1',
        newStatus: 'IN_PROGRESS',
      });
    });

    it('should call service to change status when new option is selected', () => {
      // ARRANGE
      const select = fixture.debugElement.query(By.css('.task-status__select')).nativeElement;

      // ACT
      select.value = 'IN_PROGRESS';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // ASSERT
      expect(taskService.changeStatus).toHaveBeenCalledWith('task-1', 'IN_PROGRESS');
    });

    it('should disable select when no transitions are available', () => {
      // ARRANGE
      taskService.getStatusTransitions.mockReturnValue([]);
      fixture.detectChanges();

      // ACT
      const select = fixture.debugElement.query(By.css('.task-status__select'));

      // ASSERT
      expect(select.nativeElement.disabled).toBe(true);
    });
  });

  describe('Alternative Controls - Next/Previous Buttons', () => {
    it('should render next status button when available', () => {
      // ARRANGE
      taskService.getStatusTransitions.mockReturnValue(['IN_PROGRESS']);

      // ACT
      fixture.detectChanges();

      // ASSERT
      const nextButton = fixture.debugElement.query(By.css('.task-status__btn--next'));
      expect(nextButton).toBeTruthy();
      expect(nextButton.nativeElement.textContent.trim()).toBe('→ Start');
    });

    it('should render previous status button when available', () => {
      // ARRANGE
      const inProgressTask = { ...mockTask, status: 'IN_PROGRESS' as TaskStatus };
      fixture.componentRef.setInput('task', inProgressTask);
      taskService.getStatusTransitions.mockReturnValue(['TODO', 'DONE']);
      fixture.detectChanges();

      // ASSERT
      const prevButton = fixture.debugElement.query(By.css('.task-status__btn--prev'));
      expect(prevButton).toBeTruthy();
      expect(prevButton.nativeElement.textContent.trim()).toBe('← Back');
    });

    it('should change to next status when next button is clicked', () => {
      // ARRANGE
      taskService.getStatusTransitions.mockReturnValue(['IN_PROGRESS']);
      const statusChangeSpy = vi.spyOn(component.statusChange, 'emit');
      const nextButton = fixture.debugElement.query(By.css('.task-status__btn--next'));

      // ACT
      nextButton.triggerEventHandler('click', null);
      fixture.detectChanges();

      // ASSERT
      expect(statusChangeSpy).toHaveBeenCalledWith({
        taskId: 'task-1',
        newStatus: 'IN_PROGRESS',
      });
      expect(taskService.changeStatus).toHaveBeenCalledWith('task-1', 'IN_PROGRESS');
    });

    it('should change to previous status when previous button is clicked', () => {
      // ARRANGE
      const inProgressTask = { ...mockTask, status: 'IN_PROGRESS' as TaskStatus };
      fixture.componentRef.setInput('task', inProgressTask);
      taskService.getStatusTransitions.mockReturnValue(['TODO', 'DONE']);
      const statusChangeSpy = vi.spyOn(component.statusChange, 'emit');
      const prevButton = fixture.debugElement.query(By.css('.task-status__btn--prev'));

      // ACT
      prevButton.triggerEventHandler('click', null);
      fixture.detectChanges();

      // ASSERT
      expect(statusChangeSpy).toHaveBeenCalledWith({
        taskId: 'task-1',
        newStatus: 'TODO',
      });
    });

    it('should hide next button when at DONE status', () => {
      // ARRANGE
      const doneTask = { ...mockTask, status: 'DONE' as TaskStatus };
      fixture.componentRef.setInput('task', doneTask);
      taskService.getStatusTransitions.mockReturnValue(['IN_PROGRESS']);
      fixture.detectChanges();

      // ASSERT
      const nextButton = fixture.debugElement.query(By.css('.task-status__btn--next'));
      expect(nextButton).toBeFalsy();
    });

    it('should hide previous button when at TODO status', () => {
      // ARRANGE
      const todoTask = { ...mockTask, status: 'TODO' as TaskStatus };
      fixture.componentRef.setInput('task', todoTask);
      taskService.getStatusTransitions.mockReturnValue(['IN_PROGRESS']);
      fixture.detectChanges();

      // ASSERT
      const prevButton = fixture.debugElement.query(By.css('.task-status__btn--prev'));
      expect(prevButton).toBeFalsy();
    });
  });

  describe('Task Counters', () => {
    it('should display task counts for each status', () => {
      // ACT
      fixture.detectChanges();

      // ASSERT
      const todoCount = fixture.debugElement.query(By.css('.task-status__count--todo'));
      const inProgressCount = fixture.debugElement.query(By.css('.task-status__count--in-progress'));
      const doneCount = fixture.debugElement.query(By.css('.task-status__count--done'));

      expect(todoCount).toBeTruthy();
      expect(inProgressCount).toBeTruthy();
      expect(doneCount).toBeTruthy();

      expect(todoCount.nativeElement.textContent.trim()).toBe('1');
      expect(inProgressCount.nativeElement.textContent.trim()).toBe('0');
      expect(doneCount.nativeElement.textContent.trim()).toBe('0');
    });

    it('should update counts after status change', () => {
      // ARRANGE
      taskService.getTaskCounts.mockReturnValue({
        todo: 0,
        inProgress: 1,
        done: 0,
        total: 1,
      });

      // ACT
      const select = fixture.debugElement.query(By.css('.task-status__select')).nativeElement;
      select.value = 'IN_PROGRESS';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // ASSERT
      const todoCount = fixture.debugElement.query(By.css('.task-status__count--todo'));
      const inProgressCount = fixture.debugElement.query(By.css('.task-status__count--in-progress'));

      expect(todoCount.nativeElement.textContent.trim()).toBe('0');
      expect(inProgressCount.nativeElement.textContent.trim()).toBe('1');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for status controls', () => {
      // ASSERT
      const select = fixture.debugElement.query(By.css('.task-status__select'));
      expect(select.nativeElement.getAttribute('aria-label')).toBe('Change task status');

      const statusBadge = fixture.debugElement.query(By.css('.task-status__badge'));
      expect(statusBadge.nativeElement.getAttribute('aria-label')).toBe('Current status: TODO');
    });

    it('should have proper role attributes', () => {
      // ASSERT
      const statusContainer = fixture.debugElement.query(By.css('.task-status'));
      expect(statusContainer.nativeElement.getAttribute('role')).toBe('group');
      expect(statusContainer.nativeElement.getAttribute('aria-label')).toBe(
        'Task status controls'
      );
    });

    it('should have descriptive labels for buttons', () => {
      // ARRANGE
      taskService.getStatusTransitions.mockReturnValue(['IN_PROGRESS']);
      fixture.detectChanges();

      // ASSERT
      const nextButton = fixture.debugElement.query(By.css('.task-status__btn--next'));
      expect(nextButton.nativeElement.getAttribute('aria-label')).toBe(
        'Move task to In Progress'
      );
    });

    it('should be keyboard navigable', () => {
      // ASSERT
      const select = fixture.debugElement.query(By.css('.task-status__select'));
      expect(select.nativeElement.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when status change fails', () => {
      // ARRANGE
      taskService.changeStatus.mockImplementation(() => {
        throw new Error('Failed to change status');
      });

      // ACT
      const select = fixture.debugElement.query(By.css('.task-status__select')).nativeElement;
      select.value = 'IN_PROGRESS';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // ASSERT
      const errorMessage = fixture.debugElement.query(By.css('.task-status__error'));
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent).toContain('Failed to change status');
    });

    it('should clear error message on next successful operation', () => {
      // ARRANGE
      taskService.changeStatus.mockImplementation(() => {
        throw new Error('First attempt failed');
      });

      // ACT - First attempt fails
      let select = fixture.debugElement.query(By.css('.task-status__select')).nativeElement;
      select.value = 'IN_PROGRESS';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // Second attempt succeeds
      taskService.changeStatus.mockReturnValue(mockTask);
      select = fixture.debugElement.query(By.css('.task-status__select')).nativeElement;
      select.value = 'IN_PROGRESS';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // ASSERT
      const errorMessage = fixture.debugElement.query(By.css('.task-status__error'));
      expect(errorMessage).toBeFalsy();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator while changing status', () => {
      // ARRANGE
      component.setLoading(true);
      fixture.detectChanges();

      // ASSERT
      const loadingIndicator = fixture.debugElement.query(By.css('.task-status__loading'));
      expect(loadingIndicator).toBeTruthy();
    });

    it('should disable controls while loading', () => {
      // ARRANGE
      component.setLoading(true);
      fixture.detectChanges();

      // ASSERT
      const select = fixture.debugElement.query(By.css('.task-status__select'));
      expect(select.nativeElement.disabled).toBe(true);

      const nextButton = fixture.debugElement.query(By.css('.task-status__btn--next'));
      if (nextButton) {
        expect(nextButton.nativeElement.disabled).toBe(true);
      }
    });
  });

  describe('Security', () => {
    it('should sanitize status display', () => {
      // ARRANGE
      const maliciousTask = {
        ...mockTask,
        status: '<script>alert("XSS")</script>' as any,
      };
      taskService.getTask.mockReturnValue(maliciousTask);
      fixture.componentRef.setInput('task', maliciousTask);
      fixture.detectChanges();

      // ASSERT
      const statusBadge = fixture.debugElement.query(By.css('.task-status__badge'));
      const badgeText = statusBadge.nativeElement.textContent;
      expect(badgeText).not.toContain('<script>');
      expect(badgeText).not.toContain('alert');
    });

    it('should prevent XSS through select options', () => {
      // ARRANGE
      taskService.getStatusTransitions.mockReturnValue([
        '<script>alert("XSS")</script>' as any,
      ]);
      fixture.detectChanges();

      // ASSERT
      const options = fixture.debugElement.queryAll(By.css('.task-status__select option'));
      const optionText = options[0].nativeElement.textContent;
      expect(optionText).not.toContain('<script>');
      expect(optionText).not.toContain('alert');
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile view', () => {
      // ARRANGE - Simulate mobile viewport
      window.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      // ASSERT
      const componentElement = fixture.debugElement.query(By.css('.task-status'));
      expect(componentElement.nativeElement.classList.contains('task-status--mobile')).toBe(true);
    });

    it('should adapt to desktop view', () => {
      // ARRANGE - Simulate desktop viewport
      window.innerWidth = 1200;
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      // ASSERT
      const componentElement = fixture.debugElement.query(By.css('.task-status'));
      expect(componentElement.nativeElement.classList.contains('task-status--desktop')).toBe(true);
    });
  });
});
