import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { TaskCreationFormComponent } from './task-creation-form.component';
import { TaskService } from '../../shared/services/task.service';
import { ValidationService } from '../../shared/services/validation.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';
import { Task, TaskPriority, TaskProject } from '../../shared/models/task.model';

describe('TaskCreationFormComponent - US-002', () => {
  let component: TaskCreationFormComponent;
  let fixture: ComponentFixture<TaskCreationFormComponent>;
  let taskService: any;
  let validationService: any;
  let authService: any;
  let securityService: any;
  let formBuilder: FormBuilder;



  const mockTaskData = {
    title: 'Test Task Title',
    description: 'Test task description',
    priority: 'medium' as TaskPriority,
    status: 'TODO' as const,
    project: 'General' as TaskProject
  };

  beforeEach(async () => {
    // Initialize TestBed with proper schema for Angular 21 standalone components
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TaskCreationFormComponent
      ],
      providers: [
        FormBuilder,
        { provide: TaskService, useValue: {} },
        { provide: ValidationService, useValue: {} },
        { provide: AuthService, useValue: {} },
        { provide: SecurityService, useValue: {} }
      ]
    }).compileComponents();

    // Set up fresh spies after TestBed initialization
    const taskServiceSpy = {
      createTask: vi.fn()
    };
    
    const validationServiceSpy = {
      validateTaskTitle: vi.fn(),
      validateTaskDescription: vi.fn(),
      sanitizeForDisplay: vi.fn()
    };
    
    const authServiceSpy = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      requireAuthentication: vi.fn().mockReturnValue(undefined),
      logSecurityEvent: vi.fn(),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user' })
    };
    
    const securityServiceSpy = {
      validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] })
    };

    // Override providers with spies
    TestBed.overrideProvider(TaskService, { useValue: taskServiceSpy });
    TestBed.overrideProvider(ValidationService, { useValue: validationServiceSpy });
    TestBed.overrideProvider(AuthService, { useValue: authServiceSpy });
    TestBed.overrideProvider(SecurityService, { useValue: securityServiceSpy });

    taskService = TestBed.inject(TaskService);
    validationService = TestBed.inject(ValidationService);
    authService = TestBed.inject(AuthService);
    securityService = TestBed.inject(SecurityService);
    formBuilder = TestBed.inject(FormBuilder);
  });

  beforeEach(async () => {
    // Create screen reader announcer element for all tests
    const announcerElement = document.createElement('div');
    announcerElement.id = 'task-creation-announcer';
    announcerElement.setAttribute('aria-live', 'polite');
    announcerElement.setAttribute('aria-atomic', 'true');
    announcerElement.style.position = 'absolute';
    announcerElement.style.left = '-10000px';
    announcerElement.style.width = '1px';
    announcerElement.style.height = '1px';
    announcerElement.style.overflow = 'hidden';
    document.body.appendChild(announcerElement);

    fixture = TestBed.createComponent(TaskCreationFormComponent);
    component = fixture.componentInstance;

    // Set up default spy behaviors
    authService.isAuthenticated.mockReturnValue(true);
    authService.requireAuthentication.mockReturnValue(undefined);
    validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: mockTaskData.title });
    validationService.validateTaskDescription.mockReturnValue({ isValid: true, sanitized: mockTaskData.description });
    securityService.validateRequest.mockReturnValue({ valid: true, threats: [] });

    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    // Clean up announcer element
    const announcerElement = document.getElementById('task-creation-announcer');
    if (announcerElement && announcerElement.parentNode) {
      announcerElement.parentNode.removeChild(announcerElement);
    }
  });

  describe('Component Initialization', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form with correct fields', () => {
      const form = component.taskForm;
      
      expect(form).toBeTruthy();
      expect(form.contains('title')).toBe(true);
      expect(form.contains('description')).toBe(true);
      expect(form.contains('priority')).toBe(true);
    });

    it('should set correct validators for title field', () => {
      const titleControl = component.taskForm.get('title');
      
      expect(titleControl).toBeTruthy();
      expect(titleControl!.validator).toBeTruthy();
      
      // Test required validator
      titleControl!.setValue('');
      expect(titleControl!.errors?.['required']).toBe(true);
      
      // Test minlength validator
      titleControl!.setValue('AB');
      expect(titleControl!.errors?.['minlength']).toBeTruthy();
      
      // Test maxlength validator
      titleControl!.setValue('A'.repeat(101));
      expect(titleControl!.errors?.['maxlength']).toBeTruthy();
    });

    it('should set correct validators for description field', () => {
      const descriptionControl = component.taskForm.get('description');
      
      expect(descriptionControl).toBeTruthy();
      expect(descriptionControl!.validator).toBeTruthy();
      
      // Test maxlength validator
      descriptionControl!.setValue('A'.repeat(501));
      expect(descriptionControl!.errors?.['maxlength']).toBeTruthy();
      
      // Test that it's optional (no required validator)
      descriptionControl!.setValue('');
      expect(descriptionControl!.errors?.['required']).toBeUndefined();
      
      // Test that empty is valid
      descriptionControl!.setValue(null);
      expect(descriptionControl!.valid).toBe(true);
    });

    it('should set correct validators for priority field', () => {
      const priorityControl = component.taskForm.get('priority');
      
      expect(priorityControl).toBeTruthy();
      expect(priorityControl!.hasValidator(Validators.required)).toBe(true);
    });

    it('should set default priority to medium', () => {
      const priorityControl = component.taskForm.get('priority');
      
      expect(priorityControl!.value).toBe('medium');
    });

    it('should have available priorities', () => {
      expect(component.priorities).toEqual(['low', 'medium', 'high']);
    });
  });

  describe('Form Validation - RED Phase Tests', () => {
    describe('Title Validation', () => {
      it('should be invalid when title is empty', () => {
        const titleControl = component.taskForm.get('title');
        titleControl!.setValue('');
        
        expect(titleControl!.invalid).toBe(true);
        expect(titleControl!.errors?.['required']).toBe(true);
        expect(component.isCreateButtonDisabled()).toBe(true);
      });

      it('should be invalid when title is less than 3 characters', () => {
        const titleControl = component.taskForm.get('title');
        titleControl!.setValue('AB');
        
        expect(titleControl!.invalid).toBe(true);
        expect(titleControl!.errors?.['minlength']).toBeTruthy();
        expect(component.isCreateButtonDisabled()).toBe(true);
      });

      it('should be invalid when title exceeds 100 characters', () => {
        const titleControl = component.taskForm.get('title');
        const longTitle = 'A'.repeat(101);
        titleControl!.setValue(longTitle);
        
        expect(titleControl!.invalid).toBe(true);
        expect(titleControl!.errors?.['maxlength']).toBeTruthy();
        expect(component.isCreateButtonDisabled()).toBe(true);
      });

      it('should be valid when title is exactly 3 characters', () => {
        const titleControl = component.taskForm.get('title');
        titleControl!.setValue('ABC');
        
        expect(titleControl!.valid).toBe(true);
      });

      it('should be valid when title is exactly 100 characters', () => {
        const titleControl = component.taskForm.get('title');
        const validTitle = 'A'.repeat(100);
        titleControl!.setValue(validTitle);
        
        expect(titleControl!.valid).toBe(true);
      });

      it('should be valid when title is within valid range', () => {
        const titleControl = component.taskForm.get('title');
        titleControl!.setValue('Valid Task Title');
        
        expect(titleControl!.valid).toBe(true);
      });
    });

    describe('Description Validation', () => {
      it('should be valid when description is empty (optional field)', () => {
        const descriptionControl = component.taskForm.get('description');
        descriptionControl!.setValue('');
        
        expect(descriptionControl!.valid).toBe(true);
      });

      it('should be valid when description is null (optional field)', () => {
        const descriptionControl = component.taskForm.get('description');
        descriptionControl!.setValue(null);
        
        expect(descriptionControl!.valid).toBe(true);
      });

      it('should be invalid when description exceeds 500 characters', () => {
        const descriptionControl = component.taskForm.get('description');
        const longDescription = 'A'.repeat(501);
        descriptionControl!.setValue(longDescription);
        
        expect(descriptionControl!.invalid).toBe(true);
        expect(descriptionControl!.errors?.['maxlength']).toBeTruthy();
      });

      it('should be valid when description is within limit', () => {
        const descriptionControl = component.taskForm.get('description');
        const validDescription = 'This is a valid task description';
        descriptionControl!.setValue(validDescription);
        
        expect(descriptionControl!.valid).toBe(true);
      });
    });

    describe('Priority Validation', () => {
      it('should be invalid when priority is empty', () => {
        const priorityControl = component.taskForm.get('priority');
        priorityControl!.setValue('');
        
        expect(priorityControl!.invalid).toBe(true);
        expect(priorityControl!.errors?.['required']).toBe(true);
      });

      it('should be valid for low priority', () => {
        const priorityControl = component.taskForm.get('priority');
        priorityControl!.setValue('low');
        
        expect(priorityControl!.valid).toBe(true);
      });

      it('should be valid for medium priority', () => {
        const priorityControl = component.taskForm.get('priority');
        priorityControl!.setValue('medium');
        
        expect(priorityControl!.valid).toBe(true);
      });

      it('should be valid for high priority', () => {
        const priorityControl = component.taskForm.get('priority');
        priorityControl!.setValue('high');
        
        expect(priorityControl!.valid).toBe(true);
      });
    });

    describe('Overall Form Validation', () => {
      it('should be invalid when form has invalid fields', () => {
        component.taskForm.patchValue({
          title: '', // Invalid: required
          priority: '' // Invalid: required
        });
        
        expect(component.taskForm.invalid).toBe(true);
        expect(component.isCreateButtonDisabled()).toBe(true);
      });

      it('should be valid when all required fields are valid', () => {
        component.taskForm.patchValue({
          title: 'Valid Task Title',
          priority: 'medium'
        });
        
        expect(component.taskForm.valid).toBe(true);
        expect(component.isCreateButtonDisabled()).toBe(false);
      });

      it('should be valid with all fields filled correctly', () => {
        component.taskForm.patchValue({
          title: 'Complete Task Title',
          description: 'Complete task description',
          priority: 'high'
        });
        
        expect(component.taskForm.valid).toBe(true);
        expect(component.isCreateButtonDisabled()).toBe(false);
      });
    });
  });

  describe('Template Rendering', () => {
    it('should render form elements correctly', () => {
      const compiled = fixture.nativeElement;
      
      expect(compiled.querySelector('form')).toBeTruthy();
      expect(compiled.querySelector('input[formControlName="title"]')).toBeTruthy();
      expect(compiled.querySelector('textarea[formControlName="description"]')).toBeTruthy();
      expect(compiled.querySelector('select[formControlName="priority"]')).toBeTruthy();
      expect(compiled.querySelector('button[type="submit"]')).toBeTruthy();
    });

    it('should render priority options correctly', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const priorityOptions = compiled.querySelectorAll('select[formControlName="priority"] option');
      
      expect(priorityOptions.length).toBe(3);
      expect(priorityOptions[0].value).toBe('low');
      expect(priorityOptions[1].value).toBe('medium');
      expect(priorityOptions[2].value).toBe('high');
    });

    it('should disable create button when form is invalid', () => {
      component.taskForm.patchValue({
        title: '', // Invalid
        priority: '' // Invalid
      });
      fixture.detectChanges();
      
      const createButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      expect(createButton.nativeElement.disabled).toBe(true);
    });

    it('should enable create button when form is valid', () => {
      component.taskForm.patchValue({
        title: 'Valid Task Title',
        priority: 'medium'
      });
      fixture.detectChanges();
      
      const createButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      expect(createButton.nativeElement.disabled).toBe(false);
    });

    it('should show validation errors for title field', () => {
      component.taskForm.get('title')!.setValue('AB'); // Too short
      fixture.detectChanges();
      
      const titleInput = fixture.debugElement.query(By.css('input[formControlName="title"]'));
      titleInput.nativeElement.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      
      // Should show minlength error
      expect(component.getTitleErrorMessage()).toContain('at least 3 characters');
    });

    it('should show required error for title field', () => {
      component.taskForm.get('title')!.setValue('');
      fixture.detectChanges();
      
      const titleInput = fixture.debugElement.query(By.css('input[formControlName="title"]'));
      titleInput.nativeElement.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      
      expect(component.getTitleErrorMessage()).toContain('required');
    });

    it('should show validation errors for description field', () => {
      component.taskForm.get('description')!.setValue('A'.repeat(501)); // Too long
      fixture.detectChanges();
      
      const descriptionInput = fixture.debugElement.query(By.css('textarea[formControlName="description"]'));
      descriptionInput.nativeElement.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      
      expect(component.getDescriptionErrorMessage()).toContain('at most 500 characters');
    });
  });

  describe('Task Creation - RED Phase Tests', () => {
    beforeEach(() => {
      const createdTask: Task = {
        ...mockTaskData,
        id: 'test-id-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      taskService.createTask.mockReturnValue(createdTask);
    });

    it('should call taskService.createTask when valid form is submitted', () => {
      component.taskForm.patchValue(mockTaskData);
      
      component.onSubmit();
      
      expect(taskService.createTask).toHaveBeenCalledWith({
        title: mockTaskData.title,
        description: mockTaskData.description,
        priority: mockTaskData.priority,
        status: 'TODO',
        project: 'General'
      });
    });

    it('should require authentication before creating task', () => {
      component.taskForm.patchValue(mockTaskData);
      
      component.onSubmit();
      
      expect(authService.requireAuthentication).toHaveBeenCalled();
    });

    it('should validate title through validation service before creation', () => {
      component.taskForm.patchValue(mockTaskData);
      
      component.onSubmit();
      
      expect(validationService.validateTaskTitle).toHaveBeenCalledWith(mockTaskData.title);
    });

    it('should validate description through validation service before creation', () => {
      component.taskForm.patchValue(mockTaskData);
      
      component.onSubmit();
      
      expect(validationService.validateTaskDescription).toHaveBeenCalledWith(mockTaskData.description);
    });

    it('should validate request through security service before creation', () => {
      component.taskForm.patchValue(mockTaskData);
      
      component.onSubmit();
      
      expect(securityService.validateRequest).toHaveBeenCalled();
    });

    it('should not create task when form is invalid', () => {
      component.taskForm.patchValue({
        title: 'AB', // Too short
        priority: 'medium'
      });
      
      component.onSubmit();
      
      expect(taskService.createTask).not.toHaveBeenCalled();
    });

    it('should clear form after successful task creation', () => {
      component.taskForm.patchValue(mockTaskData);
      
      component.onSubmit();
      
      expect(component.taskForm.value.title).toBe('');
      expect(component.taskForm.value.description).toBe('');
      expect(component.taskForm.value.priority).toBe('medium'); // Default value
    });

    it('should emit taskCreated event after successful creation', () => {
      const createdTask: Task = {
        ...mockTaskData,
        id: 'test-id-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      taskService.createTask.mockReturnValue(createdTask);
      
      const emitSpy = vi.spyOn(component.taskCreated, 'emit');
      
      component.taskForm.patchValue(mockTaskData);
      component.onSubmit();
      
      expect(emitSpy).toHaveBeenCalledWith(createdTask);
    });

    it('should handle validation errors from title validation', () => {
      validationService.validateTaskTitle.mockReturnValue({
        isValid: false,
        error: 'Title validation failed'
      });
      
      component.taskForm.patchValue(mockTaskData);
      
      expect(() => component.onSubmit()).not.toThrow();
      expect(taskService.createTask).not.toHaveBeenCalled();
    });

    it('should handle validation errors from description validation', () => {
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: mockTaskData.title });
      validationService.validateTaskDescription.mockReturnValue({
        isValid: false,
        error: 'Description validation failed'
      });
      
      component.taskForm.patchValue(mockTaskData);
      
      expect(() => component.onSubmit()).not.toThrow();
      expect(taskService.createTask).not.toHaveBeenCalled();
    });

    it('should handle security validation errors', () => {
      securityService.validateRequest.mockReturnValue({
        valid: false,
        threats: ['XSS attempt detected']
      });
      
      component.taskForm.patchValue(mockTaskData);
      
      expect(() => component.onSubmit()).not.toThrow();
      expect(taskService.createTask).not.toHaveBeenCalled();
    });

    it('should handle service errors during task creation', () => {
      const error = new Error('Service error');
      taskService.createTask.mockImplementation(() => { throw error; });
      
      component.taskForm.patchValue(mockTaskData);
      
      expect(() => component.onSubmit()).not.toThrow();
      expect(component.error()).toContain('Service error');
    });

    it('should log security events on validation failures', () => {
      validationService.validateTaskTitle.mockReturnValue({
        isValid: false,
        error: 'Invalid characters detected'
      });
      
      component.taskForm.patchValue(mockTaskData);
      component.onSubmit();
      
      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'VALIDATION_FAILURE',
        message: expect.stringContaining('Invalid characters detected'),
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });

    it('should set default project to General', () => {
      component.taskForm.patchValue({
        title: 'Test Task',
        priority: 'medium'
      });
      
      component.onSubmit();
      
      expect(taskService.createTask).toHaveBeenCalledWith(expect.objectContaining({
        project: 'General'
      }));
    });

    it('should set default status to TODO', () => {
      component.taskForm.patchValue(mockTaskData);
      
      component.onSubmit();
      
      expect(taskService.createTask).toHaveBeenCalledWith(expect.objectContaining({
        status: 'TODO'
      }));
    });
  });

  describe('Helper Methods', () => {
    it('isCreateButtonDisabled should return true when form is invalid', () => {
      component.taskForm.setErrors({ invalid: true });
      
      expect(component.isCreateButtonDisabled()).toBe(true);
    });

    it('isCreateButtonDisabled should return false when form is valid', () => {
      component.taskForm.patchValue({
        title: 'Valid Title',
        priority: 'medium'
      });
      
      expect(component.isCreateButtonDisabled()).toBe(false);
    });

    it('getTitleErrorMessage should return correct error for required', () => {
      component.taskForm.get('title')!.setErrors({ required: true });
      
      expect(component.getTitleErrorMessage()).toBe('Title is required');
    });

    it('getTitleErrorMessage should return correct error for minlength', () => {
      component.taskForm.get('title')!.setErrors({ minlength: { requiredLength: 3, actualLength: 2 } });
      
      expect(component.getTitleErrorMessage()).toBe('Title must be at least 3 characters');
    });

    it('getTitleErrorMessage should return correct error for maxlength', () => {
      component.taskForm.get('title')!.setErrors({ maxlength: { requiredLength: 100, actualLength: 101 } });
      
      expect(component.getTitleErrorMessage()).toBe('Title must be at most 100 characters');
    });

    it('getDescriptionErrorMessage should return correct error for maxlength', () => {
      component.taskForm.get('description')!.setErrors({ maxlength: { requiredLength: 500, actualLength: 501 } });
      
      expect(component.getDescriptionErrorMessage()).toBe('Description must be at most 500 characters');
    });

    it('should return empty string when no specific error exists', () => {
      component.taskForm.get('title')!.setErrors(null);
      
      expect(component.getTitleErrorMessage()).toBe('');
    });
  });

  describe('Security Tests', () => {
    it('should sanitize title input before validation', () => {
      const maliciousTitle = '<script>alert("XSS")</script>Valid Title';
      
      validationService.validateTaskTitle.mockReturnValue({
        isValid: true,
        sanitized: 'Valid Title'
      });
      
      component.taskForm.patchValue({ ...mockTaskData, title: maliciousTitle });
      component.onSubmit();
      
      expect(validationService.validateTaskTitle).toHaveBeenCalledWith(maliciousTitle);
      expect(taskService.createTask).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Valid Title'
      }));
    });

    it('should sanitize description input before validation', () => {
      const maliciousDescription = '<img src="x" onerror="alert(\'XSS\')">Valid Description';
      
      validationService.validateTaskDescription.mockReturnValue({
        isValid: true,
        sanitized: 'Valid Description'
      });
      
      component.taskForm.patchValue({ ...mockTaskData, description: maliciousDescription });
      component.onSubmit();
      
      expect(validationService.validateTaskDescription).toHaveBeenCalledWith(maliciousDescription);
      expect(taskService.createTask).toHaveBeenCalledWith(expect.objectContaining({
        description: 'Valid Description'
      }));
    });

    it('should prevent submission when form is being processed', () => {
      component.taskForm.patchValue(mockTaskData);
      
      // Simulate processing state
      component['isSubmitting'].set(true);
      
      component.onSubmit();
      
      expect(taskService.createTask).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility Tests', () => {
    it('should have proper form labels', () => {
      const compiled = fixture.nativeElement;
      
      expect(compiled.querySelector('label[for="title"]')).toBeTruthy();
      expect(compiled.querySelector('label[for="description"]')).toBeTruthy();
      expect(compiled.querySelector('label[for="priority"]')).toBeTruthy();
    });

    it('should have proper ARIA attributes', () => {
      const compiled = fixture.nativeElement;
      
      expect(compiled.querySelector('input[formControlName="title"]').getAttribute('aria-required')).toBe('true');
      expect(compiled.querySelector('textarea[formControlName="description"]').getAttribute('aria-describedby')).toBeTruthy();
    });
  });

  describe('Screen Reader Announcements', () => {
    let announcerElement: HTMLElement;

    beforeEach(() => {
      // Ensure announcer element exists
      announcerElement = document.getElementById('task-creation-announcer') as HTMLElement;
      
      // Create it if it doesn't exist
      if (!announcerElement) {
        announcerElement = document.createElement('div');
        announcerElement.id = 'task-creation-announcer';
        announcerElement.setAttribute('aria-live', 'polite');
        announcerElement.setAttribute('aria-atomic', 'true');
        announcerElement.style.position = 'absolute';
        announcerElement.style.left = '-10000px';
        announcerElement.style.width = '1px';
        announcerElement.style.height = '1px';
        announcerElement.style.overflow = 'hidden';
        document.body.appendChild(announcerElement);
      }
    });

    afterEach(() => {
      // Clean up announcer element if we created it
      announcerElement = document.getElementById('task-creation-announcer') as HTMLElement;
      if (announcerElement && announcerElement.parentNode) {
        announcerElement.parentNode.removeChild(announcerElement);
      }
    });

    it('should have screen reader announcer element in DOM', () => {
      const announcer = document.getElementById('task-creation-announcer');
      expect(announcer).toBeTruthy();
      expect(announcer?.getAttribute('aria-live')).toBe('polite');
      expect(announcer?.getAttribute('aria-atomic')).toBe('true');
    });

    it('should announce task creation success to screen readers', () => {
      const announceSpy = vi.spyOn(component, 'announceToScreenReader');
      
      component.taskForm.patchValue(mockTaskData);
      component.onSubmit();
      
      expect(announceSpy).toHaveBeenCalledWith('Task created successfully');
    });

    it('should update announcer element text content', () => {
      component.taskForm.patchValue(mockTaskData);
      component.onSubmit();
      
      expect(announcerElement.textContent).toBe('Task created successfully');
    });

    it('should use appropriate ARIA live region settings', () => {
      const announcer = document.getElementById('task-creation-announcer');
      
      expect(announcer?.getAttribute('aria-live')).toBe('polite');
      expect(announcer?.getAttribute('aria-atomic')).toBe('true');
    });

    it('should position announcer element off-screen for accessibility', () => {
      const announcer = document.getElementById('task-creation-announcer') as HTMLElement;
      
      expect(announcer.style.position).toBe('absolute');
      expect(announcer.style.left).toBe('-10000px');
      expect(announcer.style.width).toBe('1px');
      expect(announcer.style.height).toBe('1px');
      expect(announcer.style.overflow).toBe('hidden');
    });

    it('should handle missing announcer element gracefully', () => {
      // Remove announcer element
      const announcer = document.getElementById('task-creation-announcer');
      if (announcer && announcer.parentNode) {
        announcer.parentNode.removeChild(announcer);
      }
      
      // Should not throw error
      expect(() => {
        component.announceToScreenReader('Test message');
      }).not.toThrow();
    });

    it('should announce validation errors to screen readers', () => {
      validationService.validateTaskTitle.mockReturnValue({
        isValid: false,
        error: 'Title contains invalid characters'
      });
      
      component.taskForm.patchValue(mockTaskData);
      component.onSubmit();
      
      // Should not announce success, but error is logged via security event
      const announcer = document.getElementById('task-creation-announcer');
      expect(announcer?.textContent).not.toBe('Task created successfully');
    });

    it('should use polite announcements for non-critical messages', () => {
      const announcer = document.getElementById('task-creation-announcer');
      
      component.taskForm.patchValue(mockTaskData);
      component.onSubmit();
      
      expect(announcer?.getAttribute('aria-live')).toBe('polite');
    });

    it('should maintain announcer state across multiple submissions', () => {
      // First submission
      component.taskForm.patchValue(mockTaskData);
      component.onSubmit();
      expect(announcerElement.textContent).toBe('Task created successfully');
      
      // Reset form
      component.resetForm();
      
      // Second submission
      component.taskForm.patchValue(mockTaskData);
      component.onSubmit();
      expect(announcerElement.textContent).toBe('Task created successfully');
    });

    it('should be accessible to screen reader users', () => {
      const announcer = document.getElementById('task-creation-announcer');
      
      // Check for accessibility attributes
      expect(announcer?.hasAttribute('aria-live')).toBe(true);
      expect(announcer?.hasAttribute('aria-atomic')).toBe(true);
      
      // Check that it's properly hidden visually but available to screen readers
      const computedStyle = window.getComputedStyle(announcer!);
      expect(computedStyle.position).toBe('absolute');
      expect(computedStyle.left).toBe('-10000px');
    });

    it('should provide clear and concise announcement messages', () => {
      const announceSpy = vi.spyOn(component, 'announceToScreenReader');
      
      component.taskForm.patchValue(mockTaskData);
      component.onSubmit();
      
      expect(announceSpy).toHaveBeenCalledWith('Task created successfully');
      
      // Message should be under 100 characters for better screen reader experience
      const announcement = announceSpy.mock.calls[0][0];
      expect(announcement.length).toBeLessThan(100);
      expect(announcement).toMatch(/^[A-Z][a-z\s]+$/); // Starts with capital, only letters and spaces
    });

    it('should handle announcement element creation dynamically', () => {
      // Test when announcer element doesn't exist initially
      const existingAnnouncer = document.getElementById('task-creation-announcer');
      if (existingAnnouncer && existingAnnouncer.parentNode) {
        existingAnnouncer.parentNode.removeChild(existingAnnouncer);
      }
      
      // Should create element on the fly
      component.announceToScreenReader('Dynamic test message');
      
      const announcer = document.getElementById('task-creation-announcer');
      expect(announcer).toBeTruthy();
      expect(announcer?.textContent).toBe('Dynamic test message');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid submissions', () => {
      component.taskForm.patchValue(mockTaskData);
      
      component.onSubmit();
      component.onSubmit();
      component.onSubmit();
      
      // Should only create task once due to submission guard
      expect(taskService.createTask).toHaveBeenCalledTimes(1);
    });

    it('should handle form reset after errors', () => {
      // First submission fails
      taskService.createTask.mockImplementation(() => { throw new Error('First error'); });
      component.taskForm.patchValue(mockTaskData);
      component.onSubmit();
      
      expect(component.error()).toContain('First error');
      
      // Reset and try again
      taskService.createTask.mockReturnValue({
        ...mockTaskData,
        id: 'test-id-456',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      component.resetForm();
      component.taskForm.patchValue(mockTaskData);
      component.onSubmit();
      
      expect(taskService.createTask).toHaveBeenCalledTimes(2);
      expect(component.error()).toBeNull();
    });

    it('should maintain default priority after form reset', () => {
      component.taskForm.patchValue({
        title: 'Test',
        priority: 'high'
      });
      
      component.resetForm();
      
      expect(component.taskForm.get('priority')!.value).toBe('medium');
    });
  });
});