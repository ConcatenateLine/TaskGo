import { Component, input, computed, output, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, TaskStatus, TASK_STATUS_ORDER } from '../../shared/models/task.model';
import { TaskService } from '../../shared/services/task.service';
import { AuthService } from '../../shared/services/auth.service';
import { debounceTime } from 'rxjs/operators';
import { Subject, timer } from 'rxjs';

@Component({
  selector: 'app-task-status',
  imports: [CommonModule],
  templateUrl: './task-status.component.html',
  styleUrl: './task-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    '[attr.aria-label]': `'Task status controls'`,
    '[class.task-status]': 'true',
    '[class.task-status--mobile]': 'isMobile()',
    '[class.task-status--desktop]': '!isMobile()',
  },
})
export class TaskStatusComponent {
  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private breakpoint = signal(768);

  task = input<Task | null>(null);
  statusChange = output<{ taskId: string; newStatus: TaskStatus }>();

  protected readonly TASK_STATUS_ORDER = TASK_STATUS_ORDER;
  protected readonly isMobile = computed(() => {
    // Safe window access for test environment
    if (typeof window === 'undefined') return false;
    try {
      return window.innerWidth < this.breakpoint();
    } catch {
      // Fallback for test environment
      return false;
    }
  });

  currentStatus = computed(() => this.task()?.status ?? 'TODO');

  availableTransitions = computed(() => {
    try {
      const currentStatus = this.currentStatus();
      return this.taskService.getStatusTransitions(currentStatus);
    } catch (error) {
      console.error('Error in availableTransitions:', error);
      return [];
    }
  });

  taskCounts = computed(() => {
    try {
      return this.taskService.getTaskCounts();
    } catch (error) {
      console.error('Error in taskCounts:', error);
      return { todo: 0, inProgress: 0, done: 0, total: 0 };
    }
  });

  canMoveNext = computed(() => {
    try {
      const transitions = this.availableTransitions();
      const currentStatus = this.currentStatus();
      const currentOrder = TASK_STATUS_ORDER[currentStatus];
      return transitions.some((t) => TASK_STATUS_ORDER[t] > currentOrder);
    } catch (error) {
      console.error('Error in canMoveNext:', error);
      return false;
    }
  });

  canMovePrevious = computed(() => {
    try {
      const transitions = this.availableTransitions();
      const currentStatus = this.currentStatus();
      const currentOrder = TASK_STATUS_ORDER[currentStatus];
      return transitions.some((t) => TASK_STATUS_ORDER[t] < currentOrder);
    } catch (error) {
      console.error('Error in canMovePrevious:', error);
      return false;
    }
  });

  nextStatus = computed(() => {
    try {
      const transitions = this.availableTransitions();
      const currentStatus = this.currentStatus();
      const currentOrder = TASK_STATUS_ORDER[currentStatus];
      return transitions.find((t) => TASK_STATUS_ORDER[t] > currentOrder);
    } catch (error) {
      console.error('Error in nextStatus:', error);
      return null;
    }
  });

  previousStatus = computed(() => {
    try {
      const transitions = this.availableTransitions();
      const currentStatus = this.currentStatus();
      const currentOrder = TASK_STATUS_ORDER[currentStatus];
      return transitions.find((t) => TASK_STATUS_ORDER[t] < currentOrder);
    } catch (error) {
      console.error('Error in previousStatus:', error);
      return null;
    }
  });

  hasTransitions = computed(() => {
    try {
      return this.availableTransitions().length > 0;
    } catch (error) {
      console.error('Error in hasTransitions:', error);
      return false;
    }
  });

  loading = signal(false);
  error = signal<string | null>(null);
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  setLoading(loading: boolean): void {
    this.loading.set(loading);
  }

  getStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      TODO: 'TODO',
      IN_PROGRESS: 'IN PROGRESS',
      DONE: 'DONE',
    };
    return labels[status] || status;
  }

  getStatusDisplay(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      TODO: 'To Do',
      IN_PROGRESS: 'In Progress',
      DONE: 'Done',
    };
    return labels[status] || status;
  }

  getStatusColor(status: TaskStatus): string {
    const colors: Record<TaskStatus, string> = {
      TODO: '#6b7280',
      IN_PROGRESS: '#3b82f6',
      DONE: '#10b981',
    };
    return colors[status] || '#6b7280';
  }

  getButtonLabel(status: TaskStatus): string {
    if (!status) return '';
    const labels: Record<TaskStatus, string> = {
      TODO: '← Back',
      IN_PROGRESS: '→ Start',
      DONE: '✔️ Done',
    };
    return labels[status] || '';
  }

  getAriaLabelForStatus(status: TaskStatus): string {
    return `Current status: ${status}`;
  }

  getAriaLabelForSelect(): string {
    const task = this.task();
    return `Change task status: ${task?.title ?? ''}`;
  }

  getAriaLabelForButton(status: TaskStatus): string {
    return `Move task to ${this.getStatusDisplay(status)}`;
  }

  onSelectChange(event: Event): void {
    event.preventDefault();
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value as TaskStatus;

    // Don't change status if empty value (placeholder option) is selected
    if (!newStatus) {
      return;
    }

    this.changeStatus(newStatus);
  }

  onNextClick(): void {
    const next = this.nextStatus();
    if (next) {
      this.changeStatus(next);
    }
  }

  onPreviousClick(): void {
    const previous = this.previousStatus();
    if (previous) {
      this.changeStatus(previous);
    }
  }

  private changeStatus(newStatus: TaskStatus): void {
    if (this.loading()) {
      return;
    }

    const task = this.task();
    if (!task) {
      return;
    }

    const taskId = task.id;

    // Clear existing debounce timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Debounce status changes
    this.debounceTimeout = setTimeout(() => {
      try {
        this.setLoading(true);
        this.error.set(null);

        // Log security event
        this.authService.logSecurityEvent({
          type: 'DATA_ACCESS',
          message: `Task status changed: ${task.title} from ${task.status} to ${newStatus}`,
          timestamp: new Date(),
          userId: 'current-user',
          event: `Task status changed: ${task.title} from ${task.status} to ${newStatus}`,
        });

        const updatedTask = this.taskService.changeStatus(taskId, newStatus);

        if (updatedTask) {
          this.statusChange.emit({ taskId, newStatus });
          this.error.set(null);
        } else {
          this.error.set('Failed to change status');
        }
      } catch (error: any) {
        this.error.set(error.message || 'Failed to change status');
      } finally {
        this.setLoading(false);
      }
    }, 300); // 300ms debounce
  }
}
