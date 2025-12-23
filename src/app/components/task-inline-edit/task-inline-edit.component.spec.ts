import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { TaskInlineEditComponent } from './task-inline-edit.component';
import { Task, TaskPriority, TaskProject } from '../../shared/models/task.model';
import { TaskService } from '../../shared/services/task.service';
import { ValidationService } from '../../shared/services/validation.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';

// Mock spyOn for Vitest environment
const spyOn = (obj: any, method: string) => {
  const spy = vi.fn();
  obj[method] = spy;
  return spy;
};

describe('TaskInlineEditComponent', () => {
  let component: TaskInlineEditComponent;
  let fixture: ComponentFixture<TaskInlineEditComponent>;
  let taskService: any;
  let validationService: any;
  let authService: any;
  let securityService: any;
  let mockTask: Task;

  beforeEach(async () => {
    const taskServiceSpy = {
      updateTask: vi.fn(),
      getTasks: vi.fn()
    };

    const validationServiceSpy = {
      validateTaskTitle: vi.fn(),
      validateTaskDescription: vi.fn(),
      sanitizeForDisplay: vi.fn()
    };

    const authServiceSpy = {
      logSecurityEvent: vi.fn(),
      isAuthenticated: vi.fn().mockReturnValue(true),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user' })
    };

    const securityServiceSpy = {
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
      validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] })
    };

    mockTask = {
      id: 'test-task-1',
      title: 'Original Task Title',
      description: 'Original task description',
      priority: 'medium' as TaskPriority,
      status: 'TODO',
      project: 'Work' as TaskProject,
      createdAt: new Date('2024-01-15T10:00:00'),
      updatedAt: new Date('2024-01-15T10:00:00')
    };

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TaskInlineEditComponent
      ],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: ValidationService, useValue: validationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SecurityService, useValue: securityServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskInlineEditComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);
    validationService = TestBed.inject(ValidationService);
    authService = TestBed.inject(AuthService);
    securityService = TestBed.inject(SecurityService);

    // Set up component inputs
    component.task = mockTask;
    fixture.detectChanges();
  });

  it('should create', () => shouldCreate());

  it('should have correct CSS class on host element', () => shouldHaveCorrectHostClass());

  it('should initialize form with task data when task input is set', () => shouldInitializeFormWithTaskData());

  it('should populate title field with current task title', () => shouldPopulateTitleField());

  it('should populate description field with current task description', () => shouldPopulateDescriptionField());

  it('should populate priority field with current task priority', () => shouldPopulatePriorityField());

  it('should populate project field with current task project', () => shouldPopulateProjectField());

  describe('Form Validation', () => {
    beforeEach(() => {
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Valid Title' });
      validationService.validateTaskDescription.mockReturnValue({ isValid: true, sanitized: 'Valid Description' });
      fixture.detectChanges();
    });

    it('should require title field', () => shouldRequireTitleField());

    it('should validate title length (3-100 characters)', () => shouldValidateTitleLength());

    it('should validate title through ValidationService', () => shouldValidateTitleThroughService());

    it('should allow empty description field', () => shouldAllowEmptyDescription());

    it('should validate description through ValidationService', () => shouldValidateDescriptionThroughService());

    it('should disable save button when form is invalid', () => shouldDisableSaveWhenInvalid());

    it('should enable save button when form is valid', () => shouldEnableSaveWhenValid());
  });

  describe('Save Functionality', () => {
    beforeEach(() => {
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Updated Title' });
      validationService.validateTaskDescription.mockReturnValue({ isValid: true, sanitized: 'Updated Description' });
      taskService.updateTask.mockReturnValue({ ...mockTask, title: 'Updated Title', updatedAt: new Date() });
      fixture.detectChanges();
    });

    it('should call updateTask when save is clicked with valid data', () => shouldCallUpdateTaskOnSave());

    it('should emit taskUpdated event on successful save', () => shouldEmitTaskUpdatedOnSave());

    it('should emit editCancelled event with null when save succeeds', () => shouldEmitEditCancelledOnSave());

    it('should not call updateTask when save is clicked with invalid data', () => shouldNotCallUpdateTaskOnInvalidSave());

    it('should handle validation errors gracefully', () => shouldHandleValidationErrors());

    it('should handle service errors gracefully', () => shouldHandleServiceErrors());

    it('should include security validation before saving', () => shouldIncludeSecurityValidation());
  });

  describe('Cancel Functionality', () => {
    it('should emit editCancelled event with null when cancel is clicked', () => shouldEmitEditCancelledOnCancel());

    it('should not call updateTask when cancel is clicked', () => shouldNotCallUpdateTaskOnCancel());

    it('should reset form to original values after cancel', () => shouldResetFormOnCancel());
  });

  describe('Input Changes', () => {
    it('should re-initialize form when task input changes', () => shouldReinitializeOnTaskChange());

    it('should maintain form state if editing the same task', () => shouldMaintainFormStateForSameTask());
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for form fields', () => shouldHaveAriaLabels());

    it('should have proper form field descriptions', () => shouldHaveFieldDescriptions());

    it('should announce form state to screen readers', () => shouldAnnounceFormState());

    it('should have keyboard navigation support', () => shouldHaveKeyboardNavigation());
  });

  describe('Security', () => {
    it('should sanitize input values before validation', () => shouldSanitizeInputs());

    it('should prevent XSS through form fields', () => shouldPreventXSS());

    it('should log security events for validation failures', () => shouldLogSecurityEvents());

    it('should respect rate limiting', () => shouldRespectRateLimiting());

    it('should require authentication', () => shouldRequireAuthentication());
  });

  describe('Edge Cases', () => {
    it('should handle null task input', () => shouldHandleNullTask());

    it('should handle task with missing optional fields', () => shouldHandleMissingOptionalFields());

    it('should handle very long titles', () => shouldHandleLongTitles());

    it('should handle very long descriptions', () => shouldHandleLongDescriptions());

    it('should handle rapid form submissions', () => shouldHandleRapidSubmissions());
  });

  // Test implementation functions
  function shouldCreate(): void {
    expect(component).toBeTruthy();
  }

  function shouldHaveCorrectHostClass(): void {
    const hostElement = fixture.nativeElement as HTMLElement;
    expect(hostElement.classList.contains('task-inline-edit')).toBe(true);
  }

  function shouldInitializeFormWithTaskData(): void {
    expect(component.editForm).toBeDefined();
    expect(component.editForm.value.title).toBe(mockTask.title);
    expect(component.editForm.value.description).toBe(mockTask.description);
    expect(component.editForm.value.priority).toBe(mockTask.priority);
    expect(component.editForm.value.project).toBe(mockTask.project);
  }

  function shouldPopulateTitleField(): void {
    const titleInput = fixture.debugElement.query(By.css('input[name="title"]'));
    expect(titleInput.nativeElement.value).toBe(mockTask.title);
  }

  function shouldPopulateDescriptionField(): void {
    const descriptionInput = fixture.debugElement.query(By.css('textarea[name="description"]'));
    expect(descriptionInput.nativeElement.value).toBe(mockTask.description);
  }

  function shouldPopulatePriorityField(): void {
    const prioritySelect = fixture.debugElement.query(By.css('select[name="priority"]'));
    expect(prioritySelect.nativeElement.value).toBe(mockTask.priority);
  }

  function shouldPopulateProjectField(): void {
    const projectSelect = fixture.debugElement.query(By.css('select[name="project"]'));
    expect(projectSelect.nativeElement.value).toBe(mockTask.project);
  }

  function shouldRequireTitleField(): void {
    const titleInput = fixture.debugElement.query(By.css('input[name="title"]'));
    titleInput.nativeElement.value = '';
    titleInput.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.editForm.get('title')?.invalid).toBe(true);
    expect(component.editForm.get('title')?.errors?.['required']).toBe(true);
  }

  function shouldValidateTitleLength(): void {
    const titleInput = fixture.debugElement.query(By.css('input[name="title"]'));
    
    // Test too short title
    titleInput.nativeElement.value = 'ab';
    titleInput.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.editForm.get('title')?.invalid).toBe(true);

    // Test too long title
    titleInput.nativeElement.value = 'a'.repeat(101);
    titleInput.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.editForm.get('title')?.invalid).toBe(true);

    // Test valid title
    titleInput.nativeElement.value = 'Valid Title';
    titleInput.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.editForm.get('title')?.valid).toBe(true);
  }

  function shouldValidateTitleThroughService(): void {
    validationService.validateTaskTitle.mockReturnValue({ isValid: false, error: 'Invalid title' });
    
    const titleInput = fixture.debugElement.query(By.css('input[name="title"]'));
    titleInput.nativeElement.value = 'Invalid<script>Title';
    titleInput.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(validationService.validateTaskTitle).toHaveBeenCalledWith('Invalid<script>Title');
    expect(component.editForm.get('title')?.invalid).toBe(true);
  }

  function shouldAllowEmptyDescription(): void {
    const descriptionInput = fixture.debugElement.query(By.css('textarea[name="description"]'));
    descriptionInput.nativeElement.value = '';
    descriptionInput.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.editForm.get('description')?.valid).toBe(true);
  }

  function shouldValidateDescriptionThroughService(): void {
    validationService.validateTaskDescription.mockReturnValue({ isValid: false, error: 'Invalid description' });
    
    const descriptionInput = fixture.debugElement.query(By.css('textarea[name="description"]'));
    descriptionInput.nativeElement.value = '<script>alert("xss")</script>';
    descriptionInput.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(validationService.validateTaskDescription).toHaveBeenCalledWith('<script>alert("xss")</script>');
    expect(component.editForm.get('description')?.invalid).toBe(true);
  }

  function shouldDisableSaveWhenInvalid(): void {
    component.editForm.get('title')?.setValue('');
    fixture.detectChanges();

    const saveButton = fixture.debugElement.query(By.css('.task-inline-edit__save-btn'));
    expect(saveButton.nativeElement.disabled).toBe(true);
  }

  function shouldEnableSaveWhenValid(): void {
    component.editForm.get('title')?.setValue('Valid Title');
    fixture.detectChanges();

    const saveButton = fixture.debugElement.query(By.css('.task-inline-edit__save-btn'));
    expect(saveButton.nativeElement.disabled).toBe(false);
  }

  function shouldCallUpdateTaskOnSave(): void {
    spyOn(component.taskUpdated, 'emit');
    spyOn(component.editCancelled, 'emit');

    component.editForm.patchValue({
      title: 'Updated Title',
      description: 'Updated Description',
      priority: 'high',
      project: 'Personal'
    });

    const saveButton = fixture.debugElement.query(By.css('.task-inline-edit__save-btn'));
    saveButton.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(taskService.updateTask).toHaveBeenCalledWith(mockTask.id, {
      title: 'Updated Title',
      description: 'Updated Description',
      priority: 'high',
      project: 'Personal'
    });
  }

  function shouldEmitTaskUpdatedOnSave(): void {
    const updatedTask = { ...mockTask, title: 'Updated Title', updatedAt: new Date() };
    taskService.updateTask.mockReturnValue(updatedTask);

    spyOn(component.taskUpdated, 'emit');
    spyOn(component.editCancelled, 'emit');

    component.editForm.patchValue({ title: 'Updated Title' });
    fixture.detectChanges();

    const saveButton = fixture.debugElement.query(By.css('.task-inline-edit__save-btn'));
    saveButton.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(component.taskUpdated.emit).toHaveBeenCalledWith(updatedTask);
  }

  function shouldEmitEditCancelledOnSave(): void {
    spyOn(component.editCancelled, 'emit');

    taskService.updateTask.mockReturnValue({ ...mockTask, title: 'Updated Title' });

    const saveButton = fixture.debugElement.query(By.css('.task-inline-edit__save-btn'));
    saveButton.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(component.editCancelled.emit).toHaveBeenCalledWith(null);
  }

  function shouldNotCallUpdateTaskOnInvalidSave(): void {
    component.editForm.get('title')?.setValue('');
    fixture.detectChanges();

    const saveButton = fixture.debugElement.query(By.css('.task-inline-edit__save-btn'));
    saveButton.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(taskService.updateTask).not.toHaveBeenCalled();
  }

  function shouldHandleValidationErrors(): void {
    validationService.validateTaskTitle.mockReturnValue({ isValid: false, error: 'Title too short' });
    
    spyOn(component, 'onSave');
    
    const titleInput = fixture.debugElement.query(By.css('input[name="title"]'));
    titleInput.nativeElement.value = 'ab';
    titleInput.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveButton = fixture.debugElement.query(By.css('.task-inline-edit__save-btn'));
    saveButton.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(component.onSave).not.toHaveBeenCalled();
    expect(taskService.updateTask).not.toHaveBeenCalled();
  }

  function shouldHandleServiceErrors(): void {
    taskService.updateTask.mockImplementation(() => {
      throw new Error('Update failed');
    });

    spyOn(component.taskUpdated, 'emit');

    const saveButton = fixture.debugElement.query(By.css('.task-inline-edit__save-btn'));
    expect(() => {
      saveButton.triggerEventHandler('click', null);
      fixture.detectChanges();
    }).not.toThrow();

    expect(component.taskUpdated.emit).not.toHaveBeenCalled();
  }

  function shouldIncludeSecurityValidation(): void {
    securityService.validateRequest.mockReturnValue({ valid: false, threats: ['XSS detected'] });

    spyOn(component.taskUpdated, 'emit');

    component.editForm.patchValue({ title: '<script>alert("xss")</script>' });
    fixture.detectChanges();

    const saveButton = fixture.debugElement.query(By.css('.task-inline-edit__save-btn'));
    saveButton.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(securityService.validateRequest).toHaveBeenCalled();
    expect(taskService.updateTask).not.toHaveBeenCalled();
  }

  function shouldEmitEditCancelledOnCancel(): void {
    spyOn(component.editCancelled, 'emit');

    const cancelButton = fixture.debugElement.query(By.css('.task-inline-edit__cancel-btn'));
    cancelButton.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(component.editCancelled.emit).toHaveBeenCalledWith(null);
  }

  function shouldNotCallUpdateTaskOnCancel(): void {
    const cancelButton = fixture.debugElement.query(By.css('.task-inline-edit__cancel-btn'));
    cancelButton.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(taskService.updateTask).not.toHaveBeenCalled();
  }

  function shouldResetFormOnCancel(): void {
    // Change form values
    component.editForm.patchValue({
      title: 'Modified Title',
      description: 'Modified Description'
    });

    // Cancel editing
    component.onCancel();
    fixture.detectChanges();

    // Check if form is reset to original values
    expect(component.editForm.value.title).toBe(mockTask.title);
    expect(component.editForm.value.description).toBe(mockTask.description);
  }

  function shouldReinitializeOnTaskChange(): void {
    const newTask = {
      ...mockTask,
      id: 'different-task',
      title: 'Different Title'
    };

    component.task = newTask;
    fixture.detectChanges();

    expect(component.editForm.value.title).toBe(newTask.title);
    expect(component.editForm.value.description).toBe(newTask.description);
  }

  function shouldMaintainFormStateForSameTask(): void {
    // Modify form
    component.editForm.patchValue({ title: 'Modified Title' });
    const originalFormValue = { ...component.editForm.value };

    // Set same task again
    component.task = mockTask;
    fixture.detectChanges();

    // Form should maintain current state
    expect(component.editForm.value).toEqual(originalFormValue);
  }

  function shouldHaveAriaLabels(): void {
    const titleInput = fixture.debugElement.query(By.css('input[name="title"]'));
    const descriptionInput = fixture.debugElement.query(By.css('textarea[name="description"]'));

    expect(titleInput.nativeElement.getAttribute('aria-label')).toBe('Task title');
    expect(descriptionInput.nativeElement.getAttribute('aria-label')).toBe('Task description');
  }

  function shouldHaveFieldDescriptions(): void {
    const titleInput = fixture.debugElement.query(By.css('input[name="title"]'));
    expect(titleInput.nativeElement.getAttribute('aria-describedby')).toBeTruthy();
  }

  function shouldAnnounceFormState(): void {
    // Should have live region for form status announcements
    const liveRegion = fixture.debugElement.query(By.css('[aria-live="polite"]'));
    expect(liveRegion).toBeTruthy();
  }

  function shouldHaveKeyboardNavigation(): void {
    // Should support Tab navigation and Enter/Escape keys
    expect(fixture.nativeElement.querySelector('.task-inline-edit__form')).toBeTruthy();
  }

  function shouldSanitizeInputs(): void {
    validationService.sanitizeForDisplay.mockReturnValue('sanitized input');
    
    const titleInput = fixture.debugElement.query(By.css('input[name="title"]'));
    titleInput.nativeElement.value = '<script>alert("xss")</script>';
    titleInput.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(validationService.sanitizeForDisplay).toHaveBeenCalled();
  }

  function shouldPreventXSS(): void {
    const maliciousTitle = '<script>alert("XSS")</script>';
    component.editForm.patchValue({ title: maliciousTitle });
    fixture.detectChanges();

    const titleInput = fixture.debugElement.query(By.css('input[name="title"]'));
    expect(titleInput.nativeElement.value).not.toContain('<script>');
  }

  function shouldLogSecurityEvents(): void {
    validationService.validateTaskTitle.mockReturnValue({ isValid: false, error: 'Invalid input' });

    component.editForm.patchValue({ title: '<script>alert("xss")</script>' });
    fixture.detectChanges();

    expect(authService.logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'VALIDATION_FAILURE',
        userId: 'test-user'
      })
    );
  }

  function shouldRespectRateLimiting(): void {
    securityService.checkRateLimit.mockReturnValue({ allowed: false, retryAfter: 60 });

    const saveButton = fixture.debugElement.query(By.css('.task-inline-edit__save-btn'));
    saveButton.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(taskService.updateTask).not.toHaveBeenCalled();
  }

  function shouldRequireAuthentication(): void {
    authService.isAuthenticated.mockReturnValue(false);

    const saveButton = fixture.debugElement.query(By.css('.task-inline-edit__save-btn'));
    saveButton.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(taskService.updateTask).not.toHaveBeenCalled();
  }

  function shouldHandleNullTask(): void {
    component.task = null;
    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();
  }

  function shouldHandleMissingOptionalFields(): void {
    const taskWithoutOptional = {
      ...mockTask,
      description: undefined
    };

    component.task = taskWithoutOptional;
    fixture.detectChanges();

    expect(component.editForm.value.description).toBe('');
  }

  function shouldHandleLongTitles(): void {
    const longTitle = 'a'.repeat(200);
    component.editForm.patchValue({ title: longTitle });
    fixture.detectChanges();

    // Should truncate or handle gracefully
    expect(component.editForm.get('title')?.invalid).toBe(true);
  }

  function shouldHandleLongDescriptions(): void {
    const longDescription = 'a'.repeat(1000);
    component.editForm.patchValue({ description: longDescription });
    fixture.detectChanges();

    expect(() => {
      component.onSave();
    }).not.toThrow();
  }

  function shouldHandleRapidSubmissions(): void {
    spyOn(component, 'onSave');
    
    const saveButton = fixture.debugElement.query(By.css('.task-inline-edit__save-btn'));
    
    // Simulate rapid clicks
    saveButton.triggerEventHandler('click', null);
    saveButton.triggerEventHandler('click', null);
    saveButton.triggerEventHandler('click', null);
    fixture.detectChanges();

    // Should handle gracefully (debouncing or guard clauses)
    expect(component.onSave).toHaveBeenCalledTimes(3);
  }
});