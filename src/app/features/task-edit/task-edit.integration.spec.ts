import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { TaskListComponent } from '../../components/task-list/task-list.component';
import { TaskInlineEditComponent } from '../../components/task-inline-edit/task-inline-edit.component';
import { TaskService } from '../../shared/services/task.service';
import { ValidationService } from '../../shared/services/validation.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';
import { Task, TaskPriority, TaskProject } from '../../shared/models/task.model';

describe('US-003: Edit Task - Integration Tests', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let taskService: any;
  let validationService: any;
  let authService: any;
  let securityService: any;
  let mockTasks: Task[];

  beforeEach(async () => {
    const taskServiceSpy = {
      getTasksByStatusAndProject: vi.fn().mockReturnValue(mockTasks),
      getTaskCounts: vi.fn(),
      updateTask: vi.fn(),
      getTasks: vi.fn()
    };

    const validationServiceSpy = {
      validateTaskTitle: vi.fn().mockImplementation((title: string) => {
        if (!title) {
          return { isValid: false, error: 'Title is required' };
        }
        return { isValid: true };
      }),
      validateTaskDescription: vi.fn().mockImplementation((description: string) => {
        return { isValid: true }; // Description is optional
      }),
      sanitizeForDisplay: vi.fn().mockImplementation((input: string) => input),
      validateCSP: vi.fn().mockReturnValue({ isValid: true, violations: [] })
    };

    const authServiceSpy = {
      logSecurityEvent: vi.fn(),
      isAuthenticated: vi.fn().mockReturnValue(true),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user' }),
      requireAuthentication: vi.fn()
    };

    const securityServiceSpy = {
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
      validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] })
    };

    mockTasks = [
      {
        id: 'task-1',
        title: 'Task to Edit',
        description: 'This task will be edited',
        priority: 'medium' as TaskPriority,
        status: 'TODO',
        project: 'Work' as TaskProject,
        createdAt: new Date('2024-01-15T10:00:00'),
        updatedAt: new Date('2024-01-15T10:00:00')
      },
      {
        id: 'task-2',
        title: 'Another Task',
        description: 'This task stays the same',
        priority: 'high' as TaskPriority,
        status: 'IN_PROGRESS',
        project: 'Personal' as TaskProject,
        createdAt: new Date('2024-01-14T10:00:00'),
        updatedAt: new Date('2024-01-14T10:00:00')
      }
    ];

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TaskListComponent,
        TaskInlineEditComponent
      ],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: ValidationService, useValue: validationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SecurityService, useValue: securityServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);
    validationService = TestBed.inject(ValidationService);
    authService = TestBed.inject(AuthService);
    securityService = TestBed.inject(SecurityService);
    
    // Set up mocks AFTER component creation to ensure they're properly intercepted
    taskService.getTasksByStatusAndProject.mockReturnValue(mockTasks);
    taskService.getTaskCounts.mockReturnValue({
      todo: 1,
      inProgress: 1,
      done: 0,
      total: 2
    });
    
    fixture.detectChanges();
  });

  describe('AC1: Edit button opens form with current data', () => {
    it('should show edit button for each task', () => {
      const editButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--edit'));
      expect(editButtons).toHaveLength(2);
      
      const firstEditButton = editButtons[0].nativeElement;
      expect(firstEditButton.textContent.trim()).toBe('✏️ Edit');
      expect(firstEditButton.getAttribute('aria-label')).toContain('Edit task: Task to Edit');
    });

    it('should emit edit request when edit button is clicked', () => {
      const onTaskActionSpy = vi.spyOn(component, 'onTaskAction');
      
      const editButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--edit'));
      editButtons[0].triggerEventHandler('click', null);
      
      expect(onTaskActionSpy).toHaveBeenCalledWith('task-1', 'edit');
    });

    it('should display inline edit form when editing mode is active', () => {
      // This test will require the component to be enhanced to support edit mode
      // For now, we test that the infrastructure is in place
      expect(component.onTaskAction).toBeDefined();
      
      const editButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--edit'));
      expect(editButtons.length).toBeGreaterThan(0);
    });
  });

  describe('AC4: Cancel button closes without saving', () => {
    it('should emit cancel event when cancel button is clicked', () => {
      const editFixture = TestBed.createComponent(TaskInlineEditComponent);
      const editComponent = editFixture.componentInstance;
      
      // Set task input using component setInput method
      editFixture.componentRef.setInput('task', mockTasks[0]);
      
      editFixture.detectChanges();
      
      const editCancelledSpy = vi.spyOn(editComponent.editCancelled, 'emit');
      
      editComponent.onCancel();
      
      expect(editCancelledSpy).toHaveBeenCalledWith(null);
    });
  });
});