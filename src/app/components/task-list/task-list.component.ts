import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
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
  constructor(private taskService: TaskService) {}

  statusFilter = input<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('all');
  projectFilter = input<'all' | 'Personal' | 'Work' | 'Study' | 'General'>('all');

  filteredTasks = computed(() => {
    const status = this.statusFilter();
    const project = this.projectFilter();
    return this.taskService.getTasksByStatusAndProject(status, project);
  });

  sortedTasks = computed(() => {
    const tasks = this.filteredTasks();
    return tasks.sort((a: Task, b: Task) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  isEmpty = computed(() => this.sortedTasks().length === 0);
  taskCounts = computed(() => this.taskService.getTaskCounts());

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

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
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