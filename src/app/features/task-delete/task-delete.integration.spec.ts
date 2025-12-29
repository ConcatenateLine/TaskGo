import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TaskListComponent } from '../../components/task-list/task-list.component';
import { TaskCreationFormComponent } from '../../components/task-creation-form/task-creation-form.component';
import { TaskService } from '../../shared/services/task.service';
import { ValidationService } from '../../shared/services/validation.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';
import { CryptoService } from '../../shared/services/crypto.service';
import { Task } from '../../shared/models/task.model';
import { DomSanitizer } from '@angular/platform-browser';

// Mock spyOn for Vitest environment
const spyOn = (obj: any, method: string) => {
  const spy = vi.fn();
  obj[method] = spy;
  return spy;
};

describe('Delete Task Integration Tests (US-004)', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let taskService: any;
  let validationService: any;
  let authService: any;
  let securityService: any;
  let mockRouter: any;

  const mockTask: Task = {
    id: 'integration-test-task-1',
    title: 'Integration Test Task for Delete',
    description: 'This task will be deleted in integration test',
    priority: 'high',
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
      createTask: vi.fn(),
      initializeMockData: vi.fn()
    };
    
    const validationServiceSpy = {
      validateTaskTitle: vi.fn(),
      validateTaskDescription: vi.fn(),
      sanitizeForDisplay: vi.fn(),
      validateCSP: vi.fn()
    };
    
    const authServiceSpy = {
      logSecurityEvent: vi.fn(),
      getUserContext: vi.fn(),
      requireAuthentication: vi.fn(),
      isAuthenticated: vi.fn(),
      createAnonymousUser: vi.fn()
    };
    
    const securityServiceSpy = {
      checkRateLimit: vi.fn(),
      validateRequest: vi.fn()
    };
    
    const cryptoServiceSpy = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      getStorageKey: vi.fn().mockReturnValue('task_storage_key')
    };
    
    const sanitizerSpy = {
      sanitize: vi.fn()
    };

    mockRouter = {
      navigate: vi.fn()
    };

    // Setup default mock returns
    taskServiceSpy.getTasksByStatusAndProject.mockReturnValue([mockTask]);
    taskServiceSpy.getTaskCounts.mockReturnValue({
      todo: 1,
      inProgress: 0,
      done: 0,
      total: 1
    });
    taskServiceSpy.createTask.mockReturnValue(mockTask);
    taskServiceSpy.deleteTask.mockReturnValue(true);
    validationServiceSpy.validateTaskTitle.mockReturnValue({ 
      isValid: true, 
      sanitized: mockTask.title 
    });
    validationServiceSpy.validateTaskDescription.mockReturnValue({ 
      isValid: true, 
      sanitized: mockTask.description 
    });
    validationServiceSpy.sanitizeForDisplay.mockImplementation((input: string) => input);
    sanitizerSpy.sanitize.mockReturnValue('sanitized-content');
    authServiceSpy.getUserContext.mockReturnValue({ userId: 'test-user' });
    authServiceSpy.isAuthenticated.mockReturnValue(true);
    securityServiceSpy.checkRateLimit.mockReturnValue({ allowed: true });
    securityServiceSpy.validateRequest.mockReturnValue({ valid: true, threats: [] });

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        TaskListComponent,
        TaskCreationFormComponent,
        NoopAnimationsModule
      ],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: ValidationService, useValue: validationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SecurityService, useValue: securityServiceSpy },
        { provide: CryptoService, useValue: cryptoServiceSpy },
        { provide: DomSanitizer, useValue: sanitizerSpy },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);
    validationService = TestBed.inject(ValidationService);
    authService = TestBed.inject(AuthService);
    securityService = TestBed.inject(SecurityService);
    
    fixture.detectChanges();
  });

  describe('Complete Delete Flow Integration', () => {
    it('should show delete confirmation when delete button is clicked', () => {
      // This will fail until we implement complete delete flow
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      expect(deleteButton).toBeTruthy();
      
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      // Should show confirmation modal
      const modal = fixture.debugElement.query(By.css('.delete-confirmation-modal'));
      expect(modal).toBeTruthy(); // This will fail until implemented
      
      // Should show task title in modal
      const modalContent = fixture.debugElement.query(By.css('.delete-confirmation-content'));
      expect(modalContent.nativeElement.textContent).toContain('Integration Test Task for Delete');
    });

    it('should complete full delete flow from button click to service call', () => {
      // This will fail until we implement complete delete flow
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      // Step 1: Click delete button
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      // Step 2: Confirmation modal should appear
      const modal = fixture.debugElement.query(By.css('.delete-confirmation-modal'));
      expect(modal).toBeTruthy(); // This will fail until implemented
      
      // Step 3: Click confirm delete button
      const confirmButton = fixture.debugElement.query(By.css('.confirm-delete-btn'));
      expect(confirmButton).toBeTruthy(); // This will fail until implemented
      
      confirmButton.nativeElement.click();
      fixture.detectChanges();
      
      // Step 4: Service should be called
      expect(taskService.deleteTask).toHaveBeenCalledWith('integration-test-task-1');
      
      // Step 5: Task list should be refreshed
      expect(taskService.getTasksByStatusAndProject).toHaveBeenCalled();
    });

    it('should cancel deletion when cancel button is clicked', () => {
      // This will fail until we implement complete delete flow
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      // Click cancel button
      const cancelButton = fixture.debugElement.query(By.css('.cancel-delete-btn'));
      expect(cancelButton).toBeTruthy(); // This will fail until implemented
      
      cancelButton.nativeElement.click();
      fixture.detectChanges();
      
      // Modal should close and service should not be called
      const modal = fixture.debugElement.query(By.css('.delete-confirmation-modal'));
      expect(modal).toBeFalsy(); // This will fail until implemented
      expect(taskService.deleteTask).not.toHaveBeenCalled();
    });

    it('should handle delete flow with authentication', () => {
      // This will fail until we implement authentication in delete flow
      authService.requireAuthentication.mockImplementation(() => {
        // Do nothing - user is authenticated
      });
      
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      const confirmButton = fixture.debugElement.query(By.css('.confirm-delete-btn'));
      expect(confirmButton).toBeTruthy(); // This will fail until implemented
      
      confirmButton.nativeElement.click();
      
      expect(authService.requireAuthentication).toHaveBeenCalled();
    });

    it('should handle delete flow with rate limiting', () => {
      // This will fail until we implement rate limiting in delete flow
      taskService.deleteTask.mockReturnValue(false); // Simulate rate limit failure
      securityService.checkRateLimit.mockReturnValue({ 
        allowed: false, 
        message: 'Rate limit exceeded' 
      });
      
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      // Should show rate limit error instead of confirmation modal
      const modal = fixture.debugElement.query(By.css('.delete-confirmation-modal'));
      expect(modal).toBeFalsy(); // Modal should not appear
      
      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      expect(errorMessage).toBeTruthy(); // This will fail until implemented
      expect(errorMessage.nativeElement.textContent).toContain('Rate limit exceeded');
    });
  });

  describe('Delete Flow Security Integration', () => {
    it('should sanitize all user inputs throughout the delete flow', () => {
      // This will fail until we implement proper sanitization
      const maliciousTask: Task = {
        ...mockTask,
        title: '<script>alert("xss")</script>Malicious Task',
        description: '<img src="x" onerror="alert(\'XSS\')">Malicious description'
      };
      
      taskService.getTasksByStatusAndProject.mockReturnValue([maliciousTask]);
      fixture.detectChanges();
      
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      // Modal should sanitize content
      const modalContent = fixture.debugElement.query(By.css('.delete-confirmation-content'));
      expect(modalContent).toBeTruthy(); // This will fail until implemented
      expect(modalContent.nativeElement.textContent).not.toContain('<script>');
      expect(modalContent.nativeElement.textContent).not.toContain('<img');
    });

    it('should log security events throughout the delete flow', () => {
      // This will fail until we implement security logging
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      // Clear previous calls
      authService.logSecurityEvent.mockClear();
      
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      // Should log delete attempt
      const deleteAttemptEvent = authService.logSecurityEvent.mock.calls.find(
        (call: any) => call[0].type === 'DELETE_ATTEMPT'
      );
      expect(deleteAttemptEvent).toBeTruthy(); // This will fail until implemented
      
      const confirmButton = fixture.debugElement.query(By.css('.confirm-delete-btn'));
      expect(confirmButton).toBeTruthy(); // This will fail until implemented
      
      confirmButton.nativeElement.click();
      
      // Should log successful deletion
      const deleteEvent = authService.logSecurityEvent.mock.calls.find(
        (call: any) => call[0].type === 'DATA_ACCESS' && call[0].message.includes('Task deleted')
      );
      expect(deleteEvent).toBeTruthy(); // This will fail until implemented
    });
  });

  describe('Delete Flow Error Handling Integration', () => {
    it('should handle service errors gracefully', () => {
      // This will fail until we implement proper error handling
      const deleteError = new Error('Service unavailable');
      taskService.deleteTask.mockImplementation(() => {
        throw deleteError;
      });
      
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      const confirmButton = fixture.debugElement.query(By.css('.confirm-delete-btn'));
      expect(confirmButton).toBeTruthy(); // This will fail until implemented
      
      confirmButton.nativeElement.click();
      fixture.detectChanges();
      
      // Should show error message but not crash
      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      expect(errorMessage).toBeTruthy(); // This will fail until implemented
      expect(errorMessage.nativeElement.textContent).toContain('Service unavailable');
    });

    it('should handle network errors gracefully', () => {
      // This will fail until we implement proper error handling
      taskService.deleteTask.mockImplementation(() => {
        throw new Error('Network error');
      });
      
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      const confirmButton = fixture.debugElement.query(By.css('.confirm-delete-btn'));
      expect(confirmButton).toBeTruthy(); // This will fail until implemented
      
      confirmButton.nativeElement.click();
      fixture.detectChanges();
      
      // Should show user-friendly error message
      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      expect(errorMessage).toBeTruthy(); // This will fail until implemented
      expect(errorMessage.nativeElement.textContent).toContain('Unable to delete task');
    });

    it('should handle authentication errors gracefully', () => {
      // This will fail until we implement proper auth error handling
      authService.requireAuthentication.mockImplementation(() => {
        throw new Error('User not authenticated');
      });
      
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      const confirmButton = fixture.debugElement.query(By.css('.confirm-delete-btn'));
      expect(confirmButton).toBeTruthy(); // This will fail until implemented
      
      confirmButton.nativeElement.click();
      fixture.detectChanges();
      
      // Should redirect to login or show auth error
      const errorMessage = fixture.debugElement.query(By.css('.error-message'));
      expect(errorMessage).toBeTruthy(); // This will fail until implemented
      expect(errorMessage.nativeElement.textContent).toContain('Please log in');
    });
  });

  describe('Delete Flow Performance Integration', () => {
    it('should complete delete flow within reasonable time', () => {
      // This will fail until we implement complete flow
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      const startTime = performance.now();
      
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      const confirmButton = fixture.debugElement.query(By.css('.confirm-delete-btn'));
      expect(confirmButton).toBeTruthy(); // This will fail until implemented
      
      confirmButton.nativeElement.click();
      fixture.detectChanges();
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should handle multiple concurrent delete attempts safely', () => {
      // This will fail until we implement proper concurrency handling
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      // Simulate rapid clicks
      deleteButton.nativeElement.click();
      deleteButton.nativeElement.click();
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      // Should only process one deletion
      const confirmButton = fixture.debugElement.query(By.css('.confirm-delete-btn'));
      expect(confirmButton).toBeTruthy(); // This will fail until implemented
      
      confirmButton.nativeElement.click();
      fixture.detectChanges();
      
      // Should only call service once
      expect(taskService.deleteTask).toHaveBeenCalledTimes(1);
    });
  });

  describe('Delete Flow Accessibility Integration', () => {
    it('should maintain focus management during the delete flow', () => {
      // This will fail until we implement proper focus management
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      // Focus should move to modal
      const modal = fixture.debugElement.query(By.css('.delete-confirmation-modal'));
      expect(modal).toBeTruthy(); // This will fail until implemented
      expect(document.activeElement).toBe(modal.nativeElement);
      
      // Focus should move to confirm button
      const confirmButton = fixture.debugElement.query(By.css('.confirm-delete-btn'));
      expect(confirmButton).toBeTruthy(); // This will fail until implemented
      expect(document.activeElement).toBe(confirmButton.nativeElement);
    });

    it('should trap focus within modal during the delete flow', () => {
      // This will fail until we implement proper focus trapping
      const deleteButton = fixture.debugElement.query(
        By.css('.task-list__action-btn--delete')
      );
      
      deleteButton.nativeElement.click();
      fixture.detectChanges();
      
      // Tab navigation should stay within modal
      const confirmButton = fixture.debugElement.query(By.css('.confirm-delete-btn'));
      const cancelButton = fixture.debugElement.query(By.css('.cancel-delete-btn'));
      
      expect(confirmButton).toBeTruthy(); // This will fail until implemented
      expect(cancelButton).toBeTruthy(); // This will fail until implemented
      
      // Focus should cycle within modal
      confirmButton.nativeElement.focus();
      expect(document.activeElement).toBe(confirmButton.nativeElement);
      
      // Simulate Tab key - should move to cancel button
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      document.dispatchEvent(tabEvent);
      
      // Focus should still be within modal
      const modal = fixture.debugElement.query(By.css('.delete-confirmation-modal'));
      expect(modal).toBeTruthy(); // This will fail until implemented
      expect(modal.nativeElement.contains(document.activeElement)).toBe(true);
    });
  });
});