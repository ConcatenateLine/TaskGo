import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { TaskCreationFormComponent } from '../../components/task-creation-form/task-creation-form.component';
import { TaskService } from '../../shared/services/task.service';
import { ValidationService } from '../../shared/services/validation.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';
import { CryptoService } from '../../shared/services/crypto.service';
import { Task, TaskPriority } from '../../shared/models/task.model';

// Simple integration test wrapper
@Component({
  standalone: true,
  imports: [CommonModule, TaskCreationFormComponent],
  template: `
    <div class="integration-test-container">
      <app-task-creation-form (taskCreated)="onTaskCreated($event)"></app-task-creation-form>
      @if (createdTask) {
      <div class="task-creation-result">Task created: {{ createdTask.title }}</div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TaskCreationTestWrapper {
  createdTask: Task | null = null;

  onTaskCreated(task: Task): void {
    this.createdTask = task;
  }
}

describe('Task Creation Integration Tests - US-002', () => {
  let component: TaskCreationTestWrapper;
  let fixture: ComponentFixture<TaskCreationTestWrapper>;
  let taskService: any;
  let validationService: any;
  let authService: any;
  let securityService: any;
  let cryptoService: any;

  const validTaskData = {
    title: 'Complete Integration Test',
    description: 'This is a comprehensive integration test for task creation',
    priority: 'medium' as TaskPriority,
  };

  beforeAll(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        CommonModule,
        TaskCreationFormComponent,
        TaskCreationTestWrapper,
      ],
      providers: [
        { provide: TaskService, useValue: {} },
        { provide: ValidationService, useValue: {} },
        { provide: AuthService, useValue: {} },
        { provide: SecurityService, useValue: {} },
        { provide: CryptoService, useValue: {} },
      ],
    }).compileComponents();
  });

  beforeEach(async () => {
    const taskServiceSpy = {
      createTask: vi.fn(),
      getTasks: vi.fn().mockReturnValue([]),
      getTasksSorted: vi.fn().mockReturnValue([]),
      getTaskCounts: vi.fn().mockReturnValue({ todo: 0, inProgress: 0, done: 0, total: 0 }),
    };

    const validationServiceSpy = {
      validateTaskTitle: vi
        .fn()
        .mockImplementation((title: string) => ({ isValid: true, sanitized: 'Sanitized Title' })),
      validateTaskDescription: vi.fn().mockImplementation((description: string) => ({
        isValid: true,
        sanitized: 'Sanitized Description',
      })),
      sanitizeForDisplay: vi.fn((text: string) => text),
    };

    const authServiceSpy = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      requireAuthentication: vi.fn().mockReturnValue(undefined),
      logSecurityEvent: vi.fn(),
      getUserContext: vi.fn().mockReturnValue({ userId: 'integration-test-user' }),
    };

    const securityServiceSpy = {
      validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] }),
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 100 }),
    };

    const cryptoServiceSpy = {
      getItem: vi.fn().mockReturnValue([]),
      setItem: vi.fn(),
      clear: vi.fn(),
      getStorageKey: vi.fn().mockReturnValue('test_key'),
    };

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        CommonModule,
        TaskCreationFormComponent,
        TaskCreationTestWrapper,
      ],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: ValidationService, useValue: validationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SecurityService, useValue: securityServiceSpy },
        { provide: CryptoService, useValue: cryptoServiceSpy },
      ],
    }).compileComponents();

    taskService = TestBed.inject(TaskService);
    validationService = TestBed.inject(ValidationService);
    authService = TestBed.inject(AuthService);
    securityService = TestBed.inject(SecurityService);
    cryptoService = TestBed.inject(CryptoService);

    // Setup default mock returns
    const mockTask: Task = {
      id: 'integration-test-123',
      title: 'Sanitized Title',
      description: 'Sanitized Description',
      priority: 'medium',
      status: 'TODO',
      project: 'General',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    taskService.createTask.mockReturnValue(mockTask);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskCreationTestWrapper);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Complete Task Creation Flow', () => {
    it('should create task and emit event successfully', async () => {
      const createdTask: Task = {
        ...validTaskData,
        id: 'flow-test-123',
        status: 'TODO',
        project: 'General',
        createdAt: new Date(),
        updatedAt: new Date(),
        title: 'Sanitized Title', // Match what service returns
        description: 'Sanitized Description', // Match what service returns
      };

      taskService.createTask.mockReturnValue(createdTask);

      // Fill out form
      const titleInput = fixture.debugElement.query(
        By.css('input[formControlName="title"]')
      ).nativeElement;
      titleInput.value = validTaskData.title;
      titleInput.dispatchEvent(new Event('input'));

      const descriptionInput = fixture.debugElement.query(
        By.css('textarea[formControlName="description"]')
      ).nativeElement;
      descriptionInput.value = validTaskData.description;
      descriptionInput.dispatchEvent(new Event('input'));
      descriptionInput.dispatchEvent(new Event('blur')); // Trigger validation

      const prioritySelect = fixture.debugElement.query(
        By.css('select[formControlName="priority"]')
      ).nativeElement;
      prioritySelect.value = validTaskData.priority;
      prioritySelect.dispatchEvent(new Event('change'));
      prioritySelect.dispatchEvent(new Event('blur')); // Trigger validation

      fixture.detectChanges();

      // Submit form
      const createButton = fixture.debugElement.query(
        By.css('button[type="submit"]')
      ).nativeElement;
      expect(createButton.disabled).toBe(false);

      createButton.click();
      fixture.detectChanges();

      // Verify service was called with correct data (sanitized by validation service)
      expect(taskService.createTask).toHaveBeenCalledWith({
        title: 'Sanitized Title',
        description: 'Sanitized Description',
        priority: validTaskData.priority,
        status: 'TODO',
        project: 'General',
      });

      // Wait for async operations and check result
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();

      // Verify event was emitted
      expect(component.createdTask).toEqual(createdTask);

      // Verify result is displayed
      const resultDiv = fixture.debugElement.query(By.css('.task-creation-result'));
      expect(resultDiv).toBeTruthy();
      expect(resultDiv.nativeElement.textContent).toContain('Task created: ' + createdTask.title);
    });

    it('should show validation errors for invalid form data', async () => {
      // Try to submit empty form
      fixture.detectChanges();

      const createButton = fixture.debugElement.query(
        By.css('button[type="submit"]')
      ).nativeElement;
      expect(createButton.disabled).toBe(true);

      // Fill with invalid title (too short)
      const titleInput = fixture.debugElement.query(
        By.css('input[formControlName="title"]')
      ).nativeElement;
      titleInput.value = 'AB';
      titleInput.dispatchEvent(new Event('input'));
      titleInput.dispatchEvent(new Event('blur'));

      fixture.detectChanges();

      // Check error message
      const titleError = fixture.debugElement.query(By.css('#title-error'));
      expect(titleError).toBeTruthy();
      expect(titleError.nativeElement.textContent).toContain('at least 3 characters');

      expect(createButton.disabled).toBe(true);
    });

    it('should handle service errors gracefully', async () => {
      taskService.createTask.mockImplementation(() => {
        throw new Error('Network error occurred');
      });

      // Fill and submit form
      const titleInput = fixture.debugElement.query(
        By.css('input[formControlName="title"]')
      ).nativeElement;
      titleInput.value = validTaskData.title;
      titleInput.dispatchEvent(new Event('input'));

      const prioritySelect = fixture.debugElement.query(
        By.css('select[formControlName="priority"]')
      ).nativeElement;
      prioritySelect.value = 'medium';
      prioritySelect.dispatchEvent(new Event('change'));

      fixture.detectChanges();

      const createButton = fixture.debugElement.query(
        By.css('button[type="submit"]')
      ).nativeElement;
      createButton.click();
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();

      // Check error message
      const errorMessage = fixture.debugElement.query(By.css('.task-creation-form__error-message'));
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent).toContain('Network error occurred');

      // Verify task was not created event
      expect(component.createdTask).toBeNull();
    });
  });

  describe('Security Integration Tests', () => {
    it('should sanitize and validate malicious input', async () => {
      const maliciousTitle = '<script>alert("XSS")</script>Malicious Task';
      const maliciousDescription = '<img src="x" onerror="alert(\'XSS\')">Evil Description';

      validationService.validateTaskTitle.mockReturnValue({
        isValid: true,
        sanitized: 'Malicious Task',
      });

      validationService.validateTaskDescription.mockReturnValue({
        isValid: true,
        sanitized: 'Evil Description',
      });

      // Submit with malicious content
      const titleInput = fixture.debugElement.query(
        By.css('input[formControlName="title"]')
      ).nativeElement;
      titleInput.value = maliciousTitle;
      titleInput.dispatchEvent(new Event('input'));

      const descriptionInput = fixture.debugElement.query(
        By.css('textarea[formControlName="description"]')
      ).nativeElement;
      descriptionInput.value = maliciousDescription;
      descriptionInput.dispatchEvent(new Event('input'));

      const prioritySelect = fixture.debugElement.query(
        By.css('select[formControlName="priority"]')
      ).nativeElement;
      prioritySelect.value = 'high';
      prioritySelect.dispatchEvent(new Event('change'));

      fixture.detectChanges();

      const createButton = fixture.debugElement.query(
        By.css('button[type="submit"]')
      ).nativeElement;
      createButton.click();
      fixture.detectChanges();

      // Verify validation was called
      expect(validationService.validateTaskTitle).toHaveBeenCalledWith(maliciousTitle);
      expect(validationService.validateTaskDescription).toHaveBeenCalledWith(maliciousDescription);

      // Verify sanitized data was sent to service
      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Malicious Task',
          description: 'Evil Description',
        })
      );
    });

    it('should block XSS attempts', async () => {
      validationService.validateTaskTitle.mockReturnValue({
        isValid: false,
        error: 'Invalid input: potentially dangerous content detected',
      });

      const titleInput = fixture.debugElement.query(
        By.css('input[formControlName="title"]')
      ).nativeElement;
      titleInput.value = '<script>alert("XSS")</script>';
      titleInput.dispatchEvent(new Event('input'));

      const createButton = fixture.debugElement.query(
        By.css('button[type="submit"]')
      ).nativeElement;
      createButton.click();
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();

      // Verify security event was logged (may have multiple calls)
      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'VALIDATION_FAILURE',
        message: expect.stringContaining('Invalid input: potentially dangerous content detected'),
        timestamp: expect.any(Date),
        userId: 'integration-test-user',
      });

      // Verify task was not created
      expect(component.createdTask).toBeNull();
    });
  });

  describe('Form Validation Integration', () => {
    it('should validate all form fields correctly', async () => {
      // Test empty title
      const titleInput = fixture.debugElement.query(
        By.css('input[formControlName="title"]')
      ).nativeElement;
      titleInput.value = '';
      titleInput.dispatchEvent(new Event('input'));
      titleInput.dispatchEvent(new Event('blur'));

      fixture.detectChanges();
      let titleError = fixture.debugElement.query(By.css('#title-error'));
      expect(titleError).toBeTruthy();
      expect(titleError.nativeElement.textContent).toContain('Title is required');

      // Test short title
      titleInput.value = 'AB';
      titleInput.dispatchEvent(new Event('input'));
      titleInput.dispatchEvent(new Event('blur'));

      fixture.detectChanges();
      titleError = fixture.debugElement.query(By.css('#title-error'));
      expect(titleError.nativeElement.textContent).toContain('at least 3 characters');

      // Test long title
      titleInput.value = 'A'.repeat(101);
      titleInput.dispatchEvent(new Event('input'));
      titleInput.dispatchEvent(new Event('blur'));

      fixture.detectChanges();
      titleError = fixture.debugElement.query(By.css('#title-error'));
      expect(titleError.nativeElement.textContent).toContain('at most 100 characters');

      // Test long description
      const descriptionInput = fixture.debugElement.query(
        By.css('textarea[formControlName="description"]')
      ).nativeElement;
      descriptionInput.value = 'A'.repeat(501);
      descriptionInput.dispatchEvent(new Event('input'));
      descriptionInput.dispatchEvent(new Event('blur'));

      fixture.detectChanges();
      const descriptionError = fixture.debugElement.query(By.css('#description-error'));
      expect(descriptionError).toBeTruthy();
      expect(descriptionError.nativeElement.textContent).toContain('at most 500 characters');

      // Test valid data
      titleInput.value = 'Valid Task Title';
      titleInput.dispatchEvent(new Event('input'));
      descriptionInput.value = 'Valid description';
      descriptionInput.dispatchEvent(new Event('input'));

      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('#title-error'))).toBeFalsy();
      expect(fixture.debugElement.query(By.css('#description-error'))).toBeFalsy();
    });

    it('should enable/disable submit button based on form validity', async () => {
      const createButton = fixture.debugElement.query(
        By.css('button[type="submit"]')
      ).nativeElement;
      const titleInput = fixture.debugElement.query(
        By.css('input[formControlName="title"]')
      ).nativeElement;
      const prioritySelect = fixture.debugElement.query(
        By.css('select[formControlName="priority"]')
      ).nativeElement;

      console.log('create');

      // Should be disabled initially
      expect(createButton.disabled).toBe(true);

      // Valid title should enable button
      titleInput.value = 'Valid Title';
      titleInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // Should still be disabled if priority is not set
      expect(createButton.disabled).toBe(true);

      // Set valid priority
      prioritySelect.value = 'medium';
      prioritySelect.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // Should be enabled now
      expect(createButton.disabled).toBe(false);

      // Make title invalid again
      titleInput.value = 'AB';
      titleInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // Should be disabled again
      expect(createButton.disabled).toBe(true);
    });
  });

  describe('Accessibility Integration Tests', () => {
    it('should have proper form labels and ARIA attributes', () => {
      const titleInput = fixture.debugElement.query(
        By.css('input[formControlName="title"]')
      ).nativeElement;
      const descriptionInput = fixture.debugElement.query(
        By.css('textarea[formControlName="description"]')
      ).nativeElement;
      const prioritySelect = fixture.debugElement.query(
        By.css('select[formControlName="priority"]')
      ).nativeElement;

      // Check labels exist
      expect(fixture.debugElement.query(By.css('label[for="title"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('label[for="description"]'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('label[for="priority"]'))).toBeTruthy();

      // Check ARIA attributes
      expect(titleInput.getAttribute('aria-required')).toBe('true');
      expect(titleInput.getAttribute('aria-describedby')).toContain('title-error');
      expect(descriptionInput.getAttribute('aria-describedby')).toContain('description-error');
      expect(prioritySelect.getAttribute('aria-required')).toBe('true');
    });

    it('should provide screen reader announcements', async () => {
      // Create announcer element for testing
      const announcer = document.createElement('div');
      announcer.id = 'task-creation-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(announcer);

      // Submit valid form
      const titleInput = fixture.debugElement.query(
        By.css('input[formControlName="title"]')
      ).nativeElement;
      titleInput.value = 'Test Task';
      titleInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const createButton = fixture.debugElement.query(
        By.css('button[type="submit"]')
      ).nativeElement;
      createButton.click();
      fixture.detectChanges();

      // Instead of tick/whenStable, just wait for the microtask queue
      await new Promise(resolve => setTimeout(resolve, 0));
      fixture.detectChanges();

      // Check announcement (allow for multiple possible messages)
      expect(announcer.textContent).toContain('Task created successfully');

      // Cleanup
      document.body.removeChild(announcer);
    });
  });
});
