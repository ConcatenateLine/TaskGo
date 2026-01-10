import { Component, inject, signal, output, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Task, TaskPriority, TaskProject } from '../../shared/models/task.model';
import { TaskService } from '../../shared/services/task.service';
import { ValidationService } from '../../shared/services/validation.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';
import { taskAnimations } from '../../animations/task-animations';

@Component({
  selector: 'app-task-creation-form',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './task-creation-form.component.html',
  styleUrls: ['./task-creation-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'task-creation-form'
  },
  animations: [
    ...taskAnimations
  ]
})
export class TaskCreationFormComponent {
  private formBuilder = inject(FormBuilder);
  private taskService = inject(TaskService);
  private validationService = inject(ValidationService);
  private authService = inject(AuthService);
  private securityService = inject(SecurityService);
  private changeDetectorRef = inject(ChangeDetectorRef);

  taskForm: FormGroup;
  isSubmitting = signal(false);
  error = signal<string | null>(null);
  showSuccessAnimation = signal(false);
  creationSuccess = signal(false);
  readonly priorities: TaskPriority[] = ['low', 'medium', 'high'];
  readonly projects: TaskProject[] = ['Personal', 'Work', 'Study', 'General'];

  taskCreated = output<Task>();
  cancelled = output<void>();

  constructor() {
    this.taskForm = this.formBuilder.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      priority: ['medium', Validators.required],
      project: ['General', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.taskForm.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      // Require authentication
      this.authService.requireAuthentication();

      const formValue = this.taskForm.value;
      const taskData = {
        title: formValue.title,
        description: formValue.description || undefined,
        priority: formValue.priority,
        status: 'TODO' as const,
        project: formValue.project || 'General' as const
      };

      // Validate title
      const titleValidation = this.validationService.validateTaskTitle(taskData.title);
      if (!titleValidation.isValid) {
        this.authService.logSecurityEvent({
          type: 'VALIDATION_FAILURE',
          message: `Task title validation failed: ${titleValidation.error}`,
          timestamp: new Date(),
          userId: this.authService.getUserContext()?.userId
        });
        throw new Error(titleValidation.error || 'Invalid task title');
      }

      // Validate description if provided
      let sanitizedDescription = taskData.description;
      if (taskData.description) {
        const descriptionValidation = this.validationService.validateTaskDescription(taskData.description);
        if (!descriptionValidation.isValid) {
          this.authService.logSecurityEvent({
            type: 'VALIDATION_FAILURE',
            message: `Task description validation failed: ${descriptionValidation.error}`,
            timestamp: new Date(),
            userId: this.authService.getUserContext()?.userId
          });
          throw new Error(descriptionValidation.error || 'Invalid task description');
        }
        sanitizedDescription = descriptionValidation.sanitized;
      }

      // Security validation
      const securityValidation = this.securityService.validateRequest(taskData);
      if (!securityValidation.valid) {
        this.authService.logSecurityEvent({
          type: 'XSS_ATTEMPT',
          message: `Security validation failed: ${securityValidation.threats.join(', ')}`,
          timestamp: new Date(),
          userId: this.authService.getUserContext()?.userId
        });
        throw new Error('Invalid input: potentially dangerous content detected');
      }

      // Create task with sanitized values
      const createdTask = this.taskService.createTask({
        title: titleValidation.sanitized || taskData.title,
        description: sanitizedDescription,
        priority: taskData.priority,
        status: taskData.status,
        project: taskData.project
      });

      // Clear form after successful creation
      this.resetForm();

      // Trigger success animation
      this.creationSuccess.set(true);
      this.showSuccessAnimation.set(true);

      // Emit event
      this.taskCreated.emit(createdTask);

      // Announce to screen readers (component level)
      this.announceToScreenReader('Task created successfully');

      // Clear success animation after it completes
      setTimeout(() => {
        this.showSuccessAnimation.set(false);
      }, 400);

      setTimeout(() => {
        this.creationSuccess.set(false);
      }, 800);

    } catch (error: any) {
      this.error.set(error.message || 'Failed to create task');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  resetForm(): void {
    this.taskForm.reset({
      title: '',
      description: '',
      priority: 'medium',
      project: 'General'
    });
    this.error.set(null);
  }

  isCreateButtonDisabled(): boolean {
    return this.taskForm.invalid || this.isSubmitting() || this.creationSuccess();
  }

  getCreateButtonState(): 'default' | 'submitting' | 'success' {
    if (this.creationSuccess()) return 'success';
    if (this.isSubmitting()) return 'submitting';
    return 'default';
  }

  getTitleErrorMessage(): string {
    const titleControl = this.taskForm.get('title');
    if (titleControl?.errors?.['required']) {
      return 'Title is required';
    }
    if (titleControl?.errors?.['minlength']) {
      return `Title must be at least ${titleControl.errors['minlength'].requiredLength} characters`;
    }
    if (titleControl?.errors?.['maxlength']) {
      return `Title must be at most ${titleControl.errors['maxlength'].requiredLength} characters`;
    }
    return '';
  }

  getDescriptionErrorMessage(): string {
    const descriptionControl = this.taskForm.get('description');
    if (descriptionControl?.errors?.['maxlength']) {
      return `Description must be at most ${descriptionControl.errors['maxlength'].requiredLength} characters`;
    }
    return '';
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  announceToScreenReader(message: string): void {
    // Implementation for screen reader announcements
    const announcementElement = document.getElementById('task-creation-announcer');
    if (announcementElement) {
      announcementElement.textContent = message;
    }
  }
}
