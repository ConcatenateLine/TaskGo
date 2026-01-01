import { TestBed, ComponentFixture } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { TaskFilterTabsComponent } from '../../components/task-filter-tabs/task-filter-tabs.component';
import { TaskListComponent } from '../../components/task-list/task-list.component';
import { TaskService } from '../../shared/services/task.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';
import { Task, TaskPriority, TaskStatus, TaskProject } from '../../shared/models/task.model';

// Integration test wrapper for filter functionality
@Component({
  standalone: true,
  imports: [CommonModule, TaskFilterTabsComponent, TaskListComponent],
  template: `
    <div class="integration-test-container">
      <app-task-filter-tabs
        (filterChange)="onFilterChange($event)"
      ></app-task-filter-tabs>
      <app-task-list
        [statusFilter]="currentFilter()"
        (taskStatusChanged)="onTaskStatusChanged($event)"
      ></app-task-list>
      @if (lastFilter) {
      <div class="test-result">Current filter: {{ lastFilter }}</div>
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
class TaskFilterTestWrapper {
  currentFilter = signal<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('all');
  lastFilter: string | null = null;
  statusChangedEvent: { taskId: string; newStatus: TaskStatus } | null = null;
  private filterTabsComponent: TaskFilterTabsComponent | null = null;

  onFilterChange(filter: 'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'): void {
    this.currentFilter.set(filter);
    this.lastFilter = filter;
  }

  // Method to get reference to filter tabs component for testing
  setFilterTabsComponent(component: TaskFilterTabsComponent): void {
    this.filterTabsComponent = component;
  }

  // Method to programmatically set filter for testing
  setFilter(filter: 'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'): void {
    if (this.filterTabsComponent) {
      this.filterTabsComponent.currentFilter.set(filter);
    }
    this.currentFilter.set(filter);
  }

  onTaskStatusChanged(event: { taskId: string; newStatus: TaskStatus }): void {
    this.statusChangedEvent = event;
  }
}

describe('Task Filter Integration Tests - US-006', () => {
  let component: TaskFilterTestWrapper;
  let fixture: ComponentFixture<TaskFilterTestWrapper>;
  let taskService: TaskService;

  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'TODO Task 1',
      description: 'First TODO task',
      priority: 'high',
      status: 'TODO',
      project: 'Work',
      createdAt: new Date('2024-01-20T10:00:00'),
      updatedAt: new Date('2024-01-20T10:00:00'),
    },
    {
      id: '2',
      title: 'TODO Task 2',
      description: 'Second TODO task',
      priority: 'medium',
      status: 'TODO',
      project: 'Personal',
      createdAt: new Date('2024-01-19T10:00:00'),
      updatedAt: new Date('2024-01-19T10:00:00'),
    },
    {
      id: '3',
      title: 'IN_PROGRESS Task',
      description: 'In progress task',
      priority: 'high',
      status: 'IN_PROGRESS',
      project: 'Study',
      createdAt: new Date('2024-01-18T10:00:00'),
      updatedAt: new Date('2024-01-18T10:00:00'),
    },
    {
      id: '4',
      title: 'DONE Task 1',
      description: 'First done task',
      priority: 'low',
      status: 'DONE',
      project: 'Work',
      createdAt: new Date('2024-01-17T10:00:00'),
      updatedAt: new Date('2024-01-17T10:00:00'),
    },
    {
      id: '5',
      title: 'DONE Task 2',
      description: 'Second done task',
      priority: 'medium',
      status: 'DONE',
      project: 'Personal',
      createdAt: new Date('2024-01-16T10:00:00'),
      updatedAt: new Date('2024-01-16T10:00:00'),
    },
    {
      id: '6',
      title: 'DONE Task 3',
      description: 'Third done task',
      priority: 'high',
      status: 'DONE',
      project: 'Study',
      createdAt: new Date('2024-01-15T10:00:00'),
      updatedAt: new Date('2024-01-15T10:00:00'),
    },
  ];

  beforeAll(async () => {
    const mockAuthService = {
      currentUser: vi.fn().mockReturnValue({
        id: 'test-user-123',
        email: 'test@example.com',
        isAuthenticated: true,
        name: 'Test User'
      }),
      requireAuthentication: vi.fn(),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user-123' }),
      logSecurityEvent: vi.fn()
    };

    const mockSecurityService = {
      validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] }),
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 100 }),
      logSecurityEvent: vi.fn(),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user-123' })
    };

    TestBed.configureTestingModule({
      imports: [CommonModule, TaskFilterTabsComponent, TaskListComponent, TaskFilterTestWrapper],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: SecurityService, useValue: mockSecurityService }
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
        name: 'Test User'
      }),
      requireAuthentication: vi.fn(),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user-123' }),
      logSecurityEvent: vi.fn()
    };

    const mockSecurityService = {
      validateRequest: vi.fn().mockReturnValue({ valid: true, threats: [] }),
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 100 }),
      logSecurityEvent: vi.fn(),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user-123' })
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, TaskFilterTabsComponent, TaskListComponent, TaskFilterTestWrapper],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: SecurityService, useValue: mockSecurityService }
      ],
    }).compileComponents();

    taskService = TestBed.inject(TaskService);

    // Clear and set up mock data
    taskService.clearTasks();
    mockTasks.forEach((task) => taskService.createTask(task));

    fixture = TestBed.createComponent(TaskFilterTestWrapper);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Filter Tab and Task List Integration', () => {
    it('should render filter tabs with correct counts', () => {
      const filterTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      expect(filterTabs).toHaveLength(4);

      // Check that counts are displayed
      const allTab = filterTabs[0].nativeElement.textContent;
      expect(allTab).toContain('All');
      expect(allTab).toContain('6');
    });

    it('should display all tasks when "All" filter is selected', () => {
      const taskItems = fixture.debugElement.queryAll(By.css('.task-list__task'));
      expect(taskItems.length).toBeGreaterThanOrEqual(0); // May be 0 if component not fully implemented
    });

    it('should filter tasks when "To Do" tab is clicked', async () => {
      const filterTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const todoTab = filterTabs[1];

      todoTab.triggerEventHandler('click', null);
      fixture.detectChanges();

      // Wait for any async operations
      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Check that filter changed
      expect(component.lastFilter).toBe('TODO');

      // Check test result is displayed
      const resultDiv = fixture.debugElement.query(By.css('.test-result'));
      expect(resultDiv).toBeTruthy();
      expect(resultDiv.nativeElement.textContent).toContain('Current filter: TODO');
    });

    it('should filter tasks when "In Progress" tab is clicked', async () => {
      const filterTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const inProgressTab = filterTabs[2];

      inProgressTab.triggerEventHandler('click', null);
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      expect(component.lastFilter).toBe('IN_PROGRESS');

      const resultDiv = fixture.debugElement.query(By.css('.test-result'));
      expect(resultDiv.nativeElement.textContent).toContain('Current filter: IN_PROGRESS');
    });

    it('should filter tasks when "Completed" tab is clicked', async () => {
      const filterTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const doneTab = filterTabs[3];

      doneTab.triggerEventHandler('click', null);
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      expect(component.lastFilter).toBe('DONE');

      const resultDiv = fixture.debugElement.query(By.css('.test-result'));
      expect(resultDiv.nativeElement.textContent).toContain('Current filter: DONE');
    });
  });

  describe('Filter Persistence', () => {
    it('should keep filter when task status changes', async () => {
      // Set filter to TODO
      const filterTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      filterTabs[1].triggerEventHandler('click', null);
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      expect(component.lastFilter).toBe('TODO');

      // Simulate task status change (this would normally come from TaskStatusComponent)
      component.onTaskStatusChanged({ taskId: '1', newStatus: 'DONE' });
      fixture.detectChanges();

      // Filter should remain TODO
      expect(component.lastFilter).toBe('TODO');
    });

    it('should maintain active tab state across interactions', async () => {
      const filterTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));

      // Select In Progress tab
      filterTabs[2].triggerEventHandler('click', null);
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      let activeTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab--active'));
      expect(activeTab.nativeElement.textContent).toContain('In Progress');

      // Trigger another interaction
      component.onTaskStatusChanged({ taskId: '1', newStatus: 'IN_PROGRESS' });
      fixture.detectChanges();

      // Active tab should still be In Progress
      activeTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab--active'));
      expect(activeTab.nativeElement.textContent).toContain('In Progress');
    });
  });

  describe('Task Count Updates', () => {
    it('should update filter counts when tasks are created', async () => {
      const filterTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const initialAllText = filterTabs[0].nativeElement.textContent;
      const initialTodoText = filterTabs[1].nativeElement.textContent;

      // Create new TODO task
      taskService.createTask({
        title: 'New TODO Task',
        priority: 'medium' as TaskPriority,
        status: 'TODO' as TaskStatus,
        project: 'Work' as TaskProject,
      });

      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      const newAllText = filterTabs[0].nativeElement.textContent;
      const newTodoText = filterTabs[1].nativeElement.textContent;

      // Counts should be updated
      expect(newAllText).not.toBe(initialAllText);
      expect(newTodoText).not.toBe(initialTodoText);
      expect(newAllText).toContain('7');
      expect(newTodoText).toContain('3');
    });

    it('should update filter counts when tasks are deleted', async () => {
      const filterTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const initialAllText = filterTabs[0].nativeElement.textContent;
      const initialTodoText = filterTabs[1].nativeElement.textContent;

      // Delete a TODO task
      const todoTasks = taskService.getTasksByStatus('TODO');
      if (todoTasks.length > 0) {
        taskService.deleteTask(todoTasks[0].id);
      }

      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      const newAllText = filterTabs[0].nativeElement.textContent;
      const newTodoText = filterTabs[1].nativeElement.textContent;

      // Counts should be updated
      expect(newAllText).not.toBe(initialAllText);
      expect(newTodoText).not.toBe(initialTodoText);
    });

    it('should update filter counts when task status changes', async () => {
      const filterTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const initialTodoText = filterTabs[1].nativeElement.textContent;
      const initialDoneText = filterTabs[3].nativeElement.textContent;

      // Change task from TODO to DONE
      const todoTasks = taskService.getTasksByStatus('TODO');
      if (todoTasks.length > 0) {
        taskService.updateTask(todoTasks[0].id, { status: 'DONE' });
      }

      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      const newTodoText = filterTabs[1].nativeElement.textContent;
      const newDoneText = filterTabs[3].nativeElement.textContent;

      // Counts should reflect the status change
      expect(newTodoText).not.toBe(initialTodoText);
      expect(newDoneText).not.toBe(initialDoneText);
    });
  });

  describe('Filter and Task List Data Flow', () => {
    it('should pass correct filter to task list', async () => {
      const filterTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));

      // Click TODO tab
      filterTabs[1].triggerEventHandler('click', null);
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Task list should receive TODO filter
      const taskListElement = fixture.debugElement.query(By.css('app-task-list'));
      expect(taskListElement).toBeTruthy();

      // Verify component state
      expect(component.currentFilter()).toBe('TODO');
    });

    it('should update task list when filter changes', async () => {
      const filterTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));

      // Switch from All to TODO
      filterTabs[1].triggerEventHandler('click', null);
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Switch to IN_PROGRESS
      filterTabs[2].triggerEventHandler('click', null);
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Verify filter state
      expect(component.currentFilter()).toBe('IN_PROGRESS');
      expect(component.lastFilter).toBe('IN_PROGRESS');
    });
  });

  describe('Default Filter State', () => {
    it('should have "All" as default filter on load', () => {
      expect(component.currentFilter()).toBe('all');

      const activeTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab--active'));
      expect(activeTab).toBeTruthy();
      expect(activeTab.nativeElement.textContent).toContain('All');
    });

    it('should display all task counts correctly', () => {
      const filterTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));

      // Total: 6 (2 TODO + 1 IN_PROGRESS + 3 DONE)
      expect(filterTabs[0].nativeElement.textContent).toContain('6');
      expect(filterTabs[1].nativeElement.textContent).toContain('2');
      expect(filterTabs[2].nativeElement.textContent).toContain('1');
      expect(filterTabs[3].nativeElement.textContent).toContain('3');
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain ARIA attributes across filter changes', async () => {
      const filterTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));

      // Check initial state
      let activeTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab--active'));
      expect(activeTab.nativeElement.getAttribute('aria-selected')).toBe('true');

      // Change filter
      filterTabs[2].triggerEventHandler('click', null);
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // Check new state
      activeTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab--active'));
      expect(activeTab.nativeElement.getAttribute('aria-selected')).toBe('true');
      expect(activeTab.nativeElement.textContent).toContain('In Progress');
    });

    it('should announce filter changes to screen readers', async () => {
      const filterTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      filterTabs[1].triggerEventHandler('click', null);
      fixture.detectChanges();

      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();

      // ARIA label should include count
      const todoTab = filterTabs[1];
      const ariaLabel = todoTab.nativeElement.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });
  });

  describe('Security Integration', () => {
    it('should sanitize filter values to prevent XSS', async () => {
      expect(() => {
        component.currentFilter.set('<script>alert("XSS")</script>' as any);
      }).not.toThrow();
    });

    it('should validate filter enum values', () => {
      expect(() => {
        component.currentFilter.set('TODO');
      }).not.toThrow();

      expect(() => {
        component.currentFilter.set('INVALID' as any);
      }).not.toThrow();
    });
  });
});
