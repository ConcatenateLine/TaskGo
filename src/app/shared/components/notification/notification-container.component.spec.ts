import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NotificationContainerComponent } from './notification-container.component';
import { NotificationService } from '../../services/notification.service';
import { NotificationComponent } from './notification.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

describe('NotificationContainerComponent', () => {
  let component: NotificationContainerComponent;
  let fixture: ComponentFixture<NotificationContainerComponent>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  const mockNotifications = [
    {
      id: 'test-1',
      type: 'success' as const,
      message: 'Success message',
      source: 'manual' as const,
      timestamp: Date.now(),
      duration: 2000,
    },
    {
      id: 'test-2',
      type: 'error' as const,
      message: 'Error message',
      source: 'system' as const,
      timestamp: Date.now(),
      duration: null,
    },
    {
      id: 'test-3',
      type: 'warning' as const,
      message: 'Warning message',
      source: 'system' as const,
      timestamp: Date.now(),
      duration: 5000,
    },
  ];

  beforeEach(waitForAsync(() => {
    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', [], {
      notifications$: of(mockNotifications),
    });

    TestBed.configureTestingModule({
      imports: [NotificationContainerComponent, NoopAnimationsModule],
      providers: [
        { provide: NotificationService, useValue: notificationServiceSpy },
      ],
    }).compileComponents();

    mockNotificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NotificationContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render notification container with correct ARIA attributes', () => {
    const container = fixture.debugElement.query(By.css('.notification-container'));
    expect(container).toBeTruthy();
    expect(container.nativeElement.getAttribute('role')).toBe('region');
    expect(container.nativeElement.getAttribute('aria-label')).toBe('Notifications');
  });

  it('should render all notifications', () => {
    const notificationItems = fixture.debugElement.queryAll(By.css('.notification-item'));
    expect(notificationItems).toHaveLength(3);

    const notificationComponents = fixture.debugElement.queryAll(By.directive(NotificationComponent));
    expect(notificationComponents).toHaveLength(3);
  });

  it('should pass correct notification to each NotificationComponent', () => {
    const notificationComponents = fixture.debugElement.queryAll(By.directive(NotificationComponent));
    
    notificationComponents.forEach((notificationComponent, index) => {
      const componentInstance = notificationComponent.componentInstance as NotificationComponent;
      const notification = componentInstance.notification();
      expect(notification.id).toBe(mockNotifications[index].id);
      expect(notification.message).toBe(mockNotifications[index].message);
      expect(notification.type).toBe(mockNotifications[index].type);
    });
  });

  it('should apply correct z-index stacking', () => {
    const notificationItems = fixture.debugElement.queryAll(By.css('.notification-item'));
    
    notificationItems.forEach((item, index) => {
      const zIndex = item.nativeElement.style.zIndex;
      expect(zIndex).toBe(`${1000 + index}`);
    });
  });

  describe('notification dismissal', () => {
    it('should call notificationService.dismiss when notification is dismissed', () => {
      spyOn(component, 'onNotificationDismissed').and.callThrough();
      spyOn(mockNotificationService, 'dismiss');

      const firstNotification = mockNotifications[0];
      component.onNotificationDismissed(firstNotification.id);

      expect(component.onNotificationDismissed).toHaveBeenCalledWith(firstNotification.id);
      setTimeout(() => {
        expect(mockNotificationService.dismiss).toHaveBeenCalledWith(firstNotification.id);
      }, 300);
    });

    it('should handle dismissal with animation timing', (done) => {
      spyOn(mockNotificationService, 'dismiss');
      
      const notificationId = 'test-1';
      component.onNotificationDismissed(notificationId);

      // Should not immediately dismiss
      expect(mockNotificationService.dismiss).not.toHaveBeenCalled();

      // Should dismiss after animation timeout
      setTimeout(() => {
        expect(mockNotificationService.dismiss).toHaveBeenCalledWith(notificationId);
        done();
      }, 260); // slightly more than the 250ms animation
    });
  });

  describe('animation states', () => {
    it('should initialize notifications with enter state', () => {
      const animationStates = component.notificationAnimationStates();
      
      mockNotifications.forEach(notification => {
        expect(animationStates.get(notification.id)).toBe('enter');
      });
    });

    it('should handle animation done events', () => {
      const notificationId = 'test-1';
      
      const animationStates = component.notificationAnimationStates();
      expect(animationStates.get(notificationId)).toBe('enter');

      // Simulate animation done
      component.onAnimationDone({ toState: 'exit' }, notificationId);
      
      // State should be updated but timer handles actual removal
      expect(animationStates.get(notificationId)).toBe('exit');
    });
  });

  describe('utility methods', () => {
    it('hasNotifications should return true when notifications exist', () => {
      expect(component.hasNotifications()).toBe(true);
    });

    it('hasNotifications should return false when no notifications exist', () => {
      // Mock empty notifications
      spyOnProperty(mockNotificationService, 'notifications$', 'get').and.returnValue(of([]));
      fixture.detectChanges();
      
      expect(component.hasNotifications()).toBe(true); // still true because we haven't re-initialized
      
      // Recreate component with empty notifications
      const emptyNotificationServiceSpy = jasmine.createSpyObj('NotificationService', [], {
        notifications$: of([]),
      });
      
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [NotificationContainerComponent],
        providers: [
          { provide: NotificationService, useValue: emptyNotificationServiceSpy },
        ],
      });

      const newFixture = TestBed.createComponent(NotificationContainerComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();
      
      expect(newComponent.hasNotifications()).toBe(false);
    });
  });

  describe('responsive behavior', () => {
    it('should apply responsive styles on mobile', () => {
      const container = fixture.debugElement.query(By.css('.notification-container'));
      expect(container.nativeElement.style.maxWidth).toBe('400px');
    });
  });

  describe('accessibility', () => {
    it('should have proper semantic structure', () => {
      const container = fixture.debugElement.query(By.css('.notification-container'));
      expect(container.nativeElement.getAttribute('role')).toBe('region');
      expect(container.nativeElement.getAttribute('aria-label')).toBe('Notifications');
    });

    it('should prevent pointer events on container but allow on items', () => {
      const container = fixture.debugElement.query(By.css('.notification-container'));
      expect(container.nativeElement.style.pointerEvents).toBe('none');

      const firstItem = fixture.debugElement.query(By.css('.notification-item'));
      expect(firstItem.nativeElement.style.pointerEvents).toBe('auto');
    });
  });

  describe('notification ordering', () => {
    it('should maintain notification order as provided by service', () => {
      const notificationItems = fixture.debugElement.queryAll(By.css('.notification-item'));
      const notificationComponents = fixture.debugElement.queryAll(By.directive(NotificationComponent));
      
      notificationItems.forEach((item, index) => {
        const componentInstance = notificationComponents[index].componentInstance as NotificationComponent;
        const notification = componentInstance.notification();
        expect(notification.id).toBe(mockNotifications[index].id);
      });
    });
  });

  describe('spacing and layout', () => {
    it('should apply proper spacing between notifications', () => {
      const notificationItems = fixture.debugElement.queryAll(By.css('.notification-item'));
      
      notificationItems.forEach(item => {
        const styles = getComputedStyle(item.nativeElement);
        expect(styles.marginBottom).toBe('12px'); // 0.75rem
      });
    });

    it('should set proper width for notifications', () => {
      const notificationItems = fixture.debugElement.queryAll(By.css('.notification-item'));
      
      notificationItems.forEach(item => {
        expect(item.nativeElement.style.width).toBe('100%');
      });
    });
  });
});