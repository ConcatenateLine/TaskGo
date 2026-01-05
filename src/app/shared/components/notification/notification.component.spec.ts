import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NotificationComponent } from './notification.component';
import { Notification, NotificationType } from '../../services/notification.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

describe('NotificationComponent', () => {
  let component: NotificationComponent;
  let fixture: ComponentFixture<NotificationComponent>;

  const mockNotification: Notification = {
    id: 'test-1',
    type: 'success',
    message: 'Test notification',
    source: 'manual',
    timestamp: Date.now(),
    duration: 2000,
  };

  // Helper function to test notification types
  const testNotificationType = (type: NotificationType, icon: string, ariaLive: string) => {
    it(`should display correct icon and ARIA for ${type} type`, () => {
      const notification: Notification = {
        ...mockNotification,
        type,
      };

      fixture.componentRef.setInput('notification', notification);
      fixture.detectChanges();

      const iconElement = fixture.debugElement.query(By.css('.notification__icon'));
      expect(iconElement.nativeElement.textContent.trim()).toBe(icon);

      const notificationElement = fixture.debugElement.query(By.css('.notification'));
      expect(notificationElement.nativeElement.classList.contains(`notification--${type}`)).toBe(true);
      expect(notificationElement.nativeElement.getAttribute('aria-live')).toBe(ariaLive);
    });
  };

  // Helper function to create notification with action
  const createNotificationWithAction = (handler: () => void): Notification => ({
    ...mockNotification,
    action: {
      label: 'Retry',
      handler,
    },
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationComponent, NoopAnimationsModule],
    }).compileComponents();
  });

  beforeEach(() => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(NotificationComponent);
    component = fixture.componentInstance;
    // Don't set input here - let each test set it individually
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('notification', mockNotification);
      fixture.detectChanges();
    });

    it('should display notification message', () => {
      const messageElement = fixture.debugElement.query(By.css('.notification__message'));
      expect(messageElement.nativeElement.textContent.trim()).toBe('Test notification');
    });

    it('should display correct icon for success type', () => {
      const iconElement = fixture.debugElement.query(By.css('.notification__icon'));
      expect(iconElement.nativeElement.textContent.trim()).toBe('✓');
    });

    it('should apply correct CSS classes based on type', () => {
      const notificationElement = fixture.debugElement.query(By.css('.notification'));
      expect(notificationElement.nativeElement.classList.contains('notification--success')).toBe(true);
    });

    it('should have correct ARIA attributes', () => {
      const notificationElement = fixture.debugElement.query(By.css('.notification'));
      expect(notificationElement.nativeElement.getAttribute('role')).toBe('alert');
      expect(notificationElement.nativeElement.getAttribute('aria-live')).toBe('polite');
      expect(notificationElement.nativeElement.getAttribute('aria-atomic')).toBe('true');
    });
  });

  describe('type variations', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('notification', mockNotification);
      fixture.detectChanges();
    });

    testNotificationType('success', '✓', 'polite');
    testNotificationType('error', '✕', 'assertive');
    testNotificationType('warning', '⚠', 'polite');
    testNotificationType('info', 'ℹ', 'polite');
  });

  describe('action button', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('notification', mockNotification);
      fixture.detectChanges();
    });

    it('should not display action button when no action provided', () => {
      const actionButton = fixture.debugElement.query(By.css('.notification__action-btn'));
      expect(actionButton).toBeFalsy();
    });

    it('should display action button when action provided', () => {
      const actionHandler = vi.fn();
      const notificationWithAction = createNotificationWithAction(actionHandler);

      fixture.componentRef.setInput('notification', notificationWithAction);
      fixture.detectChanges();

      const actionButton = fixture.debugElement.query(By.css('.notification__action-btn'));
      expect(actionButton).toBeTruthy();
      expect(actionButton.nativeElement.textContent.trim()).toBe('Retry');
      expect(actionButton.nativeElement.getAttribute('aria-label')).toBe('Retry');
    });

    it('should call action handler when action button clicked', () => {
      const actionHandler = vi.fn();
      const notificationWithAction = createNotificationWithAction(actionHandler);

      fixture.componentRef.setInput('notification', notificationWithAction);
      fixture.detectChanges();

      const actionButton = fixture.debugElement.query(By.css('.notification__action-btn'));
      actionButton.nativeElement.click();

      expect(actionHandler).toHaveBeenCalled();
    });

    it('should close notification after action handler is called', () => {
      const actionHandler = vi.fn();
      const emitSpy = vi.fn();
      const notificationWithAction = createNotificationWithAction(actionHandler);

      fixture.componentRef.setInput('notification', notificationWithAction);
      fixture.detectChanges();
      
      component.dismissed.subscribe(emitSpy);

      const actionButton = fixture.debugElement.query(By.css('.notification__action-btn'));
      actionButton.nativeElement.click();

      expect(actionHandler).toHaveBeenCalled();
      
      // Fast-forward time to trigger the setTimeout
      vi.advanceTimersByTime(300);
      
      expect(emitSpy).toHaveBeenCalledWith('test-1');
    });
  });

  describe('progress bar', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('notification', mockNotification);
      fixture.detectChanges();
    });

    it('should display progress bar when notification has duration', () => {
      const progressBar = fixture.debugElement.query(By.css('.notification__progress'));
      expect(progressBar).toBeTruthy();

      const progressBarFill = fixture.debugElement.query(By.css('.notification__progress-bar'));
      expect(progressBarFill).toBeTruthy();
    });

    it('should not display progress bar when notification has no duration', () => {
      const persistentNotification: Notification = {
        ...mockNotification,
        duration: null,
      };

      fixture.componentRef.setInput('notification', persistentNotification);
      fixture.detectChanges();

      const progressBar = fixture.debugElement.query(By.css('.notification__progress'));
      expect(progressBar).toBeFalsy();
    });

    it('should set correct animation duration on progress bar', () => {
      const notificationWithCustomDuration: Notification = {
        ...mockNotification,
        duration: 5000,
      };

      fixture.componentRef.setInput('notification', notificationWithCustomDuration);
      fixture.detectChanges();

      const progressBarFill = fixture.debugElement.query(By.css('.notification__progress-bar'));
      expect(progressBarFill.nativeElement.style.animationDuration).toBe('5000ms');
    });
  });

  describe('animation lifecycle', () => {
    it('should have onAnimationDone method', () => {
      expect(typeof component.onAnimationDone).toBe('function');
    });
  });

  describe('close functionality', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('notification', mockNotification);
      fixture.detectChanges();
    });

    it('should emit dismissed event when close button clicked', () => {
      const emitSpy = vi.fn();
      component.dismissed.subscribe(emitSpy);

      const closeButton = fixture.debugElement.query(By.css('.notification__close-btn'));
      closeButton.nativeElement.click();

      // Fast-forward time to trigger the setTimeout
      vi.advanceTimersByTime(300);
      
      expect(emitSpy).toHaveBeenCalledWith('test-1');
    });

    it('should have correct accessibility attributes on close button', () => {
      const closeButton = fixture.debugElement.query(By.css('.notification__close-btn'));
      expect(closeButton.nativeElement.getAttribute('aria-label')).toBe('Dismiss notification');
      expect(closeButton.nativeElement.getAttribute('title')).toBe('Dismiss');
    });
  });

  describe('hover interactions', () => {
    it('should have onMouseEnter and onMouseLeave methods', () => {
      expect(typeof component.onMouseEnter).toBe('function');
      expect(typeof component.onMouseLeave).toBe('function');
    });
  });

  describe('animation state', () => {
    it('should have initial animation state', () => {
      expect(component.notificationState()).toBe('entering');
    });

    it('should have onClose method', () => {
      expect(typeof component.onClose).toBe('function');
    });
  });

  describe('utility methods', () => {
    it('getNotificationClasses should return correct classes', () => {
      const classes = component.getNotificationClasses(mockNotification);
      expect(classes).toBe('notification notification--success');
    });

    it('getIcon should return correct icons for each type', () => {
      expect(component.getIcon('success')).toBe('✓');
      expect(component.getIcon('error')).toBe('✕');
      expect(component.getIcon('warning')).toBe('⚠');
      expect(component.getIcon('info')).toBe('ℹ');
    });

    it('getAriaLive should return correct values', () => {
      expect(component.getAriaLive('error')).toBe('assertive');
      expect(component.getAriaLive('success')).toBe('polite');
      expect(component.getAriaLive('warning')).toBe('polite');
      expect(component.getAriaLive('info')).toBe('polite');
    });
  });

  describe('responsive behavior', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('notification', mockNotification);
      fixture.detectChanges();
    });

    it('should apply responsive design classes', () => {
      const notificationElement = fixture.debugElement.query(By.css('.notification'));
      const computedStyle = getComputedStyle(notificationElement.nativeElement);
      expect(computedStyle.maxWidth).toBe('400px');
    });
  });

  describe('auto-dismiss functionality', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('notification', mockNotification);
      fixture.detectChanges();
    });

    it('should have proper timer setup for duration-based notifications', () => {
      const notificationWithDuration: Notification = {
        ...mockNotification,
        duration: 2000,
      };
      
      fixture.componentRef.setInput('notification', notificationWithDuration);
      fixture.detectChanges();
      
      // Test that the progress bar shows the correct duration
      const progressBarFill = fixture.debugElement.query(By.css('.notification__progress-bar'));
      expect(progressBarFill.nativeElement.style.animationDuration).toBe('2000ms');
    });
  });
});