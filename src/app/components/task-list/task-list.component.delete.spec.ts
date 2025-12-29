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
  });

  describe('Delete Button Display', () => {
    it('should display delete button for each task', () => {
      const deleteButtons = fixture.debugElement.queryAll(
        By.css('.task-list__action-btn--delete')
      );
      
      expect(deleteButtons.length).toBeGreaterThan(0);
      expect(deleteButtons[0].nativeElement.textContent).toContain('Delete');
      expect(deleteButtons[0].nativeElement.getAttribute('aria-label')).toContain('Delete task');
    });

    it('should have proper accessibility attributes on delete button', () => {
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      expect(deleteButton.nativeElement.getAttribute('aria-label')).toBeTruthy();
      expect(deleteButton.nativeElement.getAttribute('aria-label')).toContain('Delete task');
      expect(deleteButton.nativeElement.textContent.trim()).toBe('🗑️ Delete');
    });

    it('should sanitize ARIA labels for delete button', () => {
      const taskWithSensitiveData: Task = {
        ...mockTask,
        title: 'Task with password=secret123 content'
      };
      
      taskService.getTasksByStatusAndProject.mockReturnValue([taskWithSensitiveData]);
      fixture.detectChanges();
      
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      const ariaLabel = deleteButton.nativeElement.getAttribute('aria-label');
      expect(ariaLabel).not.toContain('secret123');
      expect(ariaLabel).toContain('p=***');
    });
  });

  describe('Delete Button Interaction', () => {
    it('should call onTaskAction when delete button is clicked', () => {
      spyOn(component, 'onTaskAction');
      
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      deleteButton.nativeElement.click();
      
      expect(component.onTaskAction).toHaveBeenCalledWith(mockTask.id, 'delete');
    });

    it('should handle delete action with proper task ID', () => {
      spyOn(component, 'onTaskAction');
      
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      deleteButton.nativeElement.click();
      
      expect(component.onTaskAction).toHaveBeenCalledWith('test-task-1', 'delete');
    });

    it('should show confirmation modal when delete is clicked', () => {
      // This test will fail until we implement confirmation functionality
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      // Should show confirmation modal - this will fail until implemented
      const modal = fixture.debugElement.query(By.css('.delete-confirmation-modal'));
      expect(modal).toBeTruthy(); // This will fail
    });
  });

  describe('Delete Confirmation Modal', () => {
    beforeEach(() => {
      // Simulate clicking delete button to show modal
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      deleteButton.nativeElement.click();
      fixture.detectChanges();
    });

    it('should display confirmation modal with "Are you sure?" message', () => {
      // This will fail until we implement modal
      const modal = fixture.debugElement.query(By.css('.delete-confirmation-modal'));
      expect(modal).toBeTruthy(); // This will fail
      
      const modalTitle = fixture.debugElement.query(By.css('.delete-confirmation-title'));
      expect(modalTitle).toBeTruthy(); // This will fail
      expect(modalTitle.nativeElement.textContent).toContain('Are you sure?');
    });

    it('should display task title in confirmation message', () => {
      // This will fail until we implement modal with task title
      const modalContent = fixture.debugElement.query(By.css('.delete-confirmation-content'));
      expect(modalContent).toBeTruthy(); // This will fail
      expect(modalContent.nativeElement.textContent).toContain('Test Task for Deletion');
    });

    it('should have cancel button in confirmation modal', () => {
      // This will fail until we implement modal
      const cancelButton = fixture.debugElement.query(By.css('.cancel-delete-btn'));
      expect(cancelButton).toBeTruthy(); // This will fail
      expect(cancelButton.nativeElement.textContent).toContain('Cancel');
    });

    it('should have confirm delete button in confirmation modal', () => {
      // This will fail until we implement modal
      const confirmButton = fixture.debugElement.query(By.css('.confirm-delete-btn'));
      expect(confirmButton).toBeTruthy(); // This will fail
      expect(confirmButton.nativeElement.textContent).toContain('Delete');
    });

    it('should close modal when cancel button is clicked', () => {
      // This will fail until we implement modal cancel functionality
      const cancelButton = fixture.debugElement.query(By.css('.cancel-delete-btn'));
      expect(cancelButton).toBeTruthy(); // This will fail
      
      cancelButton.nativeElement.click();
      fixture.detectChanges();
      
      const modal = fixture.debugElement.query(By.css('.delete-confirmation-modal'));
      expect(modal).toBeFalsy(); // Modal should be closed - This will fail
    });

    it('should trigger actual deletion when confirm button is clicked', () => {
      // This will fail until we implement confirm delete functionality
      const confirmButton = fixture.debugElement.query(By.css('.confirm-delete-btn'));
      expect(confirmButton).toBeTruthy(); // This will fail
      
      confirmButton.nativeElement.click();
      
      expect(taskService.deleteTask).toHaveBeenCalledWith('test-task-1');
    });

    it('should have proper accessibility attributes on modal', () => {
      // This will fail until we implement modal
      const modal = fixture.debugElement.query(By.css('.delete-confirmation-modal'));
      expect(modal).toBeTruthy(); // This will fail
      
      // Should have appropriate ARIA attributes
      expect(modal.nativeElement.getAttribute('role')).toBe('dialog');
      expect(modal.nativeElement.getAttribute('aria-modal')).toBe('true');
      expect(modal.nativeElement.getAttribute('aria-labelledby')).toBeTruthy();
    });
  });

  describe('Delete Execution Flow', () => {
    it('should call taskService.deleteTask when deletion is confirmed', () => {
      // This will fail until we implement delete execution
      taskService.deleteTask.mockReturnValue(true);
      
      // This method doesn't exist yet, test will fail
      (component as any).confirmDelete('test-task-1');
      
      expect(taskService.deleteTask).toHaveBeenCalledWith('test-task-1');
    });

    it('should refresh task list after successful deletion', () => {
      // This will fail until we implement refresh after delete
      taskService.deleteTask.mockReturnValue(true);
      spyOn(component, 'forceRefresh');
      
      (component as any).confirmDelete('test-task-1');
      
      expect(component.forceRefresh).toHaveBeenCalled();
    });

    it('should handle deletion error gracefully', () => {
      // This will fail until we implement error handling
      const deleteError = new Error('Task not found');
      taskService.deleteTask.mockImplementation(() => {
        throw deleteError;
      });
      
      expect(() => (component as any).confirmDelete('test-task-1')).not.toThrow();
    });

    it('should not call delete service if no task ID is provided', () => {
      // This will fail until we implement input validation
      (component as any).confirmDelete('');
      
      expect(taskService.deleteTask).not.toHaveBeenCalled();
    });

    it('should log security event when deletion is successful', () => {
      // This will fail until we implement security logging for delete
      taskService.deleteTask.mockReturnValue(true);
      
      (component as any).confirmDelete('test-task-1');
      
      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_ACCESS',
        message: 'Task deleted: test-task-1',
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });
  });

  describe('Delete Button States', () => {
    it('should disable delete button while deletion is in progress', () => {
      // This will fail until we implement loading state
      (component as any).setDeleteInProgress('test-task-1', true);
      fixture.detectChanges();
      
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      expect(deleteButton.nativeElement.disabled).toBe(true);
      expect(deleteButton.nativeElement.classList.contains('loading')).toBe(true);
    });

    it('should re-enable delete button after deletion completes', () => {
      // This will fail until we implement loading state management
      (component as any).setDeleteInProgress('test-task-1', false);
      fixture.detectChanges();
      
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      expect(deleteButton.nativeElement.disabled).toBe(false);
      expect(deleteButton.nativeElement.classList.contains('loading')).toBe(false);
    });

    it('should show loading indicator on delete button during deletion', () => {
      // This will fail until we implement loading indicator
      (component as any).setDeleteInProgress('test-task-1', true);
      fixture.detectChanges();
      
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      expect(deleteButton.nativeElement.querySelector('.loading-spinner')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle delete when task list is empty', () => {
      // Need to clear the existing mock data first
      taskService.getTasksByStatusAndProject.mockReset();
      taskService.getTasksByStatusAndProject.mockReturnValue([]);
      fixture.detectChanges();
      
      const deleteButtons = fixture.debugElement.queryAll(
        By.css('.task-list__action-btn--delete')
      );
      
      expect(deleteButtons.length).toBe(0);
    });

    it('should handle multiple delete buttons for different tasks', () => {
      // Clear existing mock data first
      taskService.getTasksByStatusAndProject.mockReset();
      
      const task2: Task = {
        ...mockTask,
        id: 'test-task-2',
        title: 'Another Test Task'
      };
      
      taskService.getTasksByStatusAndProject.mockReturnValue([mockTask, task2]);
      fixture.detectChanges();
      
      const deleteButtons = fixture.debugElement.queryAll(
        By.css('.task-list__action-btn--delete')
      );
      
      expect(deleteButtons.length).toBe(2);
      
      // Verify each button has correct task ID
      const firstButton = deleteButtons[0];
      const secondButton = deleteButtons[1];
      
      firstButton.nativeElement.click();
      expect(component.onTaskAction).toHaveBeenCalledWith('test-task-1', 'delete');
      
      (component.onTaskAction as any).mockClear();
      secondButton.nativeElement.click();
      expect(component.onTaskAction).toHaveBeenCalledWith('test-task-2', 'delete');
    });

    it('should handle delete button click rapidly (prevent double clicks)', () => {
      // Mock onTaskAction to track calls
      const onTaskActionSpy = spyOn(component, 'onTaskAction');
      onTaskActionSpy.mockImplementation((taskId: string, action: string) => {
        (component as any).onTaskAction(taskId, action);
      });
      
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      deleteButton.nativeElement.click();
      deleteButton.nativeElement.click();
      deleteButton.nativeElement.click();
      
      // Should trigger for each click (no debouncing implemented yet)
      expect(component.onTaskAction).toHaveBeenCalledTimes(3);
    });

    it('should handle deletion of non-existent task', () => {
      // This will fail until we implement proper error handling
      taskService.deleteTask.mockReturnValue(false);
      
      const result = (component as any).confirmDelete('non-existent-task');
      
      expect(result).toBe(false);
      expect(taskService.deleteTask).toHaveBeenCalledWith('non-existent-task');
    });
  });

  describe('Security Considerations for Delete', () => {
    it('should sanitize task title in confirmation modal', () => {
      const maliciousTask: Task = {
        ...mockTask,
        title: '<script>alert("xss")</script>Task Title'
      };
      
      taskService.getTasksByStatusAndProject.mockReturnValue([maliciousTask]);
      validationService.sanitizeForDisplay.mockReturnValue('Task Title');
      fixture.detectChanges();
      
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      // This will fail until we implement modal
      const modalContent = fixture.debugElement.query(By.css('.delete-confirmation-content'));
      expect(modalContent).toBeTruthy(); // This will fail
      expect(modalContent.nativeElement.textContent).not.toContain('<script>');
      expect(modalContent.nativeElement.textContent).toContain('Task Title');
    });

    it('should prevent XSS in task title for ARIA labels', () => {
      const taskWithXss: Task = {
        ...mockTask,
        title: 'javascript:alert("xss")'
      };
      
      taskService.getTasksByStatusAndProject.mockReturnValue([taskWithXss]);
      fixture.detectChanges();
      
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      const ariaLabel = deleteButton.nativeElement.getAttribute('aria-label');
      expect(ariaLabel).not.toContain('javascript:');
    });

    it('should log security event for delete attempts', () => {
      // This will fail until we implement security logging for delete attempts
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      deleteButton.nativeElement.click();
      
      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_ACCESS',
        message: expect.stringContaining('Task delete attempted'),
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });
  });

  describe('Rate Limiting and Authentication', () => {
    it('should respect rate limiting for delete operations', () => {
      // This will fail until we implement rate limiting in delete flow
      securityService.checkRateLimit.mockReturnValue({ 
        allowed: false, 
        message: 'Rate limit exceeded' 
      });
      
      (component as any).confirmDelete('test-task-1');
      
      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'RATE_LIMIT_EXCEEDED',
        message: 'Delete rate limit exceeded',
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });

    it('should require authentication before deletion', () => {
      // This will fail until we implement auth check in delete flow
      authService.requireAuthentication.mockImplementation(() => {
        throw new Error('Not authenticated');
      });
      
      expect(() => (component as any).confirmDelete('test-task-1')).toThrow('Not authenticated');
    });
  });
});