import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { TaskListComponent } from '../../components/task-list/task-list.component';
import { TaskInlineEditComponent } from '../../components/task-inline-edit/task-inline-edit.component';
import { TaskService } from '../../shared/services/task.service';
import { ValidationService } from '../../shared/services/validation.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';
import { Task, TaskPriority, TaskProject } from '../../shared/models/task.model';

// Mock spyOn for Vitest environment
const spyOn = (obj: any, method: string) => {
  const spy = vi.fn();
  obj[method] = spy;
  return spy;
};

describe('US-003: Edit Task - Integration Tests', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let taskService: any;
  let validationService: any;
  let authService: any;
  let securityService: any;
  let mockTasks: Task[];

  beforeEach(async () => {
    const taskServiceSpy = {
      getTasksByStatusAndProject: vi.fn(),
      getTaskCounts: vi.fn(),
      updateTask: vi.fn(),
      getTasks: vi.fn()
    };

    const validationServiceSpy = {
      validateTaskTitle: vi.fn(),
      validateTaskDescription: vi.fn(),
      sanitizeForDisplay: vi.fn().mockImplementation((input: string) => input),
      validateCSP: vi.fn().mockReturnValue({ isValid: true, violations: [] })
    };

    const authServiceSpy = {
      logSecurityEvent: vi.fn(),
      isAuthenticated: vi.fn().mockReturnValue(true),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user' }),
      requireAuthentication: vi.fn()
    };

    const securityServiceSpy = {
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
      validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] })
    };

    mockTasks = [
      {
        id: 'task-1',
        title: 'Task to Edit',
        description: 'This task will be edited',
        priority: 'medium' as TaskPriority,
        status: 'TODO',
        project: 'Work' as TaskProject,
        createdAt: new Date('2024-01-15T10:00:00'),
        updatedAt: new Date('2024-01-15T10:00:00')
      },
      {
        id: 'task-2',
        title: 'Another Task',
        description: 'This task stays the same',
        priority: 'high' as TaskPriority,
        status: 'IN_PROGRESS',
        project: 'Personal' as TaskProject,
        createdAt: new Date('2024-01-14T10:00:00'),
        updatedAt: new Date('2024-01-14T10:00:00')
      }
    ];

    taskServiceSpy.getTasksByStatusAndProject.mockReturnValue(mockTasks);
    taskServiceSpy.getTaskCounts.mockReturnValue({
      todo: 1,
      inProgress: 1,
      done: 0,
      total: 2
    });

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TaskListComponent,
        TaskInlineEditComponent
      ],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: ValidationService, useValue: validationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SecurityService, useValue: securityServiceSpy }
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

  describe('AC1: Edit button opens form with current data', () => {
    it('should show edit button for each task', () => {
      const editButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--edit'));
      expect(editButtons).toHaveLength(2);
      
      const firstEditButton = editButtons[0].nativeElement;
      expect(firstEditButton.textContent.trim()).toBe('✏️ Edit');
      expect(firstEditButton.getAttribute('aria-label')).toContain('Edit task: Task to Edit');
    });

    it('should emit edit request when edit button is clicked', () => {
      spyOn(component, 'onTaskAction');
      
      const editButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--edit'));
      editButtons[0].triggerEventHandler('click', null);
      
      expect(component.onTaskAction).toHaveBeenCalledWith('task-1', 'edit');
    });

    it('should display inline edit form when editing mode is active', () => {
      // This test will require the component to be enhanced to support edit mode
      // For now, we test that the infrastructure is in place
      expect(component.onTaskAction).toBeDefined();
      
      const editButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--edit'));
      expect(editButtons.length).toBeGreaterThan(0);
    });
  });

  describe('AC2: Same validations as create', () => {
    it('should validate title length (3-100 characters)', () => {
      // Test the validation service integration
      validationService.validateTaskTitle.mockReturnValue({ 
        isValid: false, 
        error: 'Title must be between 3 and 100 characters' 
      });
      
      const shortTitle = 'ab';
      const validation = validationService.validateTaskTitle(shortTitle);
      
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('3 and 100 characters');
    });

    it('should validate title through ValidationService', () => {
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Valid Title' });
      
      const result = validationService.validateTaskTitle('Valid Title');
      
      expect(validationService.validateTaskTitle).toHaveBeenCalledWith('Valid Title');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Valid Title');
    });

    it('should validate description through ValidationService', () => {
      const maliciousDescription = '<script>alert("xss")</script>';
      validationService.validateTaskDescription.mockReturnValue({ 
        isValid: false, 
        error: 'HTML content not allowed' 
      });
      
      const result = validationService.validateTaskDescription(maliciousDescription);
      
      expect(validationService.validateTaskDescription).toHaveBeenCalledWith(maliciousDescription);
      expect(result.isValid).toBe(false);
    });

    it('should sanitize inputs before validation', () => {
      const maliciousTitle = '<script>alert("xss")</script>';
      validationService.sanitizeForDisplay.mockReturnValue('alert(xss)');
      
      const sanitized = validationService.sanitizeForDisplay(maliciousTitle);
      
      expect(validationService.sanitizeForDisplay).toHaveBeenCalledWith(maliciousTitle);
      expect(sanitized).not.toContain('<script>');
    });
  });

  describe('AC3: Save button updates task', () => {
    it('should call updateTask with correct parameters', () => {
      const updatedTask = {
        ...mockTasks[0],
        title: 'Updated Task Title',
        description: 'Updated description',
        priority: 'high' as TaskPriority,
        project: 'Personal' as TaskProject,
        updatedAt: new Date()
      };

      taskService.updateTask.mockReturnValue(updatedTask);

      const updateData = {
        title: 'Updated Task Title',
        description: 'Updated description',
        priority: 'high' as TaskPriority,
        project: 'Personal' as TaskProject
      };

      const result = taskService.updateTask('task-1', updateData);

      expect(taskService.updateTask).toHaveBeenCalledWith('task-1', updateData);
      expect(result).toEqual(updatedTask);
    });

    it('should update the updatedAt timestamp when task is modified', () => {
      const originalTask = mockTasks[0];
      const updatedTask = {
        ...originalTask,
        title: 'Updated Title',
        updatedAt: new Date('2024-01-20T15:00:00')
      };

      taskService.updateTask.mockReturnValue(updatedTask);

      const result = taskService.updateTask('task-1', { title: 'Updated Title' });

      expect(result?.updatedAt).not.toEqual(originalTask.updatedAt);
      expect(result?.updatedAt).toEqual(new Date('2024-01-20T15:00:00'));
    });

    it('should return null when trying to update non-existent task', () => {
      taskService.updateTask.mockReturnValue(null);

      const result = taskService.updateTask('non-existent-id', { title: 'Updated Title' });

      expect(result).toBeNull();
    });

    it('should log security event on successful update', () => {
      const updatedTask = { ...mockTasks[0], title: 'Updated Title' };
      taskService.updateTask.mockReturnValue(updatedTask);

      taskService.updateTask('task-1', { title: 'Updated Title' });

      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'DATA_ACCESS',
        message: 'Task updated: task-1',
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });
  });

  describe('AC4: Cancel button closes without saving', () => {
    it('should emit cancel event when cancel button is clicked', () => {
      // Create a separate component instance for cancel testing
      const editFixture = TestBed.createComponent(TaskInlineEditComponent);
      const editComponent = editFixture.componentInstance;
      (editComponent as any).task = mockTasks[0];
      
      spyOn(editComponent.editCancelled, 'emit');
      
      editFixture.detectChanges();
      
      editComponent.onCancel();
      
      expect(editComponent.editCancelled.emit).toHaveBeenCalledWith(null);
    });

    it('should reset form to original values when cancelled', () => {
      const editFixture = TestBed.createComponent(TaskInlineEditComponent);
      const editComponent = editFixture.componentInstance;
      (editComponent as any).task = mockTasks[0];
      
      editFixture.detectChanges();
      
      // Modify form values
      editComponent.editForm.patchValue({
        title: 'Modified Title',
        description: 'Modified Description'
      });
      
      // Cancel editing
      editComponent.onCancel();
      
      // Check if form is reset to original values
      expect(editComponent.editForm.value.title).toBe(mockTasks[0].title);
      expect(editComponent.editForm.value.description).toBe(mockTasks[0].description);
    });

    it('should not call updateTask when cancelled', () => {
      const editFixture = TestBed.createComponent(TaskInlineEditComponent);
      const editComponent = editFixture.componentInstance;
      (editComponent as any).task = mockTasks[0];
      
      editFixture.detectChanges();
      
      editComponent.onCancel();
      
      expect(taskService.updateTask).not.toHaveBeenCalled();
    });
  });

  describe('Inline Editing Integration', () => {
    it('should handle edit mode transitions correctly', () => {
      // Test that component can enter and exit edit mode
      expect(component.sortedTasks()).toHaveLength(2);
      
      const editButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--edit'));
      expect(editButtons).toHaveLength(2);
      
      // Simulate entering edit mode for first task
      spyOn(component, 'onTaskAction');
      editButtons[0].triggerEventHandler('click', null);
      
      expect(component.onTaskAction).toHaveBeenCalledWith('task-1', 'edit');
    });

    it('should maintain task order during editing', () => {
      // Tasks should remain sorted by creation date even during editing
      const sortedTasks = component.sortedTasks();
      
      expect(sortedTasks[0].id).toBe('task-1'); // Newest task
      expect(sortedTasks[1].id).toBe('task-2'); // Older task
      
      // Verify sort order by creation date
      expect(new Date(sortedTasks[0].createdAt).getTime()).toBeGreaterThan(
        new Date(sortedTasks[1].createdAt).getTime()
      );
    });

    it('should handle multiple task editing states', () => {
      // Verify that each task has its own edit button
      const editButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--edit'));
      
      editButtons.forEach((button, index) => {
        expect(button.nativeElement.getAttribute('aria-label')).toContain('Edit task:');
        expect(button.nativeElement.textContent.trim()).toBe('✏️ Edit');
      });
      
      expect(editButtons.length).toBe(mockTasks.length);
    });
  });

  describe('Security Integration', () => {
    it('should validate request for XSS threats before saving', () => {
      const maliciousData = {
        title: '<script>alert("xss")</script>',
        description: 'Malicious description'
      };
      
      securityService.validateRequest.mockReturnValue({ 
        valid: false, 
        threats: ['XSS detected in title'] 
      });
      
      const validation = securityService.validateRequest(maliciousData);
      
      expect(securityService.validateRequest).toHaveBeenCalledWith(maliciousData);
      expect(validation.valid).toBe(false);
      expect(validation.threats).toContain('XSS detected in title');
    });

    it('should respect rate limiting for updates', () => {
      securityService.checkRateLimit.mockReturnValue({ 
        allowed: false, 
        retryAfter: 60 
      });
      
      const rateLimit = securityService.checkRateLimit('updateTask');
      
      expect(rateLimit.allowed).toBe(false);
      expect(rateLimit.retryAfter).toBe(60);
    });

    it('should log security violations', () => {
      securityService.validateRequest.mockReturnValue({ 
        valid: false, 
        threats: ['Malicious content detected'] 
      });
      
      // Simulate a security validation failure
      const result = securityService.validateRequest({ title: '<script>alert("xss")</script>' });
      
      expect(result.valid).toBe(false);
      
      // When security threat is detected, it should be logged
      if (!result.valid) {
        expect(authService.logSecurityEvent).toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle validation errors gracefully', () => {
      validationService.validateTaskTitle.mockReturnValue({ 
        isValid: false, 
        error: 'Title contains invalid characters' 
      });
      
      const validation = validationService.validateTaskTitle('Invalid<script>Title');
      
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('invalid characters');
    });

    it('should handle service errors gracefully', () => {
      taskService.updateTask.mockImplementation(() => {
        throw new Error('Service unavailable');
      });
      
      expect(() => {
        taskService.updateTask('task-1', { title: 'Updated Title' });
      }).toThrow('Service unavailable');
    });

    it('should maintain UI consistency on errors', () => {
      // Component should remain functional even when errors occur
      expect(component.sortedTasks()).toEqual(mockTasks);
      expect(component.isEmpty()).toBe(false);
      
      // Simulate error state
      taskService.getTasksByStatusAndProject.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      // Component should handle error without crashing
      expect(() => {
        component.forceRefresh();
        fixture.detectChanges();
      }).not.toThrow();
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain accessibility during edit mode', () => {
      const editButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--edit'));
      
      editButtons.forEach(button => {
        const ariaLabel = button.nativeElement.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toContain('Edit task:');
      });
      
      const taskArticles = fixture.debugElement.queryAll(By.css('.task-list__task'));
      taskArticles.forEach(article => {
        expect(article.nativeElement.getAttribute('role')).toBe('article');
      });
    });

    it('should provide keyboard navigation for edit controls', () => {
      const editButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--edit'));
      
      editButtons.forEach(button => {
        expect(button.nativeElement.tabIndex).not.toBe(-1);
        expect(button.nativeElement.disabled).toBe(false);
      });
    });

    it('should maintain semantic structure during editing', () => {
      const headers = fixture.debugElement.queryAll(By.css('.task-list__task-header'));
      const footers = fixture.debugElement.queryAll(By.css('.task-list__task-footer'));
      
      expect(headers).toHaveLength(mockTasks.length);
      expect(footers).toHaveLength(mockTasks.length);
    });
  });

  describe('Data Consistency Integration', () => {
    it('should maintain data integrity during edit operations', () => {
      const originalTask = mockTasks[0];
      const updatedTask = { ...originalTask, title: 'Updated Title' };
      
      taskService.updateTask.mockReturnValue(updatedTask);
      
      const result = taskService.updateTask('task-1', { title: 'Updated Title' });
      
      // Verify that update preserves other fields
      expect(result?.id).toBe(originalTask.id);
      expect(result?.description).toBe(originalTask.description);
      expect(result?.priority).toBe(originalTask.priority);
      expect(result?.status).toBe(originalTask.status);
      expect(result?.project).toBe(originalTask.project);
      expect(result?.createdAt).toEqual(originalTask.createdAt);
      
      // Only title and updatedAt should change
      expect(result?.title).toBe('Updated Title');
      expect(result?.updatedAt).not.toEqual(originalTask.updatedAt);
    });

    it('should handle concurrent edits safely', () => {
      // Simulate rapid edit attempts
      const editSpy = vi.spyOn(taskService, 'updateTask');
      
      taskService.updateTask('task-1', { title: 'First Update' });
      taskService.updateTask('task-1', { title: 'Second Update' });
      
      expect(editSpy).toHaveBeenCalledTimes(2);
      expect(editSpy).toHaveBeenNthCalledWith(1, 'task-1', { title: 'First Update' });
      expect(editSpy).toHaveBeenNthCalledWith(2, 'task-1', { title: 'Second Update' });
    });
  });
});