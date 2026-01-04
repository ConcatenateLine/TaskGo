import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppStartupService } from '../../services/app-startup.service';

@Component({
  selector: 'app-startup-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="startup-loader" [class.has-error]="hasError()">
      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-content">
          <div class="loader-spinner"></div>
          <h2>Loading TaskGo...</h2>
          <p class="loading-message">{{ getLoadingMessage() }}</p>
          
          @if (showDetailedInfo()) {
            <div class="loading-details">
              <div class="metric" [class.warning]="metrics()?.fallbackUsed">
                <span class="metric-label">Storage:</span>
                <span class="metric-value">
                  {{ metrics()?.fallbackUsed ? 'Fallback Active' : 'Local Storage' }}
                </span>
              </div>
              
              @if (metrics()?.migrationPerformed) {
                <div class="metric migration">
                  <span class="metric-label">Migration:</span>
                  <span class="metric-value">Data Updated</span>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Error State -->
      @if (hasError()) {
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <h2>Startup Error</h2>
          <p class="error-message">{{ errorMessage() }}</p>
          
          @if (warnings().length > 0) {
            <div class="warnings">
              <h3>Warnings:</h3>
              <ul>
                @for (warning of warnings(); track warning) {
                  <li>{{ warning }}</li>
                }
              </ul>
            </div>
          }
          
          <button class="retry-button" (click)="retry()" [disabled]="isRetrying()">
            {{ isRetrying() ? 'Retrying...' : 'Retry' }}
          </button>
          
          <button class="continue-button" (click)="continueAnyway()">
            Continue Anyway
          </button>
        </div>
      }

      <!-- Success Transition -->
      @if (isLoaded() && !hasError()) {
        <div class="success-content">
          <div class="success-icon">✅</div>
          <h2>Ready!</h2>
          <p>TaskGo is loaded and ready to use.</p>
          
          @if (warnings().length > 0) {
            <div class="warnings">
              @for (warning of warnings(); track warning) {
                <div class="warning-item">{{ warning }}</div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .startup-loader {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 9999;
    }

    .loading-content, .error-content, .success-content {
      text-align: center;
      max-width: 400px;
      padding: 2rem;
    }

    .loader-spinner {
      width: 60px;
      height: 60px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 2rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    h2 {
      font-size: 1.8rem;
      margin-bottom: 1rem;
      font-weight: 600;
    }

    .loading-message {
      font-size: 1.1rem;
      opacity: 0.9;
      margin-bottom: 2rem;
    }

    .loading-details {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 1rem;
      margin-top: 1rem;
    }

    .metric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .metric:last-child {
      border-bottom: none;
    }

    .metric.warning {
      color: #fbbf24;
    }

    .metric.migration {
      color: #34d399;
    }

    .metric-label {
      font-weight: 500;
    }

    .metric-value {
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .has-error {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }

    .error-icon, .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .error-message {
      font-size: 1.1rem;
      margin-bottom: 2rem;
      opacity: 0.9;
    }

    .warnings {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
      text-align: left;
    }

    .warnings h3 {
      margin-top: 0;
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }

    .warnings ul {
      margin: 0;
      padding-left: 1.5rem;
    }

    .warnings li {
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .warning-item {
      padding: 0.5rem 0;
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .retry-button, .continue-button {
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid white;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      margin: 0.5rem;
      transition: all 0.2s ease;
    }

    .retry-button:hover:not(:disabled), .continue-button:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }

    .retry-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .continue-button {
      background: transparent;
      border-color: rgba(255, 255, 255, 0.5);
    }

    .continue-button:hover {
      border-color: white;
      background: rgba(255, 255, 255, 0.1);
    }

    /* Responsive design */
    @media (max-width: 640px) {
      .loading-content, .error-content, .success-content {
        padding: 1rem;
        max-width: 90%;
      }

      h2 {
        font-size: 1.5rem;
      }

      .loader-spinner {
        width: 50px;
        height: 50px;
      }
    }
  `]
})
export class StartupLoaderComponent {
  private startupService = inject(AppStartupService);
  private isRetryingSignal = signal(false);

  // Computed signals from startup service
  isLoading = this.startupService.isLoading;
  isLoaded = this.startupService.isLoaded;
  errorMessage = this.startupService.error;
  warnings = this.startupService.warnings;
  metrics = this.startupService.metrics;

  hasError = computed(() => !!this.errorMessage());
  isRetrying = this.isRetryingSignal.asReadonly();
  showDetailedInfo = computed(() => !!this.metrics());

  loadingMessages = [
    'Loading your tasks...',
    'Validating data...',
    'Checking storage...',
    'Preparing workspace...',
    'Almost ready...'
  ];

  private messageIndex = 0;

  getLoadingMessage(): string {
    return this.loadingMessages[this.messageIndex % this.loadingMessages.length];
  }

  constructor() {
    // Rotate loading messages for better UX
    setInterval(() => {
      if (this.isLoading()) {
        this.messageIndex++;
      }
    }, 2000);
  }

  async retry(): Promise<void> {
    this.isRetryingSignal.set(true);
    try {
      await this.startupService.reinitialize();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      this.isRetryingSignal.set(false);
    }
  }

  continueAnyway(): void {
    // Force the app to continue even with startup errors
    // This will hide the loader but maintain the error state
    console.warn('User chose to continue despite startup errors');
    
    // We could emit an event or use a service to notify the main app
    // For now, just log the action
  }
}