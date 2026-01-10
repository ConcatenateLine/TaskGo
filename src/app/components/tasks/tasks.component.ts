import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskListComponent } from '../task-list/task-list.component';
import { TaskCreationFormComponent } from '../task-creation-form/task-creation-form.component';
import { TaskFilterTabsComponent } from '../task-filter-tabs/task-filter-tabs.component';
import { TaskProjectFilterComponent } from '../task-project-filter/task-project-filter.component';
import { TaskService } from '../../shared/services/task.service';
import { Task, TaskProject } from '../../shared/models/task.model';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, TaskListComponent, TaskCreationFormComponent, TaskFilterTabsComponent, TaskProjectFilterComponent],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss'
})
export class TasksComponent {
  protected readonly showTaskCreation = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly currentFilter = signal<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('all');
  protected readonly currentProjectFilter = signal<TaskProject | 'all'>('all');

  private taskService = inject(TaskService);

  onTaskCreated(task: Task): void {
    this.successMessage.set(`Task "${task.title}" created successfully!`);
    this.showTaskCreation.set(false);
    
    // Clear message after 3 seconds
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  onTaskCreatedWithAnimation(taskId: string): void {
    // This method handles task creation animations from the list component
    setTimeout(() => {
      this.successMessage.set('Task created successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    }, 400); // Allow animation to complete first
  }

  onTaskCreationCancelled(): void {
    this.showTaskCreation.set(false);
  }

  onCreateTaskRequested(): void {
    this.showTaskCreation.set(true);
  }

  onTaskDeleted(): void {
    this.successMessage.set('Task deleted successfully!');
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  onActionError(error: Error): void {
    this.errorMessage.set(error.message);
    setTimeout(() => this.errorMessage.set(null), 5000);
  }

  onTaskUpdated(taskId: string): void {
    // Handle task update animations
    setTimeout(() => {
      this.successMessage.set('Task updated successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    }, 800); // Allow update animation to complete
  }

  onFilterChange(filter: 'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'): void {
    this.currentFilter.set(filter);
  }

  onProjectFilterChange(project: TaskProject | 'all'): void {
    this.currentProjectFilter.set(project);
  }
}
