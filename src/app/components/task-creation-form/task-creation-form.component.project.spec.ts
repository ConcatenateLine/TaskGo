import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { TaskCreationFormComponent } from "./task-creation-form.component";
import { Task, TaskPriority, TaskProject } from "../../shared/models/task.model";
import { TaskService } from "../../shared/services/task.service";
import { ValidationService } from "../../shared/services/validation.service";
import { AuthService } from "../../shared/services/auth.service";
import { SecurityService } from "../../shared/services/security.service";

describe('TaskCreationFormComponent - US-007: Project Field', () => {
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
      validateTaskTitle: vi.fn().mockReturnValue({ isValid: true, sanitized: mockTaskData.title }),
      validateTaskDescription: vi.fn().mockReturnValue({ isValid: true, sanitized: mockTaskData.description }),
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

    fixture = TestBed.createComponent(TaskCreationFormComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
  });

  describe('Component Initialization', () => {
    it('should initialize form with project field', () => {
      const form = component.taskForm;

      expect(form).toBeTruthy();
      expect(form.contains('project')).toBe(true);
    });

    it('should set default project value to General', () => {
      const projectControl = component.taskForm.get('project');

      expect(projectControl).toBeTruthy();
      expect(projectControl!.value).toBe('General');
    });

    it('should have project field as required', () => {
      const projectControl = component.taskForm.get('project');

      expect(projectControl).toBeTruthy();
      expect(projectControl!.hasValidator(Validators.required)).toBe(true);
    });
  });

  describe('Template Rendering - Project Field', () => {
    it('should render project select element in form', async () => {
      // Basic test to ensure template is rendered
      expect(component).toBeTruthy();
      expect(component.taskForm).toBeTruthy();

      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;

      // Check if form exists
      const form = compiled.querySelector('form');
      expect(form).toBeTruthy();

      // Check if any select elements exist
      const allSelects = compiled.querySelectorAll('select');
      expect(allSelects.length).toBeGreaterThan(0);

      // Try to find project select by multiple selectors
      const projectSelect1 = compiled.querySelector('#project');
      const projectSelect2 = compiled.querySelector('select[id="project"]');
      const projectSelect3 = compiled.querySelector('select[formControlName="project"]');

      // At least one should work
      expect(projectSelect1 || projectSelect2 || projectSelect3).toBeTruthy();

      const projectOptions = compiled.querySelectorAll('select[id="project"] option');
      expect(projectOptions.length).toBe(4);
      expect(projectOptions[0].value).toBe('Personal');
      expect(projectOptions[1].value).toBe('Work');
      expect(projectOptions[2].value).toBe('Study');
      expect(projectOptions[3].value).toBe('General');
    });

    it('should render project label', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const projectLabel = compiled.querySelector('label[for="project"]');
      expect(projectLabel).toBeTruthy();
      expect(projectLabel!.textContent).toContain('Project');
    });

    it('should have proper ARIA attributes for project field', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const projectSelect = compiled.querySelector('select[id="project"]');
      expect(projectSelect).toBeTruthy();
      expect(projectSelect!.getAttribute('aria-label')).toBe('Select project');
      expect(projectSelect!.getAttribute('aria-required')).toBe('true');
    });
  });

  describe('Form Validation - Project Field', () => {
    it('should be invalid when project is empty', () => {
      const projectControl = component.taskForm.get('project');
      projectControl!.setValue('');
      fixture.detectChanges();
      expect(projectControl!.invalid).toBe(true);
      expect(projectControl!.errors?.['required']).toBe(true);
    });

    it('should be valid for Personal project', () => {
      const projectControl = component.taskForm.get('project');
      projectControl!.setValue('Personal');
      fixture.detectChanges();
      expect(projectControl!.valid).toBe(true);
    });

    it('should be valid for Work project', () => {
      const projectControl = component.taskForm.get('project');
      projectControl!.setValue('Work');
      fixture.detectChanges();
      expect(projectControl!.valid).toBe(true);
    });

    it('should be valid for Study project', () => {
      const projectControl = component.taskForm.get('project');
      projectControl!.setValue('Study');
      fixture.detectChanges();
      expect(projectControl!.valid).toBe(true);
    });

    it('should be valid for General project', () => {
      const projectControl = component.taskForm.get('project');
      projectControl!.setValue('General');
      fixture.detectChanges();
      expect(projectControl!.valid).toBe(true);
    });

    it('should maintain default project value on form reset', () => {
      const projectControl = component.taskForm.get('project');

      component.taskForm.patchValue({
        title: 'Test Task',
        description: 'Test Description',
        priority: 'medium',
        project: 'Work'
      });

      component.resetForm();

      expect(projectControl!.value).toBe('General');
    });
  });

  describe('Task Creation with Project', () => {
    beforeEach(() => {
      const createdTask: Task = {
        ...mockTaskData,
        id: 'test-id-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      taskService.createTask.mockReturnValue(createdTask);
    });

    it('should call taskService.createTask with project value', () => {
      component.taskForm.patchValue({
        ...mockTaskData,
        project: 'Work'
      });

      component.onSubmit();

      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'Work'
        })
      );
    });

    it('should create task with Personal project', () => {
      component.taskForm.patchValue({
        ...mockTaskData,
        project: 'Personal'
      });

      component.onSubmit();

      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'Personal'
        })
      );
    });

    it('should create task with Study project', () => {
      component.taskForm.patchValue({
        ...mockTaskData,
        project: 'Study'
      });

      component.onSubmit();

      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'Study'
        })
      );
    });

    it('should use default General project when not explicitly set', () => {
      component.taskForm.patchValue({
        title: 'Test Task',
        priority: 'medium'
      });

      component.onSubmit();

      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'General'
        })
      );
    });

    it('should include project in emitted taskCreated event', () => {
      const createdTask: Task = {
        ...mockTaskData,
        id: 'test-id-123',
        project: 'Work',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      taskService.createTask.mockReturnValue(createdTask);

      const emitSpy = vi.spyOn(component.taskCreated, 'emit');

      component.taskForm.patchValue({
        ...mockTaskData,
        project: 'Work'
      });
      component.onSubmit();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'Work'
        })
      );
    });
  });

  describe('User Interaction - Project Selection', () => {
    it('should update form value when project is changed', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const projectSelect = compiled.querySelector('select[formControlName="project"]') as HTMLSelectElement;

      if (projectSelect) {
        projectSelect.value = 'Work';
        projectSelect.dispatchEvent(new Event('change'));
        fixture.detectChanges();
        await fixture.whenStable();
      }

      expect(component.taskForm.get('project')!.value).toBe('Work');
    });

    it('should show project validation errors when invalid', () => {
      component.taskForm.get('project')!.setValue('');
      component.taskForm.get('project')!.markAsTouched();
      fixture.detectChanges();

      const projectSelect = fixture.debugElement.query(By.css('select[formControlName="project"]'));

      expect(component.taskForm.get('project')!.invalid).toBe(true);
      expect(component.taskForm.get('project')!.errors?.['required']).toBe(true);
    });
  });

  describe('Accessibility - Project Field', () => {
    it('should have proper label association for project field', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;

      const projectLabel = compiled.querySelector('label[for="project"]');
      const projectSelect = compiled.querySelector('select[formControlName="project"]');

      expect(projectLabel).toBeTruthy();
      expect(projectSelect!.getAttribute('id')).toBeTruthy();
      expect(projectLabel!.getAttribute('for')).toBe(projectSelect!.getAttribute('id'));
    });

    it('should provide clear option labels for screen readers', async () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const projectOptions = compiled.querySelectorAll('select[formControlName="project"] option');

      if (projectOptions.length >= 4) {
        expect(projectOptions[0].textContent.trim()).toBe('Personal');
        expect(projectOptions[1].textContent.trim()).toBe('Work');
        expect(projectOptions[2].textContent.trim()).toBe('Study');
        expect(projectOptions[3].textContent.trim()).toBe('General');
      } else {
        // Fail with descriptive message if options not found
        expect(projectOptions.length).toBeGreaterThanOrEqual(4);
      }
    });

    it('should indicate project field is required to screen readers', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;

      const projectSelect = compiled.querySelector('select[formControlName="project"]');
      const projectLabel = compiled.querySelector('label[for="project"]');

      expect(projectSelect!.getAttribute('aria-required')).toBe('true');
      expect(projectLabel!.textContent).toContain('*');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null project value gracefully', () => {
      expect(() => {
        component.taskForm.get('project')!.setValue(null as any);
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should handle undefined project value gracefully', () => {
      expect(() => {
        component.taskForm.get('project')!.setValue(undefined as any);
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should prevent creation when project is invalid', () => {
      component.taskForm.patchValue({
        title: 'Valid Task',
        priority: 'medium',
        project: ''
      });

      component.onSubmit();

      expect(taskService.createTask).not.toHaveBeenCalled();
    });

    it('should maintain project value after validation errors on other fields', () => {
      component.taskForm.patchValue({
        title: 'AB',
        priority: 'medium',
        project: 'Personal'
      });

      component.onSubmit();

      expect(component.taskForm.get('project')!.value).toBe('Personal');
    });
  });
});
