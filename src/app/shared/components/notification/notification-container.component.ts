import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition } from '@angular/animations';
import { NotificationService, Notification } from '../../services/notification.service';
import { NotificationComponent } from './notification.component';
import { slideInRight, slideOutRight } from '../../../animations/notification-animations';

@Component({
  selector: 'app-notification-container',
  imports: [CommonModule, NotificationComponent],
  template: `
    <div class="notification-container" role="region" aria-label="Notifications">
      @for (notification of notificationsSignal(); track notification.id; let i = $index) {
        <div 
          class="notification-item"
          [style.z-index]="1000 + i"
          [@notificationSlide]="{
            value: notificationAnimationStates().get(notification.id) || 'enter',
            params: { delay: i * 50 }
          }"
          (@notificationSlide.done)="onAnimationDone($event, notification.id)">
          
          <app-notification
            [notification]="notification"
            (dismissed)="onNotificationDismissed($event)" />
        </div>
      }
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      pointer-events: none;
      max-width: 400px;
      width: 100%;
    }

    .notification-item {
      pointer-events: auto;
      margin-bottom: 0.75rem;
      width: 100%;
    }

    @media (max-width: 640px) {
      .notification-container {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .notification-container {
        outline: 2px solid transparent;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .notification-item {
        transition: none;
      }
    }
  `],
  animations: [
    trigger('notificationSlide', [
      transition(':enter', [
        slideInRight
      ]),
      transition(':leave', [
        slideOutRight
      ]),
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationContainerComponent {
  private notificationService = inject(NotificationService);

  readonly notifications = this.notificationService.notifications$;
  readonly notificationsSignal = computed(() => this.notifications());
  readonly notificationAnimationStates = computed(() => {
    const states = new Map<string, 'enter' | 'exit'>();
    
    this.notificationsSignal().forEach((notification: Notification) => {
      states.set(notification.id, 'enter');
    });
    
    return states;
  });

  onNotificationDismissed(notificationId: string): void {
    // Mark as exiting before removing
    const currentState = this.notificationAnimationStates();
    currentState.set(notificationId, 'exit');
    
    // Remove after animation
    setTimeout(() => {
      this.notificationService.dismiss(notificationId);
    }, 250);
  }

  onAnimationDone(event: any, notificationId: string): void {
    if (event.toState === 'exit') {
      // Animation done, the timeout in onNotificationDismissed will handle removal
    }
  }

  // Utility method for testing and external access
  public hasNotifications(): boolean {
    return this.notificationsSignal().length > 0;
  }
}