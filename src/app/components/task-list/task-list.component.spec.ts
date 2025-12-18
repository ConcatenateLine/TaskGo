import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { TaskListComponent } from './task-list.component';
import { TaskService } from '../../shared/services/task.service';
import { Task } from '../../shared/models/task.model';

// Mock spyOn for Vitest environment
const spyOn = (obj: any, method: string) => {
  const spy = vi.fn();
  obj[method] = spy;
  return spy;
};

describe('TaskListComponent', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let taskService: any;
  let mockTasks: Task[];

  beforeEach(async () => {
    const taskServiceSpy = {
      getTasksByStatusAndProject: vi.fn(),
      getTaskCounts: vi.fn(),
      initializeMockData: vi.fn()
    };

    mockTasks = [
      {
        id: '1',
        title: 'Newest Task',
        description: 'This is newest task',
        priority: 'high',
        status: 'TODO',
        project: 'Work',
        createdAt: new Date('2024-01-20T10:00:00'),
        updatedAt: new Date('2024-01-20T10:00:00')
      },
      {
        id: '2',
        title: 'Middle Task',
        priority: 'medium',
        status: 'IN_PROGRESS',
        project: 'Study',
        createdAt: new Date('2024-01-15T14:30:00'),
        updatedAt: new Date('2024-01-16T09:00:00')
      }
    ];

    taskServiceSpy.getTasksByStatusAndProject.mockReturnValue(mockTasks);
    taskServiceSpy.getTaskCounts.mockReturnValue({
      todo: 1,
      inProgress: 1,
      done: 0,
      total: 2
    });

    await TestBed.configureTestingModule({
      imports: [CommonModule, TaskListComponent],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct CSS class on host element', () => {
    const hostElement = fixture.nativeElement as HTMLElement;
    expect(hostElement.classList.contains('task-list')).toBe(true);
  });

  describe('Helper Methods', () => {
    it('should format dates correctly', () => {
      const testDate = new Date('2024-01-15T14:30:00');
      // Access private method through bracket notation for testing
      const formatted = (component as any).formatDate(testDate);
      expect(formatted).toMatch(/Jan 15, 2024/);
    });
  });

  describe('Template Rendering - Empty State', () => {
    beforeEach(() => {
      taskService.getTasksByStatusAndProject.mockReturnValue([]);
      component.forceRefresh();
      fixture.detectChanges();
    });

    it('should display empty state when no tasks', () => {
      const emptyElement = fixture.debugElement.query(By.css('.task-list__empty'));
      expect(emptyElement).toBeTruthy();
    });

    it('should show "No tasks" message', () => {
      const emptyTitle = fixture.debugElement.query(By.css('.task-list__empty-title'));
      expect(emptyTitle.nativeElement.textContent).toContain('No tasks');
    });

    it('should show create task button in empty state', () => {
      const createBtn = fixture.debugElement.query(By.css('.task-list__create-btn'));
      expect(createBtn).toBeTruthy();
      expect(createBtn.nativeElement.textContent.trim()).toBe('+ Create Task');
    });
  });

  describe('Template Rendering - With Tasks', () => {
    it('should render task titles correctly', () => {
      const taskTitles = fixture.debugElement.queryAll(By.css('.task-list__task-title'));
      expect(taskTitles[0].nativeElement.textContent).toBe('Newest Task');
      expect(taskTitles[1].nativeElement.textContent).toBe('Middle Task');
    });

    it('should render task descriptions when present', () => {
      const descriptions = fixture.debugElement.queryAll(By.css('.task-list__task-description'));
      expect(descriptions).toHaveLength(1); // Only one task has a description
      expect(descriptions[0].nativeElement.textContent).toBe('This is newest task');
    });

    it('should render priority badges with correct colors and labels', () => {
      const priorityBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--priority'));
      expect(priorityBadges).toHaveLength(2);

      expect(priorityBadges[0].nativeElement.textContent.trim()).toBe('high');
      expect(priorityBadges[0].nativeElement.style.backgroundColor).toBe('rgb(239, 68, 68)');
    });

    it('should render action buttons for each task', () => {
      const editButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--edit'));
      const deleteButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--delete'));
      
      expect(editButtons).toHaveLength(2);
      expect(deleteButtons).toHaveLength(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for screen readers', () => {
      const priorityBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--priority'));
      expect(priorityBadges[0].nativeElement.getAttribute('aria-label')).toBe('Priority: high');
      
      const statusBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--status'));
      expect(statusBadges[0].nativeElement.getAttribute('aria-label')).toBe('Status: To Do');
      
      const editButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--edit'));
      expect(editButtons[0].nativeElement.getAttribute('aria-label')).toBe('Edit task: Newest Task');
    });

    it('should have semantic HTML structure', () => {
      const taskArticles = fixture.debugElement.queryAll(By.css('.task-list__task'));
      expect(taskArticles[0].nativeElement.getAttribute('role')).toBe('article');
      
      const headers = fixture.debugElement.queryAll(By.css('.task-list__task-header'));
      expect(headers).toHaveLength(2);
    });
  });

  describe('User Interactions', () => {
    it('should handle create button click', () => {
      spyOn(component, 'onCreateTask');
      const createBtn = fixture.debugElement.query(By.css('.task-list__create-btn'));
      
      createBtn.triggerEventHandler('click', null);
      
      expect(component.onCreateTask).toHaveBeenCalled();
    });

    it('should handle edit button click', () => {
      spyOn(component, 'onTaskAction');
      const editButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--edit'));
      
      editButtons[0].triggerEventHandler('click', null);
      
      expect(component.onTaskAction).toHaveBeenCalledWith('1', 'edit');
    });

    it('should handle delete button click', () => {
      spyOn(component, 'onTaskAction');
      const deleteButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--delete'));
      
      deleteButtons[1].triggerEventHandler('click', null);
      
      expect(component.onTaskAction).toHaveBeenCalledWith('2', 'delete');
    });
  });
});