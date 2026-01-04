import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NotificationComponent } from './notification.component';
import { Notification, NotificationType } from '../../services/notification.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

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

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NotificationComponent, NoopAnimationsModule],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NotificationComponent);
    component = fixture.componentInstance;
    component.notification.set(mockNotification);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
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
    const typeTests = [
      { type: 'success' as NotificationType, icon: '✓', ariaLive: 'polite' },
      { type: 'error' as NotificationType, icon: '✕', ariaLive: 'assertive' },
      { type: 'warning' as NotificationType, icon: '⚠', ariaLive: 'polite' },
      { type: 'info' as NotificationType, icon: 'ℹ', ariaLive: 'polite' },
    ];

    typeTests.forEach(({ type, icon, ariaLive }) => {
      it(`should display correct icon and ARIA for ${type} type`, () => {
        const notification: Notification = {
          ...mockNotification,
          type,
        };

        component.notification.set(notification);
        fixture.detectChanges();

        const iconElement = fixture.debugElement.query(By.css('.notification__icon'));
        expect(iconElement.nativeElement.textContent.trim()).toBe(icon);

        const notificationElement = fixture.debugElement.query(By.css('.notification'));
        expect(notificationElement.nativeElement.classList.contains(`notification--${type}`)).toBe(true);
        expect(notificationElement.nativeElement.getAttribute('aria-live')).toBe(ariaLive);
      });
    });
  });

  describe('action button', () => {
    it('should not display action button when no action provided', () => {
      const actionButton = fixture.debugElement.query(By.css('.notification__action-btn'));
      expect(actionButton).toBeFalsy();
    });

    it('should display action button when action provided', () => {
      const actionHandler = jasmine.createSpy('actionHandler');
      const notificationWithAction: Notification = {
        ...mockNotification,
        action: {
          label: 'Retry',
          handler: actionHandler,
        },
      };

      component.notification.set(notificationWithAction);
      fixture.detectChanges();

      const actionButton = fixture.debugElement.query(By.css('.notification__action-btn'));
      expect(actionButton).toBeTruthy();
      expect(actionButton.nativeElement.textContent.trim()).toBe('Retry');
      expect(actionButton.nativeElement.getAttribute('aria-label')).toBe('Retry');
    });

    it('should call action handler when action button clicked', () => {
      const actionHandler = jasmine.createSpy('actionHandler');
      const notificationWithAction: Notification = {
        ...mockNotification,
        action: {
          label: 'Retry',
          handler: actionHandler,
        },
      };

      component.notification.set(notificationWithAction);
      fixture.detectChanges();

      const actionButton = fixture.debugElement.query(By.css('.notification__action-btn'));
      actionButton.nativeElement.click();

      expect(actionHandler).toHaveBeenCalled();
    });
  });

  describe('progress bar', () => {
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

      component.notification.set(persistentNotification);
      fixture.detectChanges();

      const progressBar = fixture.debugElement.query(By.css('.notification__progress'));
      expect(progressBar).toBeFalsy();
    });

    it('should set correct animation duration on progress bar', () => {
      const notificationWithCustomDuration: Notification = {
        ...mockNotification,
        duration: 5000,
      };

      component.notification.set(notificationWithCustomDuration);
      fixture.detectChanges();

      const progressBarFill = fixture.debugElement.query(By.css('.notification__progress-bar'));
      expect(progressBarFill.nativeElement.style.animationDuration).toBe('5000ms');
    });
  });

  describe('close functionality', () => {
    it('should emit dismissed event when close button clicked', () => {
      spyOn(component.dismissed, 'emit');

      const closeButton = fixture.debugElement.query(By.css('.notification__close-btn'));
      closeButton.nativeElement.click();

      expect(component.dismissed).toHaveBeenCalledWith('test-1');
    });

    it('should have correct accessibility attributes on close button', () => {
      const closeButton = fixture.debugElement.query(By.css('.notification__close-btn'));
      expect(closeButton.nativeElement.getAttribute('aria-label')).toBe('Dismiss notification');
      expect(closeButton.nativeElement.getAttribute('title')).toBe('Dismiss');
    });
  });

  describe('hover interactions', () => {
    it('should hide progress bar on hover', () => {
      const notificationElement = fixture.debugElement.query(By.css('.notification'));
      
      expect(component.showProgress()).toBe(true);

      notificationElement.triggerEventHandler('mouseenter', {});
      fixture.detectChanges();

      expect(component.showProgress()).toBe(false);

      notificationElement.triggerEventHandler('mouseleave', {});
      fixture.detectChanges();

      expect(component.showProgress()).toBe(true);
    });
  });

  describe('animation state', () => {
    it('should have initial animation state', () => {
      expect(component.notificationState()).toBe('entering');
    });

    it('should update animation state on dismiss', () => {
      spyOn(component.dismissed, 'emit');

      component.onClose();

      expect(component.notificationState()).toBe('exiting');
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
    it('should handle responsive design classes', () => {
      const notificationElement = fixture.debugElement.query(By.css('.notification'));
      expect(notificationElement.nativeElement.style.maxWidth).toBe('400px');
    });
  });
});