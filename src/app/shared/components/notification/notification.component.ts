import { Component, computed, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Notification, NotificationType } from '../../services/notification.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  imports: [CommonModule],
  template: `
    @if (notification()) {
      <div 
        [@notificationState]="notificationState()"
        class="notification"
        [class]="getNotificationClasses(notification()!)"
        role="alert"
        [attr.aria-live]="getAriaLive(notification()!.type)"
        aria-atomic="true"
        (mouseenter)="onMouseEnter()"
        (mouseleave)="onMouseLeave()">
        
        <div class="notification__content">
          <span class="notification__icon" aria-hidden="true">
            {{ getIcon(notification()!.type) }}
          </span>
          
          <span class="notification__message">
            {{ notification()!.message }}
          </span>
        </div>

        <div class="notification__actions">
          @if (notification()!.action) {
            <button 
              type="button"
              class="notification__action-btn"
              (click)="onActionClick(notification()!.action!.handler)"
              [attr.aria-label]="notification()!.action!.label">
              {{ notification()!.action!.label }}
            </button>
          }
          
          <button 
            type="button"
            class="notification__close-btn"
            (click)="onClose()"
            aria-label="Dismiss notification"
            title="Dismiss">
            ×
          </button>
        </div>

          @if (showProgress() && notification()!.duration) {
          <div class="notification__progress">
            <div 
              class="notification__progress-bar"
              [style.animation-duration.ms]="notification()!.duration">
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .notification {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.4;
      backdrop-filter: blur(10px);
      min-height: 48px;
      transition: all 0.2s ease;
      max-width: 400px;
      word-wrap: break-word;
    }

    .notification:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }

    .notification__content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      min-width: 0;
    }

    .notification__icon {
      font-size: 1.25rem;
      flex-shrink: 0;
      line-height: 1;
    }

    .notification__message {
      flex: 1;
      min-width: 0;
    }

    .notification__actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .notification__action-btn {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .notification__action-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
    }

    .notification__action-btn:focus {
      outline: 2px solid rgba(255, 255, 255, 0.5);
      outline-offset: 2px;
    }

    .notification__close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      font-weight: 300;
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
      line-height: 1;
    }

    .notification__close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      transform: rotate(90deg);
    }

    .notification__close-btn:focus {
      outline: 2px solid rgba(255, 255, 255, 0.5);
      outline-offset: 2px;
    }

    .notification__progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 0 0 12px 12px;
      overflow: hidden;
    }

    .notification__progress-bar {
      height: 100%;
      background: rgba(255, 255, 255, 0.8);
      width: 100%;
      animation: progressDepletion linear forwards;
      transform-origin: left;
    }

    @keyframes progressDepletion {
      from {
        transform: scaleX(1);
      }
      to {
        transform: scaleX(0);
      }
    }

    /* Type-specific styles */
    .notification--success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }

    .notification--error {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
    }

    .notification--warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
    }

    .notification--info {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
    }

    /* Responsive design */
    @media (max-width: 640px) {
      .notification {
        max-width: none;
        left: 10px;
        right: 10px;
        font-size: 0.8125rem;
        padding: 0.875rem 1rem;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .notification {
        border: 2px solid currentColor;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .notification {
        transition: none;
      }
      
      .notification__progress-bar {
        animation: none;
        transform: scaleX(0);
      }
    }
  `],
  animations: [
    trigger('notificationState', [
      state('void', style({
        opacity: 0,
        transform: 'translateX(100%) scale(0.8)',
      })),
      state('entering', style({
        opacity: 1,
        transform: 'translateX(0) scale(1)',
      })),
      state('visible', style({
        opacity: 1,
        transform: 'translateX(0) scale(1)',
      })),
      state('exiting', style({
        opacity: 0,
        transform: 'translateX(100%) scale(0.8)',
      })),
      transition('void => entering', [
        animate('300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)')
      ]),
      transition('entering => visible', [
        animate('100ms ease-out')
      ]),
      transition('visible => exiting', [
        animate('250ms ease-in')
      ]),
      transition('exiting => void', [
        animate('0ms')
      ]),
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationComponent {
  private notificationService = inject(NotificationService);

  notification = input<Notification | null>(null);
  dismissed = output<string>();

  private isHovered = false;
  private animationState = 'entering';

  readonly notificationState = computed(() => this.animationState);
  readonly showProgress = computed(() => !this.isHovered);

  onClose(): void {
    const notification = this.notification();
    if (!notification) return;
    
    this.animationState = 'exiting';
    // Give animation time to complete before emitting
    setTimeout(() => {
      this.dismissed.emit(notification.id);
    }, 250);
  }

  onActionClick(handler: () => void): void {
    handler();
    this.onClose();
  }

  onMouseEnter(): void {
    this.isHovered = true;
  }

  onMouseLeave(): void {
    this.isHovered = false;
  }

  getNotificationClasses(notification: Notification): string {
    if (!notification) return '';
    const baseClass = 'notification';
    const typeClass = `notification--${notification.type}`;
    
    return [baseClass, typeClass].join(' ');
  }

  getIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };
    
    return icons[type] || 'ℹ';
  }

  getAriaLive(type: NotificationType): 'polite' | 'assertive' {
    // Errors should be assertive, others can be polite
    return type === 'error' ? 'assertive' : 'polite';
  }

  // Animation lifecycle hooks
  onAnimationDone(event: any): void {
    if (event.toState === 'entering') {
      this.animationState = 'visible';
    } else if (event.toState === 'exiting') {
      this.animationState = 'void';
    }
  }
}