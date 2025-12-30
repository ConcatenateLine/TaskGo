import { Component, input, computed, ChangeDetectionStrategy, signal, inject, SecurityContext, output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Task, PRIORITY_COLORS, PROJECT_COLORS } from '../../shared/models/task.model';
import { TaskService } from '../../shared/services/task.service';
import { ValidationService } from '../../shared/services/validation.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';
import { TaskInlineEditComponent } from '../task-inline-edit/task-inline-edit.component';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';

@Component({
  selector: 'app-task-list',
  imports: [CommonModule, TaskInlineEditComponent, FocusTrapDirective],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'task-list'
  }
})
export class TaskListComponent {
  private taskService = inject(TaskService);
  private validationService = inject(ValidationService);
  private authService = inject(AuthService);
  private securityService = inject(SecurityService);
  private sanitizer = inject(DomSanitizer);
  private refreshTrigger = signal(0);
  private errorState = signal<string | null>(null);
  private editingTaskId = signal<string | null>(null);
  private deleteModalOpen = signal<boolean>(false);
  private taskToDelete = signal<string | null>(null);
  private deleteInProgress = signal<Set<string>>(new Set());
  protected readonly PRIORITY_COLORS = PRIORITY_COLORS;
  createTaskRequested = output<void>();
  taskDeleted = output<void>();
  actionError = output<Error>();

  statusFilter = input<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('all');
  projectFilter = input<'all' | 'Personal' | 'Work' | 'Study' | 'General'>('all');

  filteredTasks = computed(() => {
    // Include refresh trigger to ensure reactivity
    this.refreshTrigger();

    const status = this.statusFilter();
    const project = this.projectFilter();

    try {
      const tasks = this.taskService.getTasksByStatusAndProject(status, project);

      // Handle null/undefined cases
      if (!tasks || !Array.isArray(tasks)) {
        return [];
      }

      return tasks;
    } catch (error: any) {
      // Check if this is a security-related error
      if (error && error.securityEvent) {
        this.authService.logSecurityEvent({
          type: error.event || 'SECURITY_ERROR',
          message: error.message || 'Security error detected',
          timestamp: new Date(),
          userId: this.authService.getUserContext()?.userId,
          event: error.event,
          severity: error.severity || 'MEDIUM'
        });
      }

      // Set error state for display
      this.errorState.set(this.sanitizeErrorMessage(error?.message || 'An error occurred'));

      // Return empty array on error
      return [];
    }
  });

