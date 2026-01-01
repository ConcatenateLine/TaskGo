import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TaskListComponent } from './task-list.component';
import { TaskService } from '../../shared/services/task.service';
import { ValidationService } from '../../shared/services/validation.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';
import { TaskInlineEditComponent } from '../task-inline-edit/task-inline-edit.component';
import { DomSanitizer } from '@angular/platform-browser';
import { Task } from '../../shared/models/task.model';

describe('TaskListComponent - Debug Delete Buttons', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let taskService: any;

  const mockTask: Task = {
    id: 'test-task-1',
    title: 'Test Task for Deletion',
    description: 'This task will be deleted',
    priority: 'medium',
    status: 'TODO',
    project: 'Work',
    createdAt: new Date('2024-01-15T10:00:00'),
    updatedAt: new Date('2024-01-15T10:00:00'),
  };

  beforeEach(async () => {
    const taskServiceSpy = {
      getTasksByStatusAndProject: vi.fn(),
      getTaskCounts: vi.fn(),
      deleteTask: vi.fn(),
      getTasks: vi.fn(),
      initializeMockData: vi.fn(),
      getStatusTransitions: vi.fn().mockImplementation((status: any) => {
        if (status === 'TODO') return ['IN_PROGRESS'];
        if (status === 'IN_PROGRESS') return ['TODO', 'DONE'];
        if (status === 'DONE') return ['IN_PROGRESS'];
        return [];
      }),
    };

    const validationServiceSpy = {
      sanitizeForDisplay: vi.fn(),
      validateCSP: vi.fn()
    };

    const authServiceSpy = {
      logSecurityEvent: vi.fn(),
      getUserContext: vi.fn(),
      requireAuthentication: vi.fn(),
      isAuthenticated: vi.fn()
    };

    const securityServiceSpy = {
      checkRateLimit: vi.fn()
    };

    const sanitizerSpy = {
      sanitize: vi.fn()
    };

    taskServiceSpy.getTasksByStatusAndProject.mockReturnValue([mockTask]);
    taskServiceSpy.getTaskCounts.mockReturnValue({
      todo: 1,
      inProgress: 0,
      done: 0,
      total: 1
    });
    taskServiceSpy.getStatusTransitions.mockReturnValue(['IN_PROGRESS', 'DONE']);
    validationServiceSpy.sanitizeForDisplay.mockImplementation((input: string) => input);
    sanitizerSpy.sanitize.mockReturnValue('sanitized-content');
    authServiceSpy.getUserContext.mockReturnValue({ userId: 'test-user' });
    securityServiceSpy.checkRateLimit.mockReturnValue({ allowed: true });

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        TaskListComponent,
        TaskInlineEditComponent,
        NoopAnimationsModule
      ],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: ValidationService, useValue: validationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SecurityService, useValue: securityServiceSpy },
        { provide: DomSanitizer, useValue: sanitizerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);

    // Set default filter values to ensure tasks are visible
    fixture.componentRef.setInput('statusFilter', 'all');
    fixture.componentRef.setInput('projectFilter', 'all');

    fixture.detectChanges();

    // Wait a tick for component to fully initialize
    await Promise.resolve();
  });

  it('DEBUG: should render delete buttons', () => {
    console.log('=== DOM DEBUG ===');
    console.log('Filtered tasks length:', component.filteredTasks().length);
    console.log('Status filter:', component.statusFilter());
    console.log('Project filter:', component.projectFilter());
    console.log('Sorted tasks:', component.sortedTasks().map(t => ({ id: t.id, title: t.title })));
    console.log('DOM HTML:', fixture.debugElement.nativeElement.outerHTML);

    const deleteButtons = fixture.debugElement.queryAll(
      By.css('.task-list__action-btn--delete')
    );

    console.log('Delete buttons found:', deleteButtons.length);
    expect(deleteButtons.length).toBeGreaterThan(0);
  });
});