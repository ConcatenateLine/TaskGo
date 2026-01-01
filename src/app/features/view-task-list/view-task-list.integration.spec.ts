import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

import { App } from '../../app';
import { TaskService } from '../../shared/services/task.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';

describe('TaskListComponent - Basic Integration', () => {
  let fixture: ComponentFixture<App>;
  let app: App;
  let taskService: any;

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
            initializeMockData: () => {}
          }
        },
        {
          provide: AuthService,
          useValue: {
            getUserContext: () => ({ userId: 'test' }),
            isAuthenticated: () => true,
            logSecurityEvent: () => {}
          }
        },
        {
          provide: SecurityService,
          useValue: {
            checkRateLimit: () => ({ allowed: true })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);
    
    fixture.detectChanges();
  });

  it('should render task list component', () => {
    const taskListElement = fixture.debugElement.query(By.css('app-task-list'));
    expect(taskListElement).toBeTruthy();
    expect(taskListElement.componentInstance).toBeTruthy();
  });

  it('should show empty state when no tasks', () => {
    const emptyState = fixture.debugElement.query(By.css('.task-list__empty'));
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