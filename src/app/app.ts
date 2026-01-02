import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskListComponent } from './components/task-list/task-list.component';
import { TaskCreationFormComponent } from './components/task-creation-form/task-creation-form.component';
import { TaskFilterTabsComponent } from './components/task-filter-tabs/task-filter-tabs.component';
import { TaskService } from './shared/services/task.service';
import { AuthService } from './shared/services/auth.service';
import { SecurityService } from './shared/services/security.service';
import { Task } from './shared/models/task.model';

@Component({
  selector: 'app-root',
  imports: [CommonModule, TaskListComponent, TaskCreationFormComponent, TaskFilterTabsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('TaskGo');
  protected readonly showTaskCreation = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly currentFilter = signal<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('all');

  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private securityService = inject(SecurityService);

  ngOnInit(): void {
    // Expose taskService for E2E testing
    if (typeof window !== 'undefined') {
      (window as any).taskService = this.taskService;
    }
    
    // Initialize authentication for development
    if (!this.authService.isAuthenticated()) {
      this.authService.createAnonymousUser();
    }
    
    // Initialize with mock data for US-001
    this.taskService.initializeMockData();
    
    // Log application start
    this.authService.logSecurityEvent({
      type: 'DATA_ACCESS',
      message: 'Application initialized',
      timestamp: new Date(),
      userId: this.authService.getUserContext()?.userId
    });
  }

  onCreateTaskRequested(): void {
    this.showTaskCreation.set(true);
  }

  onTaskCreated(task: Task): void {
    console.log('Task created:', task);
    
    // Show success message globally
    this.successMessage.set('Task created successfully');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      this.successMessage.set(null);
    }, 3000);
    
    // Switch back to task list immediately
    this.showTaskCreation.set(false);
  }

  onTaskCreationCancelled(): void {
    this.showTaskCreation.set(false);
  }

  onTaskDeleted(): void {
    // Show success message globally
    this.successMessage.set('Task deleted successfully');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      this.successMessage.set(null);
    }, 3000);
  }

  onActionError(error: Error): void {
    console.error('An error occurred:', error.message);
    this.errorMessage.set(error.message);
    
    // Clear error message after 3 seconds
    setTimeout(() => {
      this.errorMessage.set(null);
    }, 3000);
  }

  onFilterChange(filter: 'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'): void {
    this.currentFilter.set(filter);
  }

  /**
   * Check if app is running in secure context
   */
  isSecureContext(): boolean {
    return (
      typeof window !== 'undefined' &&
      (window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1')
    );
  }
}