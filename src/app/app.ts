import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskListComponent } from './components/task-list/task-list.component';
import { TaskCreationFormComponent } from './components/task-creation-form/task-creation-form.component';
import { TaskFilterTabsComponent } from './components/task-filter-tabs/task-filter-tabs.component';
import { TaskProjectFilterComponent } from './components/task-project-filter/task-project-filter.component';
import { StartupLoaderComponent } from './shared/components/startup-loader/startup-loader.component';
import { NotificationContainerComponent } from './shared/components/notification/notification-container.component';
import { TaskService } from './shared/services/task.service';
import { AuthService } from './shared/services/auth.service';
import { SecurityService } from './shared/services/security.service';
import { AppStartupService } from './shared/services/app-startup.service';
import { NotificationService } from './shared/services/notification.service';
import { AutoSaveService } from './shared/services/auto-save.service';
import { Task, TaskProject } from './shared/models/task.model';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule, 
    TaskListComponent, 
    TaskCreationFormComponent, 
    TaskFilterTabsComponent, 
    TaskProjectFilterComponent, 
    StartupLoaderComponent,
    NotificationContainerComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('TaskGo');
  protected readonly showTaskCreation = signal(false);
  protected readonly currentFilter = signal<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('all');
  protected readonly currentProjectFilter = signal<TaskProject | 'all'>('all');

  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private securityService = inject(SecurityService);
  private startupService = inject(AppStartupService);
  private notificationService = inject(NotificationService);
  private autoSaveService = inject(AutoSaveService);

  // Computed properties for startup state
  protected isAppReady = computed(() => this.startupService.isReady());
  protected isLoading = this.startupService.isLoading;
  protected startupError = this.startupService.error;
  protected startupWarnings = this.startupService.warnings;

  ngOnInit(): void {
      // Expose taskService for E2E testing
    if (typeof window !== 'undefined') {
      (window as any).taskService = this.taskService;
    }
    
    // Handle startup errors/warnings
    this.handleStartupErrors();
    
    // Only proceed if startup was successful
    if (this.isAppReady()) {
      this.performPostStartupInit();
    }
  }

  /**
   * Perform initialization after successful startup
   */
  private performPostStartupInit(): void {
    // Initialize authentication for development if needed
    if (!this.authService.isAuthenticated()) {
      this.authService.createAnonymousUser();
    }
    
    // Initialize mock data if no tasks exist (for development/testing)
    if (this.taskService.getTasks().length === 0) {
      this.taskService.initializeMockData();
    }
    
    // Log successful application start
    this.authService.logSecurityEvent({
      type: 'DATA_ACCESS',
      message: 'Application initialized successfully',
      timestamp: new Date(),
      userId: this.authService.getUserContext()?.userId
    });

    // Log any startup warnings
    const warnings = this.startupWarnings();
    if (warnings.length > 0) {
      console.warn('Startup completed with warnings:', warnings);
    }
  }

  onCreateTaskRequested(): void {
    this.showTaskCreation.set(true);
  }

  onTaskCreated(task: Task): void {
    console.log('Task created:', task);
    
    // The AutoSaveService will handle notifications for manual saves
    // Switch back to task list immediately
    this.showTaskCreation.set(false);
  }

  onTaskCreationCancelled(): void {
    this.showTaskCreation.set(false);
  }

  onTaskDeleted(): void {
    // The AutoSaveService will handle notifications for manual deletions
    // No manual notification needed here
  }

  onActionError(error: Error): void {
    console.error('An error occurred:', error.message);
    this.notificationService.showError(error.message);
  }

  onFilterChange(filter: 'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'): void {
    this.currentFilter.set(filter);
  }

  onProjectFilterChange(project: TaskProject | 'all'): void {
    this.currentProjectFilter.set(project);
  }

/**
    * Handle startup errors with notification system
    */
   private handleStartupErrors(): void {
     const startupError = this.startupError();
     if (startupError) {
       this.notificationService.showError(`Startup Error: ${startupError}`, {
         label: 'Retry',
         handler: () => window.location.reload()
       });
     }

     const warnings = this.startupWarnings();
     if (warnings.length > 0) {
       warnings.forEach(warning => {
         this.notificationService.showWarning(`Startup Warning: ${warning}`, 8000);
       });
     }
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