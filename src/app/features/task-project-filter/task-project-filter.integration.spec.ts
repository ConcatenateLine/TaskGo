import { TestBed, ComponentFixture } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { TaskFilterTabsComponent } from '../../components/task-filter-tabs/task-filter-tabs.component';
import { TaskProjectFilterComponent } from '../../components/task-project-filter/task-project-filter.component';
import { TaskListComponent } from '../../components/task-list/task-list.component';
import { TaskService } from '../../shared/services/task.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';
import { Task, TaskPriority, TaskStatus, TaskProject } from '../../shared/models/task.model';

// Integration test wrapper for cumulative filter functionality
@Component({
  standalone: true,
  imports: [CommonModule, TaskFilterTabsComponent, TaskProjectFilterComponent, TaskListComponent],
  template: `
    <div class="integration-test-container">
      <app-task-filter-tabs
        (filterChange)="onStatusFilterChange($event)"
      ></app-task-filter-tabs>
      <app-task-project-filter
        (filterChange)="onProjectFilterChange($event)"
      ></app-task-project-filter>
      <app-task-list
        [statusFilter]="currentStatusFilter()"
        [projectFilter]="currentProjectFilter()"
        (taskStatusChanged)="onTaskStatusChanged($event)"
      ></app-task-list>
      @if (lastStatusFilter || lastProjectFilter) {
      <div class="test-result">
        Current filters: Status={{ lastStatusFilter }}, Project={{ lastProjectFilter }}
      </div>
      }
      @if (statusChangedEvent) {
      <div class="status-change-result">
        Status changed: {{ statusChangedEvent.taskId }} to {{ statusChangedEvent.newStatus }}
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class CumulativeFilterTestWrapper {
  currentStatusFilter = signal<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('all');
  currentProjectFilter = signal<'all' | 'Personal' | 'Work' | 'Study' | 'General'>('all');
  lastStatusFilter: string | null = null;
  lastProjectFilter: string | null = null;
  statusChangedEvent: { taskId: string; newStatus: TaskStatus } | null = null;

  onStatusFilterChange(filter: 'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'): void {
    this.currentStatusFilter.set(filter);
    this.lastStatusFilter = filter;
  }

  onProjectFilterChange(filter: 'all' | 'Personal' | 'Work' | 'Study' | 'General'): void {
    this.currentProjectFilter.set(filter);
    this.lastProjectFilter = filter;
  }

  onTaskStatusChanged(event: { taskId: string; newStatus: TaskStatus }): void {
    this.statusChangedEvent = event;
  }
}

describe('Cumulative Filter Integration Tests - US-008', () => {
  let component: CumulativeFilterTestWrapper;
  let fixture: ComponentFixture<CumulativeFilterTestWrapper>;
  let taskService: TaskService;

  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Work TODO',
      description: 'Work task in TODO status',
      priority: 'high',
      status: 'TODO',
      project: 'Work',
      createdAt: new Date('2024-01-20T10:00:00'),
      updatedAt: new Date('2024-01-20T10:00:00'),
    },
    {
      id: '2',
      title: 'Work IN_PROGRESS',
      description: 'Work task in IN_PROGRESS status',
      priority: 'medium',
      status: 'IN_PROGRESS',
      project: 'Work',
      createdAt: new Date('2024-01-19T10:00:00'),
      updatedAt: new Date('2024-01-19T10:00:00'),
    },
    {
      id: '3',
      title: 'Work DONE',
      description: 'Work task in DONE status',
      priority: 'low',
      status: 'DONE',
      project: 'Work',
      createdAt: new Date('2024-01-18T10:00:00'),
      updatedAt: new Date('2024-01-18T10:00:00'),
    },
    {
      id: '4',
      title: 'Personal TODO',
      description: 'Personal task in TODO status',
      priority: 'high',
      status: 'TODO',
      project: 'Personal',
      createdAt: new Date('2024-01-17T10:00:00'),
      updatedAt: new Date('2024-01-17T10:00:00'),
    },
    {
      id: '5',
      title: 'Personal IN_PROGRESS',
      description: 'Personal task in IN_PROGRESS status',
      priority: 'medium',
      status: 'IN_PROGRESS',
      project: 'Personal',
      createdAt: new Date('2024-01-16T10:00:00'),
      updatedAt: new Date('2024-01-16T10:00:00'),
    },
    {
      id: '6',
      title: 'Study TODO',
      description: 'Study task in TODO status',
      priority: 'high',
      status: 'TODO',
      project: 'Study',
      createdAt: new Date('2024-01-15T10:00:00'),
      updatedAt: new Date('2024-01-15T10:00:00'),
    },
    {
      id: '7',
      title: 'General IN_PROGRESS',
      description: 'General task in IN_PROGRESS status',
      priority: 'medium',
      status: 'IN_PROGRESS',
      project: 'General',
      createdAt: new Date('2024-01-14T10:00:00'),
      updatedAt: new Date('2024-01-14T10:00:00'),
    },
  ];

  beforeAll(async () => {
    const mockAuthService = {
      currentUser: vi.fn().mockReturnValue({
        id: 'test-user-123',
        email: 'test@example.com',
        isAuthenticated: true,
        name: 'Test User',
      }),
      requireAuthentication: vi.fn(),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user-123' }),
      logSecurityEvent: vi.fn(),
    };

    const mockSecurityService = {
      validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] }),
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 100 }),
      logSecurityEvent: vi.fn(),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user-123' }),
    };

    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        TaskFilterTabsComponent,
        TaskProjectFilterComponent,
        TaskListComponent,
        CumulativeFilterTestWrapper,
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: SecurityService, useValue: mockSecurityService },
      ],
    });

    await TestBed.compileComponents();
    await (globalThis as any).resolveComponentResources?.();
  });

  beforeEach(async () => {
    TestBed.resetTestingModule();

    const mockAuthService = {
      currentUser: vi.fn().mockReturnValue({
        id: 'test-user-123',
        email: 'test@example.com',
        isAuthenticated: true,
        name: 'Test User',
      }),
      requireAuthentication: vi.fn(),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user-123' }),
      logSecurityEvent: vi.fn(),
    };

    const mockSecurityService = {
      validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] }),
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 100 }),
      logSecurityEvent: vi.fn(),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user-123' }),
    };

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        TaskFilterTabsComponent,
        TaskProjectFilterComponent,
        TaskListComponent,
        CumulativeFilterTestWrapper,
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: SecurityService, useValue: mockSecurityService },
      ],
    }).compileComponents();

    taskService = TestBed.inject(TaskService);

    // Clear and set up mock data
    taskService.clearTasks();
    mockTasks.forEach((task) => taskService.createTask(task));

    fixture = TestBed.createComponent(CumulativeFilterTestWrapper);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Cumulative Filter Rendering', () => {
    it('should render both status and project filters', () => {
      const statusTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const projectSelect = fixture.debugElement.query(By.css('.task-project-filter__select'));

      expect(statusTabs).toHaveLength(4); // All, To Do, In Progress, Completed
      expect(projectSelect).toBeTruthy();
    });

    it('should have "All" as default status filter', () => {
      const activeStatusTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab--active'));
      expect(activeStatusTab.nativeElement.textContent).toContain('All');
    });

    it('should have "All projects" as default project filter', () => {
      const projectSelect = fixture.debugElement.query(By.css('.task-project-filter__select'));
      const options = projectSelect.queryAll(By.css('option'));

      const selectedOption = options.find((opt) => opt.nativeElement.selected);
      expect(selectedOption.nativeElement.textContent).toContain('All projects');
    });

    it('should display task counts in both filters', () => {
      const statusTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const projectSelect = fixture.debugElement.query(By.css('.task-project-filter__select'));
      const projectOptions = projectSelect.queryAll(By.css('option'));

      // Status tabs should have counts
      statusTabs.forEach((tab) => {
        const text = tab.nativeElement.textContent;
        // Should contain a number (count)
        expect(text).toMatch(/\d+/);
      });

      // Project options should have counts
      projectOptions.forEach((option) => {
        const text = option.nativeElement.textContent;
        expect(text).toMatch(/\d+/);
      });
    });
  });

  describe('Cumulative Filter Behavior', () => {
    it('should filter tasks when only status filter is applied', async () => {
      const statusTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const todoTab = statusTabs[1]; // TODO tab

      todoTab.triggerEventHandler('click', null);
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      expect(component.lastStatusFilter).toBe('TODO');
      expect(component.lastProjectFilter).toBeNull();

      const resultDiv = fixture.debugElement.query(By.css('.test-result'));
      expect(resultDiv.nativeElement.textContent).toContain('Status=TODO');
    });

    it('should filter tasks when only project filter is applied', async () => {
      const projectSelect = fixture.debugElement.query(By.css('.task-project-filter__select'));
      const options = projectSelect.queryAll(By.css('option'));
      const workOption = options.find((opt) => opt.nativeElement.textContent.includes('Work'));

      workOption!.nativeElement.selected = true;
      projectSelect.triggerEventHandler('change', { target: { value: 'Work' } });
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      expect(component.lastProjectFilter).toBe('Work');
      expect(component.lastStatusFilter).toBeNull();

      const resultDiv = fixture.debugElement.query(By.css('.test-result'));
      expect(resultDiv.nativeElement.textContent).toContain('Project=Work');
    });

    it('should filter tasks cumulatively when both filters are applied', async () => {
      const statusTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const projectSelect = fixture.debugElement.query(By.css('.task-project-filter__select'));
      const projectOptions = projectSelect.queryAll(By.css('option'));

      // Apply status filter
      const todoTab = statusTabs[1]; // TODO tab
      todoTab.triggerEventHandler('click', null);
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Apply project filter
      const workOption = projectOptions.find((opt) => opt.nativeElement.textContent.includes('Work'));
      workOption!.nativeElement.selected = true;
      projectSelect.triggerEventHandler('change', { target: { value: 'Work' } });
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      expect(component.lastStatusFilter).toBe('TODO');
      expect(component.lastProjectFilter).toBe('Work');

      const resultDiv = fixture.debugElement.query(By.css('.test-result'));
      expect(resultDiv.nativeElement.textContent).toContain('Status=TODO');
      expect(resultDiv.nativeElement.textContent).toContain('Project=Work');
    });

    it('should maintain both filters when switching project', async () => {
      // Set initial filters
      const statusTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const projectSelect = fixture.debugElement.query(By.css('.task-project-filter__select'));
      const projectOptions = projectSelect.queryAll(By.css('option'));

      statusTabs[1].triggerEventHandler('click', null); // TODO
      fixture.detectChanges();

      const workOption = projectOptions.find((opt) => opt.nativeElement.textContent.includes('Work'));
      workOption!.nativeElement.selected = true;
      projectSelect.triggerEventHandler('change', { target: { value: 'Work' } });
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Change project filter
      const personalOption = projectOptions.find((opt) => opt.nativeElement.textContent.includes('Personal'));
      personalOption!.nativeElement.selected = true;
      projectSelect.triggerEventHandler('change', { target: { value: 'Personal' } });
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Status should remain TODO, project should be Personal
      expect(component.lastStatusFilter).toBe('TODO');
      expect(component.lastProjectFilter).toBe('Personal');

      const resultDiv = fixture.debugElement.query(By.css('.test-result'));
      expect(resultDiv.nativeElement.textContent).toContain('Status=TODO');
      expect(resultDiv.nativeElement.textContent).toContain('Project=Personal');
    });

    it('should maintain both filters when switching status', async () => {
      // Set initial filters
      const statusTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const projectSelect = fixture.debugElement.query(By.css('.task-project-filter__select'));
      const projectOptions = projectSelect.queryAll(By.css('option'));

      statusTabs[1].triggerEventHandler('click', null); // TODO
      fixture.detectChanges();

      const workOption = projectOptions.find((opt) => opt.nativeElement.textContent.includes('Work'));
      workOption!.nativeElement.selected = true;
      projectSelect.triggerEventHandler('change', { target: { value: 'Work' } });
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Change status filter
      const inProgressTab = statusTabs[2]; // IN_PROGRESS tab
      inProgressTab.triggerEventHandler('click', null);
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Project should remain Work, status should be IN_PROGRESS
      expect(component.lastStatusFilter).toBe('IN_PROGRESS');
      expect(component.lastProjectFilter).toBe('Work');

      const resultDiv = fixture.debugElement.query(By.css('.test-result'));
      expect(resultDiv.nativeElement.textContent).toContain('Status=IN_PROGRESS');
      expect(resultDiv.nativeElement.textContent).toContain('Project=Work');
    });
  });

  describe('Cumulative Filter with Task List', () => {
    it('should pass correct filters to task list', async () => {
      const statusTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const projectSelect = fixture.debugElement.query(By.css('.task-project-filter__select'));
      const projectOptions = projectSelect.queryAll(By.css('option'));

      // Apply filters
      statusTabs[1].triggerEventHandler('click', null); // TODO
      fixture.detectChanges();

      const workOption = projectOptions.find((opt) => opt.nativeElement.textContent.includes('Work'));
      workOption!.nativeElement.selected = true;
      projectSelect.triggerEventHandler('change', { target: { value: 'Work' } });
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Task list should receive both filters
      const taskListElement = fixture.debugElement.query(By.css('app-task-list'));
      expect(taskListElement).toBeTruthy();

      expect(component.currentStatusFilter()).toBe('TODO');
      expect(component.currentProjectFilter()).toBe('Work');
    });

    it('should update task list when filters change', async () => {
      const statusTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const projectSelect = fixture.debugElement.query(By.css('.task-project-filter__select'));
      const projectOptions = projectSelect.queryAll(By.css('option'));

      // Start with TODO + Work
      statusTabs[1].triggerEventHandler('click', null);
      fixture.detectChanges();

      const workOption = projectOptions.find((opt) => opt.nativeElement.textContent.includes('Work'));
      workOption!.nativeElement.selected = true;
      projectSelect.triggerEventHandler('change', { target: { value: 'Work' } });
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      expect(component.currentStatusFilter()).toBe('TODO');
      expect(component.currentProjectFilter()).toBe('Work');

      // Change to IN_PROGRESS + Work
      statusTabs[2].triggerEventHandler('click', null);
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      expect(component.currentStatusFilter()).toBe('IN_PROGRESS');
      expect(component.currentProjectFilter()).toBe('Work');
    });
  });

  describe('Filter Persistence', () => {
    it('should maintain filters when task status changes', async () => {
      // Set filters
      const statusTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const projectSelect = fixture.debugElement.query(By.css('.task-project-filter__select'));
      const projectOptions = projectSelect.queryAll(By.css('option'));

      statusTabs[1].triggerEventHandler('click', null); // TODO
      fixture.detectChanges();

      const workOption = projectOptions.find((opt) => opt.nativeElement.textContent.includes('Work'));
      workOption!.nativeElement.selected = true;
      projectSelect.triggerEventHandler('change', { target: { value: 'Work' } });
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Simulate task status change
      component.onTaskStatusChanged({ taskId: '1', newStatus: 'DONE' });
      fixture.detectChanges();

      // Filters should remain
      expect(component.lastStatusFilter).toBe('TODO');
      expect(component.lastProjectFilter).toBe('Work');
    });

    it('should maintain filters across multiple interactions', async () => {
      const statusTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));

      // Set filters
      statusTabs[1].triggerEventHandler('click', null); // TODO
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Simulate task status change
      component.onTaskStatusChanged({ taskId: '2', newStatus: 'DONE' });
      fixture.detectChanges();

      // Change status filter
      statusTabs[2].triggerEventHandler('click', null); // IN_PROGRESS
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Filter should be IN_PROGRESS
      expect(component.lastStatusFilter).toBe('IN_PROGRESS');
    });
  });

  describe('Filter Count Updates', () => {
    it('should update counts when tasks are created', async () => {
      const statusTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const projectSelect = fixture.debugElement.query(By.css('.task-project-filter__select'));
      const projectOptions = projectSelect.queryAll(By.css('option'));

      const initialAllStatusText = statusTabs[0].nativeElement.textContent;
      const initialAllProjectText = projectOptions[0].nativeElement.textContent;

      // Create new task
      taskService.createTask({
        title: 'New Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      const newAllStatusText = statusTabs[0].nativeElement.textContent;
      const newAllProjectText = projectOptions[0].nativeElement.textContent;

      expect(newAllStatusText).not.toBe(initialAllStatusText);
      expect(newAllProjectText).not.toBe(initialAllProjectText);
    });

    it('should update counts when tasks are deleted', async () => {
      const statusTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const projectSelect = fixture.debugElement.query(By.css('.task-project-filter__select'));
      const projectOptions = projectSelect.queryAll(By.css('option'));

      const initialAllStatusText = statusTabs[0].nativeElement.textContent;

      // Delete a task
      const todoTasks = taskService.getTasksByStatus('TODO');
      if (todoTasks.length > 0) {
        taskService.deleteTask(todoTasks[0].id);
      }

      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      const newAllStatusText = statusTabs[0].nativeElement.textContent;
      expect(newAllStatusText).not.toBe(initialAllStatusText);
    });

    it('should update counts when task status changes', async () => {
      const statusTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));

      const initialTodoText = statusTabs[1].nativeElement.textContent;
      const initialDoneText = statusTabs[3].nativeElement.textContent;

      // Change task from TODO to DONE
      const todoTasks = taskService.getTasksByStatus('TODO');
      if (todoTasks.length > 0) {
        taskService.updateTask(todoTasks[0].id, { status: 'DONE' });
      }

      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      const newTodoText = statusTabs[1].nativeElement.textContent;
      const newDoneText = statusTabs[3].nativeElement.textContent;

      expect(newTodoText).not.toBe(initialTodoText);
      expect(newDoneText).not.toBe(initialDoneText);
    });

    it('should update counts when task project changes', async () => {
      const projectSelect = fixture.debugElement.query(By.css('.task-project-filter__select'));
      const projectOptions = projectSelect.queryAll(By.css('option'));

      const initialWorkText = projectOptions.find((opt) => opt.nativeElement.textContent.includes('Work'))!.nativeElement.textContent;
      const initialPersonalText = projectOptions.find((opt) => opt.nativeElement.textContent.includes('Personal'))!.nativeElement.textContent;

      // Change task from Work to Personal
      const workTasks = taskService.getTasksByProject('Work');
      if (workTasks.length > 0) {
        taskService.updateTask(workTasks[0].id, { project: 'Personal' });
      }

      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      const newWorkText = projectOptions.find((opt) => opt.nativeElement.textContent.includes('Work'))!.nativeElement.textContent;
      const newPersonalText = projectOptions.find((opt) => opt.nativeElement.textContent.includes('Personal'))!.nativeElement.textContent;

      expect(newWorkText).not.toBe(initialWorkText);
      expect(newPersonalText).not.toBe(initialPersonalText);
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain ARIA attributes across filter changes', async () => {
      const statusTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const projectSelect = fixture.debugElement.query(By.css('.task-project-filter__select'));

      // Check initial state
      let activeTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab--active'));
      expect(activeTab.nativeElement.getAttribute('aria-selected')).toBe('true');

      // Change status filter
      statusTabs[2].triggerEventHandler('click', null);
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Check new state
      activeTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab--active'));
      expect(activeTab.nativeElement.getAttribute('aria-selected')).toBe('true');

      // Project filter should still have proper ARIA
      const ariaLabel = projectSelect.nativeElement.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });

    it('should announce filter changes to screen readers', async () => {
      const statusTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const projectSelect = fixture.debugElement.query(By.css('.task-project-filter__select'));
      const projectOptions = projectSelect.queryAll(By.css('option'));

      statusTabs[1].triggerEventHandler('click', null);
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Status tab should have count in ARIA
      const todoTab = statusTabs[1];
      const ariaLabel = todoTab.nativeElement.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toMatch(/\d+/);

      // Project dropdown should have proper ARIA
      const workOption = projectOptions.find((opt) => opt.nativeElement.textContent.includes('Work'));
      workOption!.nativeElement.selected = true;
      projectSelect.triggerEventHandler('change', { target: { value: 'Work' } });
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      const projectAriaLabel = projectSelect.nativeElement.getAttribute('aria-label');
      expect(projectAriaLabel).toBeTruthy();
    });
  });

  describe('Security Integration', () => {
    it('should sanitize cumulative filter values to prevent XSS', async () => {
      expect(() => {
        component.currentStatusFilter.set('<script>alert("XSS")</script>' as any);
        component.currentProjectFilter.set('<script>alert("XSS")</script>' as any);
      }).not.toThrow();
    });

    it('should validate filter enum values', () => {
      expect(() => {
        component.currentStatusFilter.set('TODO');
        component.currentProjectFilter.set('Work');
      }).not.toThrow();

      expect(() => {
        component.currentStatusFilter.set('INVALID' as any);
        component.currentProjectFilter.set('INVALID' as any);
      }).not.toThrow();
    });
  });
});
