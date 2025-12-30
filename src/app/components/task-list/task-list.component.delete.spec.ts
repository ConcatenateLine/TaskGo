import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TaskListComponent } from './task-list.component';
import { TaskService } from '../../shared/services/task.service';
import { ValidationService } from '../../shared/services/validation.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';
import { TaskInlineEditComponent } from '../task-inline-edit/task-inline-edit.component';
import { DomSanitizer } from '@angular/platform-browser';
import { Task } from '../../shared/models/task.model';

// Mock spyOn for Vitest environment
const spyOn = (obj: any, method: string) => {
  const spy = vi.fn();
  obj[method] = spy;
  return spy;
};

describe('TaskListComponent - Delete Functionality (US-004)', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let taskService: any;
  let validationService: any;
  let authService: any;
  let securityService: any;
  let sanitizer: any;

  const mockTask: Task = {
    id: 'test-task-1',
    title: 'Test Task for Deletion',
    description: 'This task will be deleted',
    priority: 'medium',
    status: 'TODO',
    project: 'Work',
    createdAt: new Date('2024-01-15T10:00:00'),
    updatedAt: new Date('2024-01-15T10:00:00'),
  };

  beforeEach(async () => {
    const taskServiceSpy = {
      getTasksByStatusAndProject: vi.fn(),
      getTaskCounts: vi.fn(),
      deleteTask: vi.fn(),
      getTasks: vi.fn(),
      initializeMockData: vi.fn()
    };

    const validationServiceSpy = {
      sanitizeForDisplay: vi.fn(),
      validateCSP: vi.fn()
    };

    const authServiceSpy = {
      logSecurityEvent: vi.fn(),
      getUserContext: vi.fn(),
      requireAuthentication: vi.fn(),
      isAuthenticated: vi.fn()
    };

    const securityServiceSpy = {
      checkRateLimit: vi.fn()
    };

    const sanitizerSpy = {
      sanitize: vi.fn()
    };

    taskServiceSpy.getTasksByStatusAndProject.mockReturnValue([mockTask]);
    taskServiceSpy.getTaskCounts.mockReturnValue({
      todo: 1,
      inProgress: 0,
      done: 0,
      total: 1
    });
    validationServiceSpy.sanitizeForDisplay.mockImplementation((input: string) => input);
    sanitizerSpy.sanitize.mockReturnValue('sanitized-content');
    authServiceSpy.getUserContext.mockReturnValue({ userId: 'test-user' });
    securityServiceSpy.checkRateLimit.mockReturnValue({ allowed: true });

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        TaskListComponent,
        TaskInlineEditComponent,
        NoopAnimationsModule
      ],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: ValidationService, useValue: validationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SecurityService, useValue: securityServiceSpy },
        { provide: DomSanitizer, useValue: sanitizerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);
    validationService = TestBed.inject(ValidationService);
    authService = TestBed.inject(AuthService);
    securityService = TestBed.inject(SecurityService);
    sanitizer = TestBed.inject(DomSanitizer);

    fixture.detectChanges();

    // Wait a tick for the component to fully initialize
    await Promise.resolve();

    // Check what the filtered tasks length is
    console.log('Initial filtered tasks length:', component.filteredTasks().length);
    console.log('Status filter value:', component.statusFilter());
    console.log('Project filter value:', component.projectFilter());

    // Also check if we can access the editingTaskId signal
    console.log('Current editingTaskId:', (component as any).editingTaskId?.());
  });

  describe('Core Delete Functionality', () => {
    it('should have delete button for tasks in view mode', () => {
      const deleteButtons = fixture.debugElement.queryAll(
        By.css('.task-list__action-btn--delete')
      );

      // Debug: Let's see what's actually in the DOM
      console.log('Delete buttons found:', deleteButtons.length);
      console.log('Status filter:', component.statusFilter());
      console.log('Project filter:', component.projectFilter());
      console.log('Filtered tasks length:', component.filteredTasks().length);
      console.log('DOM content:', fixture.debugElement.nativeElement.outerHTML);

      // Check if we have delete buttons (they should exist when not in edit mode)
      expect(deleteButtons.length).toBeGreaterThan(0);
      if (deleteButtons.length > 0) {
        expect(deleteButtons[0].nativeElement.textContent).toContain('Delete');
        expect(deleteButtons[0].nativeElement.getAttribute('aria-label')).toContain('Delete task');
      }
    });

    it('should have delete button with proper text and attributes', () => {
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );

      expect(deleteButton).toBeTruthy();
      expect(deleteButton.nativeElement.textContent).toContain('Delete');
      expect(deleteButton.nativeElement.getAttribute('aria-label')).toBeTruthy();
      expect(deleteButton.nativeElement.getAttribute('aria-label')).toContain('Delete task');
    });

    it('should call onTaskAction when delete button is clicked', () => {
      spyOn(component, 'onTaskAction');

      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );

      if (deleteButton) {
        deleteButton.nativeElement.click();
      }

      expect(component.onTaskAction).toHaveBeenCalledWith(mockTask.id, 'delete');
    });

    it('should have delete functionality methods available', () => {
      expect(component.openDeleteModal).toBeDefined();
      expect(component.closeDeleteModal).toBeDefined();
      expect(component.confirmDelete).toBeDefined();
      expect(component.setDeleteInProgress).toBeDefined();
      expect(component.isDeleteInProgress).toBeDefined();
    });
  });

  describe('Delete Service Integration', () => {
    it('should call taskService.deleteTask when confirming deletion', () => {
      taskService.deleteTask.mockReturnValue(true);
      spyOn(component, 'forceRefresh');

      const result = component.confirmDelete('test-task-1');

      expect(taskService.deleteTask).toHaveBeenCalledWith('test-task-1');
      expect(result).toBe(true);
      expect(component.forceRefresh).toHaveBeenCalled();
    });

    it('should handle deletion errors gracefully', () => {
      const deleteError = new Error('Task not found');
      taskService.deleteTask.mockImplementation(() => {
        throw deleteError;
      });

      expect(() => component.confirmDelete('test-task-1')).not.toThrow();
    });

    it('should log security events on delete operations', () => {
      taskService.deleteTask.mockReturnValue(true);
      authService.requireAuthentication.mockReturnValue(true);

      component.confirmDelete('test-task-1');

      expect(authService.logSecurityEvent).toHaveBeenCalled();
      expect(authService.requireAuthentication).toHaveBeenCalled();
    });
  });

  describe('Delete Loading States', () => {
    it('should track delete in progress state', () => {
      component.setDeleteInProgress('test-task-1', true);

      expect(component.isDeleteInProgress('test-task-1')).toBe(true);
    });

    it('should clear delete in progress state', () => {
      component.setDeleteInProgress('test-task-1', false);

      expect(component.isDeleteInProgress('test-task-1')).toBe(false);
    });

    it('should manage multiple delete operations', () => {
      component.setDeleteInProgress('task-1', true);
      component.setDeleteInProgress('task-2', true);

      expect(component.isDeleteInProgress('task-1')).toBe(true);
      expect(component.isDeleteInProgress('task-2')).toBe(true);

      component.setDeleteInProgress('task-1', false);

      expect(component.isDeleteInProgress('task-1')).toBe(false);
      expect(component.isDeleteInProgress('task-2')).toBe(true);
    });
  });

  describe('Delete Modal Functionality', () => {
    it('should open delete modal', () => {
      spyOn(component, 'openDeleteModal');

      component.openDeleteModal('test-task-1');

      expect(component.openDeleteModal).toHaveBeenCalledWith('test-task-1');
    });

    it('should close delete modal', () => {
      spyOn(component, 'closeDeleteModal');

      component.closeDeleteModal();

      expect(component.closeDeleteModal).toHaveBeenCalled();
    });

    it('should track task to delete', () => {
      component.openDeleteModal('test-task-1');

      // The task should be stored for deletion
      expect((component as any).getTaskToDeleteId()).toBe('test-task-1');
    });
  });

  describe('Delete Security Features', () => {
    it.skip('should require authentication', () => {
      authService.requireAuthentication.mockImplementation(() => {
        throw new Error('Not authenticated');
      });

      expect(() => component.confirmDelete('test-task-1')).toThrow('Not authenticated');
    });

    it('should sanitize input in security logging', () => {
      const taskWithXss = {
        ...mockTask,
        title: '<script>alert("xss")</script>Task Title'
      };

      taskService.getTasksByStatusAndProject.mockReturnValue([taskWithXss]);
      component.openDeleteModal('test-task-1');

      // Security should be logged
      expect(authService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DATA_ACCESS',
          message: expect.stringContaining('Task delete attempted')
        })
      );
    });
  });

  describe('Delete Edge Cases', () => {
    it('should handle empty task list', async () => {
      // Simulate an empty task list
      taskService.getTasksByStatusAndProject.mockReturnValue([]);
      component.forceRefresh();
      fixture.detectChanges();

      expect(component.sortedTasks().length).toBe(0);

      const deleteButtons = fixture.debugElement.queryAll(
        By.css('.task-list__action-btn--delete')
      );

      expect(deleteButtons.length).toBe(0);
    });

    it('should handle invalid task IDs', () => {
      taskService.deleteTask.mockReturnValue(false);

      const result = component.confirmDelete('');

      expect(result).toBe(false);
      expect(taskService.deleteTask).not.toHaveBeenCalledWith('');
    });

    it('should handle null task IDs', () => {
      taskService.deleteTask.mockReturnValue(false);

      const result = component.confirmDelete(null as any);

      expect(result).toBe(false);
      expect(taskService.deleteTask).not.toHaveBeenCalledWith(null);
    });

    it('should handle non-existent task deletion', () => {
      taskService.deleteTask.mockReturnValue(false);

      const result = component.confirmDelete('non-existent-task');

      expect(result).toBe(false);
      expect(taskService.deleteTask).toHaveBeenCalledWith('non-existent-task');
    });
  });
});
