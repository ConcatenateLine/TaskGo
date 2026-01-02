import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { TaskInlineEditComponent } from './task-inline-edit.component';
import { Task, TaskPriority, TaskProject } from '../../shared/models/task.model';
import { TaskService } from '../../shared/services/task.service';
import { ValidationService } from '../../shared/services/validation.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';

describe('TaskInlineEditComponent - US-007: Project Field', () => {
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
      validateTaskTitle: vi.fn().mockImplementation((title: string) => {
        if (!title) {
          return { isValid: false, error: 'Title is required' };
        }
        return { isValid: true };
      }),
      validateTaskDescription: vi.fn().mockImplementation((description: string) => {
        if (!description) {
          return { isValid: true };
        }
        return { isValid: true };
      }),
      sanitizeForDisplay: vi.fn().mockImplementation((value: string) => value || '')
    };

    const authServiceSpy = {
      logSecurityEvent: vi.fn(),
      isAuthenticated: vi.fn().mockReturnValue(true),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user' }),
      requireAuthentication: vi.fn()
    };

    const securityServiceSpy = {
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
      validateRequest: vi.fn().mockImplementation((data: any) => {
        if (!data || typeof data !== 'object') {
          return { valid: true, threats: [] };
        }
        return { valid: true, threats: [] };
      })
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

    fixture.componentRef.setInput("task", mockTask);
    fixture.detectChanges();
  });

  describe('Component Initialization - Project Field', () => {
    it('should initialize form with project field', () => {
      expect(component.editForm).toBeDefined();
      expect(component.editForm.contains('project')).toBe(true);
    });

    it('should populate project field with current task project', () => {
      expect(component.editForm.value.project).toBe(mockTask.project);
    });

    it('should have projectOptions property with all projects', () => {
      expect(component.projectOptions).toEqual(['Personal', 'Work', 'Study', 'General']);
    });
  });

  describe('Template Rendering - Project Field', () => {
    it('should render project select element in form', () => {
      const compiled = fixture.nativeElement;

      const projectSelect = compiled.querySelector('select[formControlName="project"]');
      expect(projectSelect).toBeTruthy();
    });

    it('should render all project options in select', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const projectOptions = compiled.querySelectorAll('select[formControlName="project"] option');

      expect(projectOptions.length).toBe(4);
      expect(projectOptions[0].value).toBe('Personal');
      expect(projectOptions[1].value).toBe('Work');
      expect(projectOptions[2].value).toBe('Study');
      expect(projectOptions[3].value).toBe('General');
    });

    it('should render project label', () => {
      const compiled = fixture.nativeElement;

      const projectLabel = compiled.querySelector('label[for^="task-project-"]');
      expect(projectLabel).toBeTruthy();
      expect(projectLabel!.textContent).toContain('Project');
    });

    it('should have proper ARIA attributes for project field', () => {
      const compiled = fixture.nativeElement;

      const projectSelect = compiled.querySelector('select[formControlName="project"]');
      expect(projectSelect!.getAttribute('aria-label')).toBe('Select project');
      expect(projectSelect!.getAttribute('aria-required')).toBe('true');
    });
  });

  describe('Form Validation - Project Field', () => {
    beforeEach(() => {
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Valid Title' });
      validationService.validateTaskDescription.mockReturnValue({ isValid: true, sanitized: 'Valid Description' });
      fixture.detectChanges();
    });

    it('should require project field', () => {
      const projectControl = component.editForm.get('project');
      expect(projectControl).toBeTruthy();
      expect(projectControl!.hasValidator(Validators.required)).toBe(true);
    });

    it('should be valid for Personal project', () => {
      const projectControl = component.editForm.get('project');
      projectControl!.setValue('Personal');
      fixture.detectChanges();

      expect(projectControl!.valid).toBe(true);
    });

    it('should be valid for Work project', () => {
      const projectControl = component.editForm.get('project');
      projectControl!.setValue('Work');
      fixture.detectChanges();

      expect(projectControl!.valid).toBe(true);
    });

    it('should be valid for Study project', () => {
      const projectControl = component.editForm.get('project');
      projectControl!.setValue('Study');
      fixture.detectChanges();

      expect(projectControl!.valid).toBe(true);
    });

    it('should be valid for General project', () => {
      const projectControl = component.editForm.get('project');
      projectControl!.setValue('General');
      fixture.detectChanges();

      expect(projectControl!.valid).toBe(true);
    });

    it('should be invalid when project is empty', () => {
      const projectControl = component.editForm.get('project');
      projectControl!.setValue('');
      fixture.detectChanges();

      expect(projectControl!.invalid).toBe(true);
      expect(projectControl!.errors?.['required']).toBe(true);
    });
  });

  describe('Update Task with Project', () => {
    beforeEach(() => {
      validationService.validateTaskTitle.mockReturnValue({ isValid: true, sanitized: 'Updated Title' });
      validationService.validateTaskDescription.mockReturnValue({ isValid: true, sanitized: 'Updated Description' });
      taskService.updateTask.mockReturnValue({ ...mockTask, title: 'Updated Title', project: 'Personal', updatedAt: new Date() });
      fixture.detectChanges();
    });

    it('should call updateTask with project value', () => {
      component.editForm.patchValue({
        title: 'Updated Title',
        description: 'Updated Description',
        priority: 'high',
        project: 'Personal'
      });

      component.onSave();

      expect(taskService.updateTask).toHaveBeenCalledWith(
        mockTask.id,
        expect.objectContaining({
          project: 'Personal'
        })
      );
    });

    it('should update task project from Work to Personal', () => {
      component.editForm.patchValue({
        title: 'Updated Title',
        description: 'Updated Description',
        priority: 'high',
        project: 'Personal'
      });

      component.onSave();

      expect(taskService.updateTask).toHaveBeenCalledWith(
        mockTask.id,
        expect.objectContaining({
          project: 'Personal'
        })
      );
    });

    it('should update task project from Work to Study', () => {
      component.editForm.patchValue({
        title: 'Updated Title',
        description: 'Updated Description',
        priority: 'medium',
        project: 'Study'
      });

      component.onSave();

      expect(taskService.updateTask).toHaveBeenCalledWith(
        mockTask.id,
        expect.objectContaining({
          project: 'Study'
        })
      );
    });

    it('should update task project from Work to General', () => {
      component.editForm.patchValue({
        title: 'Updated Title',
        description: 'Updated Description',
        priority: 'low',
        project: 'General'
      });

      component.onSave();

      expect(taskService.updateTask).toHaveBeenCalledWith(
        mockTask.id,
        expect.objectContaining({
          project: 'General'
        })
      );
    });

    it('should emit taskUpdated with new project value', () => {
      const updatedTask = { ...mockTask, project: 'Personal', updatedAt: new Date() };
      taskService.updateTask.mockReturnValue(updatedTask);

      const emitSpy = vi.spyOn(component.taskUpdated, 'emit');

      component.editForm.patchValue({
        title: 'Updated Title',
        project: 'Personal'
      });

      component.onSave();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'Personal'
        })
      );
    });
  });

  describe('User Interaction - Project Selection', () => {
    it('should update form value when project is changed', () => {
      const compiled = fixture.nativeElement;
      const projectSelect = compiled.querySelector('select[formControlName="project"]') as HTMLSelectElement;

      projectSelect.value = 'Personal';
      projectSelect.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(component.editForm.get('project')!.value).toBe('Personal');
    });

    it('should re-populate project field when task input changes', () => {
      const newTask: Task = {
        ...mockTask,
        id: 'different-task',
        project: 'Study'
      };

      fixture.componentRef.setInput("task", newTask);
      fixture.detectChanges();

      expect(component.editForm.value.project).toBe('Study');
    });
  });

  describe('Accessibility - Project Field', () => {
    it('should have proper label association for project field', () => {
      const compiled = fixture.nativeElement;

      const projectLabel = compiled.querySelector('label[for^="task-project-"]');
      const projectSelect = compiled.querySelector('select[formControlName="project"]');

      expect(projectLabel).toBeTruthy();
      expect(projectSelect!.getAttribute('id')).toBeTruthy();
      expect(projectLabel!.getAttribute('for')).toBe(projectSelect!.getAttribute('id'));
    });

    it('should provide clear option labels for screen readers', () => {
      const compiled = fixture.nativeElement;
      const projectOptions = compiled.querySelectorAll('select[formControlName="project"] option');

      expect(projectOptions[0].textContent).toBe('Personal');
      expect(projectOptions[1].textContent).toBe('Work');
      expect(projectOptions[2].textContent).toBe('Study');
      expect(projectOptions[3].textContent).toBe('General');
    });

    it('should indicate project field is required to screen readers', () => {
      const compiled = fixture.nativeElement;

      const projectSelect = compiled.querySelector('select[formControlName="project"]');
      const projectLabel = compiled.querySelector('label[for^="task-project-"]');

      expect(projectSelect!.getAttribute('aria-required')).toBe('true');
      expect(projectLabel!.textContent).toContain('*');
    });
  });

  describe('Form Reset - Project Field', () => {
    it('should reset project field to original value on cancel', () => {
      component.editForm.patchValue({
        title: 'Modified Title',
        project: 'Personal'
      });

      component.onCancel();

      expect(component.editForm.value.project).toBe(mockTask.project);
    });

    it('should maintain original project value after cancel and reopen', () => {
      component.editForm.patchValue({
        title: 'Modified Title',
        project: 'Personal'
      });

      component.onCancel();

      fixture.componentRef.setInput("task", mockTask);
      fixture.detectChanges();

      expect(component.editForm.value.project).toBe(mockTask.project);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null project value gracefully', () => {
      expect(() => {
        component.editForm.get('project')!.setValue(null as any);
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should handle undefined project value gracefully', () => {
      expect(() => {
        component.editForm.get('project')!.setValue(undefined as any);
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should prevent update when project is invalid', () => {
      component.editForm.get('project')!.setValue('');

      const emitSpy = vi.spyOn(component.taskUpdated, 'emit');

      component.onSave();

      expect(taskService.updateTask).not.toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Security - Project Field', () => {
    it('should validate project value through security service', () => {
      component.editForm.patchValue({
        title: 'Valid Title',
        project: 'Work'
      });

      component.onSave();

      expect(securityService.validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'Work'
        })
      );
    });

    it('should log security events on validation failures', () => {
      validationService.validateTaskTitle.mockReturnValue({ isValid: false, error: 'Invalid input' });

      component.editForm.patchValue({
        title: 'Invalid Title',
        project: 'Personal'
      });

      component.onSave();

      expect(authService.logSecurityEvent).toHaveBeenCalledWith({
        type: 'VALIDATION_FAILURE',
        message: 'Invalid input',
        timestamp: expect.any(Date),
        userId: 'test-user'
      });
    });
  });
});
