import { Component, input, output, inject, OnInit, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Task, TaskPriority, TaskProject } from '../../shared/models/task.model';
import { TaskService } from '../../shared/services/task.service';
import { ValidationService } from '../../shared/services/validation.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';

@Component({
  selector: 'app-task-inline-edit',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './task-inline-edit.component.html',
  styleUrls: ['./task-inline-edit.component.scss'],
  host: {
    class: 'task-inline-edit'
  }
})
export class TaskInlineEditComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private validationService = inject(ValidationService);
  private authService = inject(AuthService);
  private securityService = inject(SecurityService);

  editForm!: FormGroup;
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  task = input<Task | null>(null);

  taskUpdated = output<Task>();
  editCancelled = output<null>();

  // Available options
  readonly priorityOptions: TaskPriority[] = ['low', 'medium', 'high'];
  readonly projectOptions: TaskProject[] = ['Personal', 'Work', 'Study', 'General'];

  ngOnInit(): void {
    this.initializeForm();
    this.populateForm();
  }

  ngOnChanges(): void {
    this.populateForm();
  }

  private initializeForm(): void {
    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: [''],
      priority: ['medium' as TaskPriority],
      project: ['General' as TaskProject]
    });

    // Add async validation for title and description
    this.editForm.get('title')?.addAsyncValidators(this.validateTitle.bind(this));
    this.editForm.get('description')?.addAsyncValidators(this.validateDescription.bind(this));
  }

  private populateForm(): void {
    const currentTask = this.task();
    if (!currentTask || !this.editForm) {
      return;
    }

    // For test environment, ensure immediate population
    this.editForm.patchValue({
      title: currentTask.title,
      description: currentTask.description || '',
      priority: currentTask.priority,
      project: currentTask.project
    });

    // Double-check for test environment - if still not populated, try again
    if (this.editForm.value.title === '') {
      // Fallback for test environment timing issues
      setTimeout(() => {
        this.editForm.patchValue({
          title: currentTask.title,
          description: currentTask.description || '',
          priority: currentTask.priority,
          project: currentTask.project
        });
      }, 0);
    }
  }

  private validateTitle(control: any): Promise<{ [key: string]: any } | null> {
    return new Promise((resolve) => {
      const title = control.value;
      if (!title) {
        resolve(null);
        return;
      }

      // Sanitize input first
      const sanitizedTitle = this.validationService.sanitizeForDisplay(title);

      // Validate through service
      const validation = this.validationService.validateTaskTitle(sanitizedTitle, false);
      if (!validation.isValid) {
        // Log security event for validation failure
        this.authService.logSecurityEvent({
          type: 'VALIDATION_FAILURE',
          message: validation.error || 'Title validation failed',
          timestamp: new Date(),
          userId: this.authService.getUserContext()?.userId
        });

        resolve({ invalidTitle: validation.error });
        return;
      }

      // Check for security threats
      const securityCheck = this.securityService.validateRequest({ title: sanitizedTitle });
      if (!securityCheck.valid) {
        resolve({ securityThreat: securityCheck.threats.join(', ') });
        return;
      }

      resolve(null);
    });
  }

  private validateDescription(control: any): Promise<{ [key: string]: any } | null> {
    return new Promise((resolve) => {
      const description = control.value;
      if (!description) {
        resolve(null);
        return;
      }

      // Sanitize input first
      const sanitizedDescription = this.validationService.sanitizeForDisplay(description);

      // Validate through service
      const validation = this.validationService.validateTaskDescription(sanitizedDescription);
      if (!validation.isValid) {
        // Log security event for validation failure
        this.authService.logSecurityEvent({
          type: 'VALIDATION_FAILURE',
          message: validation.error || 'Description validation failed',
          timestamp: new Date(),
          userId: this.authService.getUserContext()?.userId
        });

        resolve({ invalidDescription: validation.error });
        return;
      }

      // Check for security threats
      const securityCheck = this.securityService.validateRequest({ description: sanitizedDescription });
      if (!securityCheck.valid) {
        resolve({ securityThreat: securityCheck.threats.join(', ') });
        return;
      }

      resolve(null);
    });
  }

  public onSave(): void {
    if (!this.editForm.valid || this.isSubmitting()) {
      return;
    }

    const currentTask = this.task();
    if (!currentTask) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      // Check rate limiting
      const rateLimit = this.securityService.checkRateLimit('updateTask');
      if (!rateLimit.allowed) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Require authentication
      this.authService.requireAuthentication();

      const formData = this.editForm.value;

      // Prepare update data
      const updateData = {
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority as TaskPriority,
        project: formData.project as TaskProject
      };

      // Update task through service
      const updatedTask = this.taskService.updateTask(currentTask.id, updateData);

      if (updatedTask) {
        this.taskUpdated.emit(updatedTask);
        this.editCancelled.emit(null); // Signal edit mode closed
      } else {
        throw new Error('Failed to update task');
      }

    } catch (error: any) {
      this.handleError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onCancel(): void {
    this.resetForm();
    this.editCancelled.emit(null);
  }

  private resetForm(): void {
    if (this.task()) {
      this.populateForm();
    } else {
      this.editForm.reset({
        title: '',
        description: '',
        priority: 'medium',
        project: 'General'
      });
    }
    this.errorMessage.set(null);
  }

  private handleError(error: any): void {
    console.error('Error updating task:', error);

    // Log security event if applicable
    if (error.securityEvent) {
      this.authService.logSecurityEvent({
        type: error.event || 'SECURITY_ERROR',
        message: error.message || 'Security error detected',
        timestamp: new Date(),
        userId: this.authService.getUserContext()?.userId,
        event: error.event,
        severity: error.severity || 'MEDIUM'
      });
    }

    // Set user-friendly error message
    this.errorMessage.set(this.getErrorMessage(error));
  }

  private getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.message) {
      return error.message;
    }

    if (error?.error?.message) {
      return error.error.message;
    }

    return 'An error occurred while updating task. Please try again.';
  }

  // Form getters for template
  get title() { return this.editForm.get('title'); }
  get description() { return this.editForm.get('description'); }
  get priority() { return this.editForm.get('priority'); }
  get project() { return this.editForm.get('project'); }

  // Helper methods for template
  getErrorMessageForField(field: string): string {
    const control = this.editForm.get(field);
    if (!control || !control.errors) {
      return '';
    }

    const errors = control.errors;

    if (errors['required']) {
      return 'This field is required';
    }

    if (errors['minlength']) {
      return `Minimum ${errors['minlength'].requiredLength} characters required`;
    }

    if (errors['maxlength']) {
      return `Maximum ${errors['maxlength'].requiredLength} characters allowed`;
    }

    if (errors['invalidTitle']) {
      return errors['invalidTitle'];
    }

    if (errors['invalidDescription']) {
      return errors['invalidDescription'];
    }

    if (errors['securityThreat']) {
      return 'Invalid input: potentially dangerous content detected';
    }

    return 'Invalid input';
  }

  isFieldInvalid(field: string): boolean {
    const control = this.editForm.get(field);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
}
