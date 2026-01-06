import { Injectable, signal, inject, DestroyRef } from '@angular/core';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export type NotificationSource = 'manual' | 'auto' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  source: NotificationSource;
  timestamp: number;
  duration?: number | null; // null for persistent (like errors)
  action?: {
    label: string;
    handler: () => void;
  };
}

export interface NotificationConfig {
  maxNotifications: number;
  defaultDurations: {
    [key in NotificationType]: number | null;
  };
  enableAnimations: boolean;
  enableSound: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private destroyRef = inject(DestroyRef);

  private readonly DEFAULT_CONFIG: NotificationConfig = {
    maxNotifications: 5,
    defaultDurations: {
      success: 2000, // 2 seconds for manual saves
      error: null, // Persistent until user dismisses
      warning: 5000,
      info: 3000,
    },
    enableAnimations: true,
    enableSound: false,
  };

  private config = this.DEFAULT_CONFIG;
  private notifications = signal<Notification[]>([]);
  private activeTimers = new Map<string, number>();

  // Expose readonly notifications signal
  public readonly notifications$ = this.notifications.asReadonly();

  constructor() {
    // Clean up timers on destroy
    this.destroyRef.onDestroy(() => {
      this.clearAllTimers();
    });
  }

  /**
   * Show a success notification with proper source distinction
   */
  public showSuccess(
    message: string, 
    source: NotificationSource = 'manual',
    duration?: number
  ): void {
    // Debug logging
    console.log(`showSuccess called: message="${message}", source="${source}"`);
    
    // Don't show notifications for auto-saves (requirement)
    if (source === 'auto') {
      console.log('Filtering out auto-save success notification');
      return;
    }

    const notification: Notification = {
      id: this.generateId(),
      type: 'success',
      message,
      source,
      timestamp: Date.now(),
      duration: duration ?? this.config.defaultDurations.success,
    };

    console.log('Adding success notification:', notification);
    this.addNotification(notification);
  }

  /**
   * Show an error notification (always persistent)
   */
  public showError(message: string, action?: { label: string; handler: () => void }): void {
    const notification: Notification = {
      id: this.generateId(),
      type: 'error',
      message,
      source: 'system',
      timestamp: Date.now(),
      duration: null, // Errors are persistent
      action,
    };

    this.addNotification(notification);
  }

  /**
   * Show a warning notification
   */
  public showWarning(message: string, duration?: number): void {
    const notification: Notification = {
      id: this.generateId(),
      type: 'warning',
      message,
      source: 'system',
      timestamp: Date.now(),
      duration: duration ?? this.config.defaultDurations.warning,
    };

    this.addNotification(notification);
  }

  /**
   * Show an info notification
   */
  public showInfo(message: string, duration?: number): void {
    const notification: Notification = {
      id: this.generateId(),
      type: 'info',
      message,
      source: 'system',
      timestamp: Date.now(),
      duration: duration ?? this.config.defaultDurations.info,
    };

    this.addNotification(notification);
  }

  /**
   * Manually dismiss a notification
   */
  public dismiss(notificationId: string): void {
    this.clearTimer(notificationId);
    this.notifications.update(notifs => 
      notifs.filter(n => n.id !== notificationId)
    );
  }

  /**
   * Clear all notifications
   */
  public clearAll(): void {
    this.clearAllTimers();
    this.notifications.set([]);
  }

  /**
   * Get current notifications count
   */
  public getCount(): number {
    return this.notifications().length;
  }

  /**
   * Get notifications by type
   */
  public getByType(type: NotificationType): Notification[] {
    return this.notifications().filter(n => n.type === type);
  }

  /**
   * Check if any notifications are active
   */
  public hasActive(): boolean {
    return this.notifications().length > 0;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private addNotification(notification: Notification): void {
    // Enforce max notification limit
    const currentNotifications = this.notifications();
    if (currentNotifications.length >= this.config.maxNotifications) {
      // Remove oldest notification
      const oldestId = currentNotifications[0].id;
      this.clearTimer(oldestId);
      this.notifications.update(notifs => notifs.slice(1));
    }

    // Add new notification
    this.notifications.update(notifs => [...notifs, notification]);

    // Set auto-dismiss timer if duration is specified
    if (notification.duration && notification.duration > 0) {
      this.setTimer(notification);
    }
  }

  private setTimer(notification: Notification): void {
    if (!notification.duration) return;

    const timeout = timer(notification.duration)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.dismiss(notification.id);
      });

    this.activeTimers.set(notification.id, timeout as any);
  }

  private clearTimer(notificationId: string): void {
    const timer = this.activeTimers.get(notificationId);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(notificationId);
    }
  }

  private clearAllTimers(): void {
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.activeTimers.clear();
  }

  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}