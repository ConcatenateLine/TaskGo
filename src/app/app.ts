import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { StartupLoaderComponent } from './shared/components/startup-loader/startup-loader.component';
import { NavigationComponent } from './shared/components/navigation/navigation.component';
import { TaskService } from './shared/services/task.service';
import { AuthService } from './shared/services/auth.service';
import { SecurityService } from './shared/services/security.service';
import { AppStartupService } from './shared/services/app-startup.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, StartupLoaderComponent, NavigationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
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