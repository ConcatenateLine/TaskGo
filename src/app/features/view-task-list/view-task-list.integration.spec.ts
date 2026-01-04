import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { signal, computed } from '@angular/core';

import { App } from '../../app';
import { TaskService } from '../../shared/services/task.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';
import { AppStartupService } from '../../shared/services/app-startup.service';

describe('TaskListComponent - Basic Integration', () => {
  let fixture: ComponentFixture<App>;
  let app: App;
  let taskService: any;
  let startupService: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, CommonModule],
      providers: [
        {
          provide: TaskService,
          useValue: {
            getTasks: () => [],
            getTasksByStatusAndProject: () => [],
            getTaskCounts: () => ({ todo: 0, inProgress: 0, done: 0, total: 0 }),
            getTaskCountsByProject: () => ({ Personal: 0, Work: 0, Study: 0, General: 0 }),
            initializeMockData: () => {},
            setTasks: () => {}
          }
        },
        {
          provide: AuthService,
          useValue: {
            getUserContext: () => ({ userId: 'test' }),
            isAuthenticated: () => true,
            logSecurityEvent: () => {},
            createAnonymousUser: () => {},
            requireAuthentication: () => {}
          }
        },
        {
          provide: SecurityService,
          useValue: {
            checkRateLimit: () => ({ allowed: true })
          }
        },
        {
          provide: AppStartupService,
          useValue: {
            initializeApp: () => () => Promise.resolve(),
            isReady: () => true,
            isLoading: computed(() => false),
            error: computed(() => null),
            warnings: computed(() => [])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);
    startupService = TestBed.inject(AppStartupService);
    
    // Trigger change detection and wait for it to complete
    fixture.detectChanges();
    await fixture.whenStable();
    
    // Trigger another change detection after async operations
    fixture.detectChanges();
  });

  it('should render task list component', async () => {
    // Wait for app to be fully ready
    await fixture.whenStable();
    fixture.detectChanges();
    
    // Check if we're still in startup mode and wait if needed
    let attempts = 0;
    let taskListElement = fixture.debugElement.query(By.css('app-task-list'));
    const startupLoader = fixture.debugElement.query(By.css('app-startup-loader'));
    
    console.log('Initial state - Startup loader:', !!startupLoader, 'Task list:', !!taskListElement);
    
    // If startup loader is present, wait a bit and retry
    while (startupLoader && !taskListElement && attempts < 5) {
      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();
      taskListElement = fixture.debugElement.query(By.css('app-task-list'));
      attempts++;
      console.log(`Retry ${attempts}: Task list found:`, !!taskListElement);
    }
    
    expect(taskListElement).toBeTruthy();
    expect(taskListElement.componentInstance).toBeTruthy();
  });

  it('should show empty state when no tasks', async () => {
    // Wait for app to be fully ready
    await fixture.whenStable();
    fixture.detectChanges();
    
    let emptyState = fixture.debugElement.query(By.css('.task-list__empty'));
    let attempts = 0;
    
    // Wait for empty state to appear if not immediately found
    while (!emptyState && attempts < 5) {
      await new Promise(resolve => setTimeout(resolve, 100));
      fixture.detectChanges();
      emptyState = fixture.debugElement.query(By.css('.task-list__empty'));
      attempts++;
      console.log(`Empty state retry ${attempts}:`, !!emptyState);
    }
    
    console.log('Final empty state found:', !!emptyState);
    if (emptyState) {
      console.log('Empty state text:', emptyState.nativeElement.textContent);
    }
    
    expect(emptyState).toBeTruthy();
    expect(emptyState.nativeElement.textContent).toContain('No tasks');
  });

  it('should not crash with empty tasks array', () => {
    // This test verifies component handles empty arrays gracefully
    expect(() => {
      fixture.detectChanges();
    }).not.toThrow();
  });
});