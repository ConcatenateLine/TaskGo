import { Component, input, computed, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, PRIORITY_COLORS, PROJECT_COLORS } from '../../shared/models/task.model';
import { TaskService } from '../../shared/services/task.service';

@Component({
  selector: 'app-task-list',
  imports: [CommonModule],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'task-list'
  }
})
export class TaskListComponent {
  private taskService = inject(TaskService);
  private refreshTrigger = signal(0);

  statusFilter = input<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('all');
  projectFilter = input<'all' | 'Personal' | 'Work' | 'Study' | 'General'>('all');

  filteredTasks = computed(() => {
    // Include refresh trigger to ensure reactivity
    this.refreshTrigger();
    
    const status = this.statusFilter();
    const project = this.projectFilter();
    const tasks = this.taskService.getTasksByStatusAndProject(status, project);
    
    // Handle null/undefined cases
    if (!tasks || !Array.isArray(tasks)) {
      return [];
    }
    
    return tasks;
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

  getPriorityColor(priority: Task['priority']): string {
    return PRIORITY_COLORS[priority];
  }

  getProjectColor(project: Task['project']): string {
    return PROJECT_COLORS[project];
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
    // This will be implemented in US-002
    console.log('Create task clicked');
  }

  onTaskAction(taskId: string, action: 'edit' | 'delete' | 'status-change'): void {
    // These will be implemented in future user stories
    console.log(`Task ${action} clicked for task ${taskId}`);
  }
}