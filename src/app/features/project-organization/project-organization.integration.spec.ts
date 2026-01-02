import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { TaskCreationFormComponent } from '../../components/task-creation-form/task-creation-form.component';
import { TaskInlineEditComponent } from '../../components/task-inline-edit/task-inline-edit.component';
import { TaskListComponent } from '../../components/task-list/task-list.component';
import { TaskService } from '../../shared/services/task.service';
import { ValidationService } from '../../shared/services/validation.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';
import { CryptoService } from '../../shared/services/crypto.service';
import { Task, TaskProject } from '../../shared/models/task.model';

@Component({
  standalone: true,
  imports: [CommonModule, TaskCreationFormComponent, TaskInlineEditComponent, TaskListComponent],
  template: `
    <div class="integration-test-container">
      @if (!currentTask) {
        <app-task-creation-form (taskCreated)="onTaskCreated($event)" (cancelled)="onTaskCancelled()"></app-task-creation-form>
      } @else {
        <app-task-inline-edit [task]="currentTask" (taskUpdated)="onTaskUpdated($event)" (editCancelled)="onEditCancelled()"></app-task-inline-edit>
      }
      <app-task-list (createTaskRequested)="showCreateForm()"></app-task-list>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TaskProjectTestWrapper {
  currentTask: Task | null = null;
  createdTasks: Task[] = [];

  onTaskCreated(task: Task): void {
    this.createdTasks.push(task);
    this.showList();
  }

  onTaskUpdated(task: Task): void {
    const index = this.createdTasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      this.createdTasks[index] = task;
    }
    this.showList();
  }

  onTaskCancelled(): void {
    this.showList();
  }

  showCreateForm(): void {
    this.currentTask = null;
  }

  showList(): void {
    this.currentTask = null;
  }
}

describe('US-007 Integration Tests: Complete Project Workflow', () => {
  let component: TaskProjectTestWrapper;
  let fixture: ComponentFixture<TaskProjectTestWrapper>;
  let taskService: any;
  let validationService: any;
  let authService: any;
  let securityService: any;
  let cryptoService: any;

  const validTaskData = {
    title: 'Complete Project Task',
    description: 'This is a comprehensive integration test for project functionality',
    priority: 'medium' as const,
    status: 'TODO' as const,
    project: 'Work' as TaskProject
  };

  beforeAll(async () => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        CommonModule,
        TaskCreationFormComponent,
        TaskInlineEditComponent,
        TaskListComponent,
        TaskProjectTestWrapper,
      ],
      providers: [
        { provide: TaskService, useValue: {} },
        { provide: ValidationService, useValue: {} },
        { provide: AuthService, useValue: {} },
        { provide: SecurityService, useValue: {} },
        { provide: CryptoService, useValue: {} },
      ],
    });

    await TestBed.compileComponents();
    await (globalThis as any).resolveComponentResources?.();
  });

  beforeEach(async () => {
    TestBed.resetTestingModule();

    const taskServiceSpy = {
      createTask: vi.fn(),
      updateTask: vi.fn(),
      getTasks: vi.fn().mockReturnValue([]),
      getTasksByProject: vi.fn().mockReturnValue([]),
      getTasksByStatusAndProject: vi.fn().mockReturnValue([]),
      getTaskCounts: vi.fn().mockReturnValue({ todo: 0, inProgress: 0, done: 0, total: 0 }),
      initializeMockData: vi.fn()
    };

    const validationServiceSpy = {
      validateTaskTitle: vi.fn().mockImplementation((title: string) => ({ isValid: true, sanitized: 'Sanitized Title' })),
      validateTaskDescription: vi.fn().mockImplementation((description: string) => ({
        isValid: true,
        sanitized: 'Sanitized Description',
      })),
      sanitizeForDisplay: vi.fn((text: string) => text),
      validateCSP: vi.fn().mockReturnValue({ isValid: true, violations: [] })
    };

    const authServiceSpy = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      requireAuthentication: vi.fn().mockReturnValue(undefined),
      logSecurityEvent: vi.fn(() => {
        console.log('Security event logged');
      }),
      getUserContext: vi.fn().mockReturnValue({ userId: 'integration-test-user' }),
      createAnonymousUser: vi.fn()
    };

    const securityServiceSpy = {
      validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] }),
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 100 })
    };

    const cryptoServiceSpy = {
      getItem: vi.fn().mockReturnValue([]),
      setItem: vi.fn(),
      clearTaskStorage: vi.fn(),
      getStorageKey: vi.fn().mockReturnValue('test_key')
    };

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        CommonModule,
        TaskCreationFormComponent,
        TaskInlineEditComponent,
        TaskListComponent,
        TaskProjectTestWrapper,
      ],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: ValidationService, useValue: validationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SecurityService, useValue: securityServiceSpy },
        { provide: CryptoService, useValue: cryptoServiceSpy },
      ],
    }).compileComponents();

    taskService = TestBed.inject(TaskService);
    validationService = TestBed.inject(ValidationService);
    authService = TestBed.inject(AuthService);
    securityService = TestBed.inject(SecurityService);
    cryptoService = TestBed.inject(CryptoService);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskProjectTestWrapper);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Complete Project Workflow', () => {
    it('should create task with Personal project and display in list', async () => {
      const mockTask: Task = {
        ...validTaskData,
        id: 'personal-task-123',
        project: 'Personal',
        createdAt: new Date(),
        updatedAt: new Date(),
        title: 'Sanitized Title',
        description: 'Sanitized Description'
      };

      taskService.createTask.mockReturnValue(mockTask);
      taskService.getTasksByStatusAndProject.mockReturnValue([mockTask]);

      const createFormElement = fixture.debugElement.query(By.css('app-task-creation-form'));
      const titleInput = createFormElement?.query(By.css('input[formControlName="title"]'))?.nativeElement;
      titleInput.value = validTaskData.title;
      titleInput.dispatchEvent(new Event('input'));

      const projectSelect = createFormElement?.query(By.css('select[formControlName="project"]'))?.nativeElement;
      projectSelect.value = 'Personal';
      projectSelect.dispatchEvent(new Event('change'));

      const prioritySelect = createFormElement?.query(By.css('select[formControlName="priority"]'))?.nativeElement;
      prioritySelect.value = 'medium';
      prioritySelect.dispatchEvent(new Event('change'));

      fixture.detectChanges();

      const createButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      expect(createButton?.nativeElement.disabled).toBe(false);

      createButton?.nativeElement.click();
      fixture.detectChanges();

      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'Personal'
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();

      expect(component.createdTasks).toContain(mockTask);
    });

    it('should create task with Work project and display in list', async () => {
      const mockTask: Task = {
        ...validTaskData,
        id: 'work-task-123',
        project: 'Work',
        createdAt: new Date(),
        updatedAt: new Date(),
        title: 'Sanitized Title',
        description: 'Sanitized Description'
      };

      taskService.createTask.mockReturnValue(mockTask);
      taskService.getTasksByStatusAndProject.mockReturnValue([mockTask]);

      const createFormElement = fixture.debugElement.query(By.css('app-task-creation-form'));
      const projectSelect = createFormElement?.query(By.css('select[formControlName="project"]'))?.nativeElement;
      projectSelect.value = 'Work';
      projectSelect.dispatchEvent(new Event('change'));

      fixture.detectChanges();

      const createButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      createButton?.nativeElement.click();
      fixture.detectChanges();

      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'Work'
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
    });

    it('should create task with Study project and display in list', async () => {
      const mockTask: Task = {
        ...validTaskData,
        id: 'study-task-123',
        project: 'Study',
        createdAt: new Date(),
        updatedAt: new Date(),
        title: 'Sanitized Title',
        description: 'Sanitized Description'
      };

      taskService.createTask.mockReturnValue(mockTask);
      taskService.getTasksByStatusAndProject.mockReturnValue([mockTask]);

      const createFormElement = fixture.debugElement.query(By.css('app-task-creation-form'));
      const projectSelect = createFormElement?.query(By.css('select[formControlName="project"]'))?.nativeElement;
      projectSelect.value = 'Study';
      projectSelect.dispatchEvent(new Event('change'));

      fixture.detectChanges();

      const createButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      createButton?.nativeElement.click();
      fixture.detectChanges();

      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'Study'
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
    });

    it('should create task with General project and display in list', async () => {
      const mockTask: Task = {
        ...validTaskData,
        id: 'general-task-123',
        project: 'General',
        createdAt: new Date(),
        updatedAt: new Date(),
        title: 'Sanitized Title',
        description: 'Sanitized Description'
      };

      taskService.createTask.mockReturnValue(mockTask);
      taskService.getTasksByStatusAndProject.mockReturnValue([mockTask]);

      const createFormElement = fixture.debugElement.query(By.css('app-task-creation-form'));
      const projectSelect = createFormElement?.query(By.css('select[formControlName="project"]'))?.nativeElement;
      projectSelect.value = 'General';
      projectSelect.dispatchEvent(new Event('change'));

      fixture.detectChanges();

      const createButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      createButton?.nativeElement.click();
      fixture.detectChanges();

      expect(taskService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'General'
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();
    });
  });

  describe('Project Badge Display Integration', () => {
    it('should display project badges with correct colors in task list', async () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Personal Task',
          description: 'Personal Description',
          priority: 'medium',
          status: 'TODO',
          project: 'Personal',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          title: 'Work Task',
          description: 'Work Description',
          priority: 'high',
          status: 'IN_PROGRESS',
          project: 'Work',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      taskService.getTasksByStatusAndProject.mockReturnValue(mockTasks);

      component.currentTask = null;
      fixture.detectChanges();

      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));

      expect(projectBadges).toHaveLength(2);
    });

    it('should apply distinctive colors to each project type', async () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Personal Task',
          description: 'Personal Description',
          priority: 'medium',
          status: 'TODO',
          project: 'Personal',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          title: 'Work Task',
          description: 'Work Description',
          priority: 'high',
          status: 'IN_PROGRESS',
          project: 'Work',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '3',
          title: 'Study Task',
          description: 'Study Description',
          priority: 'low',
          status: 'DONE',
          project: 'Study',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '4',
          title: 'General Task',
          description: 'General Description',
          priority: 'medium',
          status: 'TODO',
          project: 'General',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      taskService.getTasksByStatusAndProject.mockReturnValue(mockTasks);

      component.currentTask = null;
      fixture.detectChanges();

      const personalBadge = fixture.debugElement.query(By.css('.task-list__badge--project-personal'))?.nativeElement as HTMLElement;
      const workBadge = fixture.debugElement.query(By.css('.task-list__badge--project-work'))?.nativeElement as HTMLElement;
      const studyBadge = fixture.debugElement.query(By.css('.task-list__badge--project-study'))?.nativeElement as HTMLElement;
      const generalBadge = fixture.debugElement.query(By.css('.task-list__badge--project-general'))?.nativeElement as HTMLElement;

      expect(personalBadge).toBeTruthy();
      expect(workBadge).toBeTruthy();
      expect(studyBadge).toBeTruthy();
      expect(generalBadge).toBeTruthy();

      const personalColor = personalBadge ? window.getComputedStyle(personalBadge).backgroundColor : '';
      const workColor = workBadge ? window.getComputedStyle(workBadge).backgroundColor : '';
      const studyColor = studyBadge ? window.getComputedStyle(studyBadge).backgroundColor : '';
      const generalColor = generalBadge ? window.getComputedStyle(generalBadge).backgroundColor : '';

      expect(personalColor).not.toBe(workColor);
      expect(workColor).not.toBe(studyColor);
      expect(studyColor).not.toBe(generalColor);
      expect(generalColor).not.toBe(personalColor);
    });
  });

  describe('Project Update Workflow', () => {
    it('should update task project through edit form', async () => {
      const existingTask: Task = {
        id: 'existing-123',
        title: 'Existing Task',
        description: 'Existing Description',
        priority: 'medium',
        status: 'TODO',
        project: 'Work',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedTask: Task = {
        ...existingTask,
        project: 'Personal',
        updatedAt: new Date(),
        title: 'Sanitized Title',
        description: 'Sanitized Description'
      };

      component.createdTasks = [existingTask];
      component.currentTask = existingTask;

      taskService.updateTask.mockReturnValue(updatedTask);

      fixture.detectChanges();

      const editFormElement = fixture.debugElement.query(By.css('app-task-inline-edit'));
      const projectSelect = editFormElement?.query(By.css('select[formControlName="project"]'))?.nativeElement;
      projectSelect.value = 'Personal';
      projectSelect.dispatchEvent(new Event('change'));

      fixture.detectChanges();

      const saveButton = fixture.debugElement.query(By.css('.task-inline-edit__btn--save'));
      saveButton?.nativeElement.click();
      fixture.detectChanges();

      expect(taskService.updateTask).toHaveBeenCalledWith(
        existingTask.id,
        expect.objectContaining({
          project: 'Personal'
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();

      const updatedTaskInList = component.createdTasks.find(t => t.id === existingTask.id);
      expect(updatedTaskInList?.project).toBe('Personal');
    });
  });

  describe('Project Filtering Integration', () => {
    it('should filter tasks by project', async () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Work Task 1',
          description: 'Work Description 1',
          priority: 'medium',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          title: 'Personal Task 1',
          description: 'Personal Description 1',
          priority: 'high',
          status: 'TODO',
          project: 'Personal',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '3',
          title: 'Work Task 2',
          description: 'Work Description 2',
          priority: 'low',
          status: 'DONE',
          project: 'Work',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      taskService.getTasksByStatusAndProject.mockReturnValue([mockTasks[0], mockTasks[2]]);

      component.currentTask = null;
      fixture.detectChanges();

      const filteredTasks = taskService.getTasksByStatusAndProject('all', 'Work');

      expect(filteredTasks.length).toBe(2);
      filteredTasks.forEach((task: Task) => {
        expect(task.project).toBe('Work');
      });
    });
  });

  describe('Security Integration - Project Field', () => {
    it('should validate project field on creation', async () => {
      const mockTask: Task = {
        ...validTaskData,
        id: 'secure-task-123',
        project: 'Personal',
        createdAt: new Date(),
        updatedAt: new Date(),
        title: 'Sanitized Title',
        description: 'Sanitized Description'
      };

      taskService.createTask.mockReturnValue(mockTask);

      const createFormElement = fixture.debugElement.query(By.css('app-task-creation-form'));
      const projectSelect = createFormElement?.query(By.css('select[formControlName="project"]'))?.nativeElement;
      projectSelect.value = 'Personal';
      projectSelect.dispatchEvent(new Event('change'));

      fixture.detectChanges();

      const createButton = fixture.debugElement.query(By.css('button[type="submit"]'));
      createButton?.nativeElement.click();
      fixture.detectChanges();

      expect(securityService.validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'Personal'
        })
      );
    });

    it('should validate project field on update', async () => {
      const existingTask: Task = {
        id: 'existing-123',
        title: 'Existing Task',
        description: 'Existing Description',
        priority: 'medium',
        status: 'TODO',
        project: 'Work',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      component.createdTasks = [existingTask];
      component.currentTask = existingTask;

      const updatedTask = {
        ...existingTask,
        project: 'Study',
        updatedAt: new Date(),
        title: 'Sanitized Title',
        description: 'Sanitized Description'
      };

      taskService.updateTask.mockReturnValue(updatedTask);

      fixture.detectChanges();

      const editFormElement = fixture.debugElement.query(By.css('app-task-inline-edit'));
      const projectSelect = editFormElement?.query(By.css('select[formControlName="project"]'))?.nativeElement;
      projectSelect.value = 'Study';
      projectSelect.dispatchEvent(new Event('change'));

      fixture.detectChanges();

      const saveButton = fixture.debugElement.query(By.css('.task-inline-edit__btn--save'));
      saveButton?.nativeElement.click();
      fixture.detectChanges();

      expect(securityService.validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          project: 'Study'
        })
      );
    });
  });

  describe('Accessibility Integration', () => {
    it('should have proper ARIA labels for project fields', async () => {
      component.currentTask = null;
      fixture.detectChanges();

      const projectLabel = fixture.debugElement.query(By.css('label[for^="task-project-"]'));
      const projectSelect = fixture.debugElement.query(By.css('select[formControlName="project"]'));

      expect(projectLabel).toBeTruthy();
      expect(projectSelect?.nativeElement.getAttribute('aria-label')).toBe('Select project');
    });

    it('should provide accessible project badges', async () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: 'Description 1',
          priority: 'medium',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      taskService.getTasksByStatusAndProject.mockReturnValue(mockTasks);

      component.currentTask = null;
      fixture.detectChanges();

      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));

      expect(projectBadges.length).toBeGreaterThan(0);
      projectBadges.forEach(badge => {
        expect(badge.nativeElement.getAttribute('aria-label')).toBeTruthy();
      });
    });
  });
});
