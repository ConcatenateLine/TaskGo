import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskListComponent } from './components/task-list/task-list.component';
import { TaskService } from './shared/services/task.service';
import { AuthService } from './shared/services/auth.service';
import { SecurityService } from './shared/services/security.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, TaskListComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('TaskGo');

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private securityService: SecurityService
  ) {}

  ngOnInit() {
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

  /**
   * Handle errors gracefully without exposing sensitive information
   */
  handleError(error: Error): void {
    // Log security event
    this.authService.logSecurityEvent({
      type: 'VALIDATION_FAILURE',
      message: 'Application error occurred',
      timestamp: new Date(),
      userId: this.authService.getUserContext()?.userId
    });

    // Don't expose detailed error information to user
    console.error('An error occurred:', error.message);
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