  sortedTasks = computed(() => {
    const tasks = this.filteredTasks();
    if (!tasks || !Array.isArray(tasks)) {
      return [];
    }
    // Create a stable sort to avoid reference changes
    return [...tasks].sort((a: Task, b: Task) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  isEmpty = computed(() => this.sortedTasks().length === 0);

  taskCounts = computed(() => {
    // Include refresh trigger to ensure reactivity
    this.refreshTrigger();

    const counts = this.taskService.getTaskCounts();

    return counts || {
      todo: 0,
      inProgress: 0,
      done: 0,
      total: 0
    };
  });

  // Method to trigger re-computation for tests when mocks change
  forceRefresh(): void {
    this.refreshTrigger.set(this.refreshTrigger() + 1);
  }

  /**
   * Sanitize task title for safe display
   */
  getSanitizedTitle(task: Task): string {
    return this.validationService.sanitizeForDisplay(task.title);
  }

  /**
   * Sanitize task description for safe display
   */
  getSanitizedDescription(task: Task): string {
    if (!task.description) {
      return '';
    }
    return this.validationService.sanitizeForDisplay(task.description);
  }

  /**
   * Get safe HTML content (for descriptions that might contain HTML)
   */
  getSafeHtml(content: string): SafeHtml {
    const sanitized = this.validationService.sanitizeForDisplay(content);
    // Use sanitize to strip dangerous attributes, not bypass
    return this.sanitizer.sanitize(SecurityContext.HTML, sanitized) as SafeHtml;
  }

  /**
   * Get safe ARIA label that doesn't expose sensitive data
   */
  getSafeAriaLabel(task: Task, action: string): string {
    // Sanitize and truncate for accessibility
    const sanitizedTitle = this.getSanitizedTitle(task);
    const truncatedTitle = sanitizedTitle.length > 50
      ? sanitizedTitle.substring(0, 50) + '...'
      : sanitizedTitle;

    // Remove sensitive patterns from ARIA labels
    let safeTitle = truncatedTitle;

    // Case-insensitive password pattern replacement - more comprehensive
    safeTitle = safeTitle.replace(/[Pp]assword\s*=\s*[^\s]+/gi, 'p=***');
    safeTitle = safeTitle.replace(/secret/gi, 'sensitive');
    safeTitle = safeTitle.replace(/confidential/gi, 'private');
    safeTitle = safeTitle.replace(/Confidential/gi, 'private');

    return `${action}: ${safeTitle}`;
  }

  /**
   * Get safe live region content
   */
  getSafeLiveRegionContent(message: string): string {
    // Sanitize live region content to prevent XSS
    return this.validationService.sanitizeForDisplay(message);
  }

  /**
    * Handle very long titles safely
    */
  getTruncatedTitle(task: Task, maxLength: number = 500): string {
    const sanitized = this.getSanitizedTitle(task);
    if (sanitized.length > maxLength) {
      return sanitized.substring(0, maxLength - 3) + '...';
    }
    return sanitized;
  }



  /**
   * Get CSS classes for project badge (no inline styles)
   */
  getProjectBadgeClasses(project: Task['project']): string {
    return `task-list__badge task-list__badge--project task-list__badge--project-${project.toLowerCase()}`;
  }

  /**
    * Get inline style for priority badge color
    */
  getPriorityBadgeStyle(priority: Task['priority']): { [key: string]: string } {
    return {
      'background-color': PRIORITY_COLORS[priority],
      'color': '#ffffff',
      'padding': '2px 8px',
      'border-radius': '12px',
      'font-size': '12px',
      'font-weight': '500'
    };
  }

  getStatusDisplay(status: Task['status']): string {
    const statusMap: Record<Task['status'], string> = {
      'TODO': 'To Do',
      'IN_PROGRESS': 'In Progress',
      'DONE': 'Done'
    };
    return statusMap[status] || status;
  }

  getSafeDate(date: Date | string): Date {
    // Handle malformed dates by converting strings or invalid dates to current date
    if (!date) {
      return new Date();
    }

    if (date instanceof Date) {
      return isNaN(date.getTime()) ? new Date() : date;
    }

    // Handle string dates
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  }

  formatDate(date: Date | string): string {
    const safeDate = this.getSafeDate(date);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(safeDate);
  }

  formatDateIso(date: Date | string): string {
    const safeDate = this.getSafeDate(date);
    return safeDate.toISOString();
  }

  onCreateTask(): void {
    this.createTaskRequested.emit();
  }

  onTaskAction(taskId: string, action: 'edit' | 'delete' | 'status-change'): void {
    if (action === 'edit') {
      this.editingTaskId.set(taskId);
    } else if (action === 'delete') {
      this.openDeleteModal(taskId);
    } else {
      // These will be implemented in future user stories
      console.log(`Task ${action} clicked for task ${taskId}`);
    }
  }

  onTaskUpdated(updatedTask: Task): void {
    this.editingTaskId.set(null);
    this.forceRefresh();
  }

  onEditCancelled(): void {
    this.editingTaskId.set(null);
  }

  isEditingTask(taskId: string): boolean {
    return this.editingTaskId() === taskId;
  }

  /**
   * Open delete confirmation modal
   */
  openDeleteModal(taskId: string): void {
    this.taskToDelete.set(taskId);
    this.deleteModalOpen.set(true);

    // Log delete attempt
    this.authService.logSecurityEvent({
      type: 'DATA_ACCESS',
      message: `Task delete attempted: ${taskId}`,
      timestamp: new Date(),
      userId: this.authService.getUserContext()?.userId
    });
  }

  /**
   * Close delete confirmation modal
   */
  closeDeleteModal(): void {
    this.deleteModalOpen.set(false);
    this.taskToDelete.set(null);
  }

  /**
   * Get the task being deleted for modal display
   */
  getTaskToDelete(): Task | null {
    const taskId = this.taskToDelete();
    if (!taskId) return null;

    const tasks = this.sortedTasks();
    return tasks.find(task => task.id === taskId) || null;
  }

  /**
   * Check if delete modal is open
   */
  isDeleteModalOpen(): boolean {
    return this.deleteModalOpen();
  }

  /**
   * Get the task ID to delete for template access
   */
  getTaskToDeleteId(): string | null {
    return this.taskToDelete();
  }

  /**
   * Confirm and delete task
   */
  confirmDelete(taskId: string): boolean {
    try {
      // Validate input
      if (!taskId || taskId.trim() === '') {
        return false;
      }

      // Check rate limiting
      const rateLimit = this.securityService.checkRateLimit('deleteTask');
      if (!rateLimit.allowed) {
        this.authService.logSecurityEvent({
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Delete rate limit exceeded',
          timestamp: new Date(),
          userId: this.authService.getUserContext()?.userId
        });
        return false;
      }

      // Require authentication
      this.authService.requireAuthentication();

      // Set loading state
      this.setDeleteInProgress(taskId, true);

      // Call service to delete task
      const result = this.taskService.deleteTask(taskId);

      // Clear loading state
      this.setDeleteInProgress(taskId, false);

      if (result) {
        this.announceToScreenReader('Task deleted successfully');

        // Log delete success
        this.authService.logSecurityEvent({
          type: 'DATA_ACCESS',
          message: `Task deleted: ${taskId}`,
          timestamp: new Date(),
          userId: this.authService.getUserContext()?.userId
        });

        // Refresh task list
        this.forceRefresh();
        // Close modal
        this.closeDeleteModal();
      }

      return result;
    } catch (error: any) {
      // Clear loading state on error
      this.setDeleteInProgress(taskId, false);

      // Expose error to user
      const errorMessage = this.sanitizeErrorMessage(error.message);
      this.actionError.emit(new Error(errorMessage));

      // Announce to screen readers (component level)
      this.announceToScreenReader(errorMessage);

      // Handle errors gracefully
      console.error('Delete task error:', error);
      return false;
    }
  }

  /**
   * Set delete in progress state
   */
  setDeleteInProgress(taskId: string, inProgress: boolean): void {
    const currentSet = this.deleteInProgress();
    const newSet = new Set(currentSet);

    if (inProgress) {
      newSet.add(taskId);
    } else {
      newSet.delete(taskId);
    }

    this.deleteInProgress.set(newSet);
  }

  /**
   * Check if deletion is in progress for a task
   */
  isDeleteInProgress(taskId: string): boolean {
    return this.deleteInProgress().has(taskId);
  }

  /**
   * Sanitize error messages to prevent information leakage
   */
  private sanitizeErrorMessage(message: string): string {
    if (!message) {
      return 'An error occurred';
    }

    return message
      .replace(/password=[\w\s\-._]+/gi, 'password=***')
      .replace(/host=[\w\s\-._]+/gi, 'host=***')
      .replace(/connection\s+failed/gi, 'connection issue')
      .replace(/database/gi, 'data store')
      .replace(/<script[^>]*>/gi, '')
      .replace(/alert\s*\([^)]*\)/gi, 'alert()');
  }

  /**
   * Check if component is in error state
   */
  hasError(): boolean {
    return this.errorState() !== null;
  }

  /**
   * Get error message for display
   */
  getErrorMessage(): string {
    return this.errorState() || '';
  }

  announceToScreenReader(message: string): void {
    // Implementation for screen reader announcements
    const announcementElement = document.getElementById('task-deletion-announcer');
    if (announcementElement) {
      announcementElement.textContent = message;
    }
  }
}
