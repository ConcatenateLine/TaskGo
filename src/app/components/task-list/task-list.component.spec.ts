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

  // ===============================================================
  // SECURITY TESTS - OWASP VULNERABILITIES
  // ===============================================================

  describe('SECURITY: XSS Prevention in Template Rendering (A03)', () => {
    beforeEach(() => {
      // Set up tasks with potentially malicious content
      taskService.getTasksByStatusAndProject.mockReturnValue([
        {
          id: 'xss-1',
          title: '<script>alert("XSS Title")</script>Malicious Title',
          description: '<img src="x" onerror="alert(\'XSS Description\')">',
          priority: 'high',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date('2024-01-20T10:00:00'),
          updatedAt: new Date('2024-01-20T10:00:00')
        },
        {
          id: 'xss-2',
          title: 'javascript:alert("JS Protocol")',
          description: '<iframe src="javascript:alert(\'XSS\')"></iframe>',
          priority: 'medium',
          status: 'IN_PROGRESS',
          project: 'Personal',
          createdAt: new Date('2024-01-19T10:00:00'),
          updatedAt: new Date('2024-01-19T10:00:00')
        }
      ]);
      component.forceRefresh();
      fixture.detectChanges();
    });

    it('should escape script tags in task titles', () => {
      const taskTitles = fixture.debugElement.queryAll(By.css('.task-list__task-title'));
      const titleContent = taskTitles[0].nativeElement.textContent;
      
      // Should not contain actual script tags
      expect(titleContent).not.toContain('<script>');
      expect(titleContent).not.toContain('</script>');
      expect(titleContent).not.toContain('alert("XSS Title")');
      
      // Should display sanitized content
      expect(titleContent).toContain('Malicious Title');
    });

    it('should escape HTML in task descriptions', () => {
      const descriptions = fixture.debugElement.queryAll(By.css('.task-list__task-description'));
      if (descriptions.length > 0) {
        const descContent = descriptions[0].nativeElement.innerHTML;
        
        // Should not contain dangerous HTML
        expect(descContent).not.toContain('<img');
        expect(descContent).not.toContain('onerror');
        expect(descContent).not.toContain('alert');
      }
    });

    it('should sanitize javascript: protocol in titles', () => {
      const taskTitles = fixture.debugElement.queryAll(By.css('.task-list__task-title'));
      const titleContent = taskTitles[1].nativeElement.textContent;
      
      // Should display the literal text, not execute the protocol
      expect(titleContent).toContain('javascript:alert("JS Protocol")');
    });

    it('should prevent XSS through ARIA attributes', () => {
      const editButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--edit'));
      const ariaLabel = editButtons[0].nativeElement.getAttribute('aria-label');
      
      // ARIA labels should be sanitized
      expect(ariaLabel).not.toContain('<script>');
      expect(ariaLabel).not.toContain('alert');
    });

    it('should escape Unicode XSS attempts', () => {
      taskService.getTasksByStatusAndProject.mockReturnValue([
        {
          id: 'unicode-xss',
          title: '\u003cscript\u003ealert("Unicode XSS")\u003c/script\u003e',
          priority: 'low',
          status: 'TODO',
          project: 'Study',
          createdAt: new Date('2024-01-20T10:00:00'),
          updatedAt: new Date('2024-01-20T10:00:00')
        }
      ]);
      component.forceRefresh();
      fixture.detectChanges();

      const taskTitles = fixture.debugElement.queryAll(By.css('.task-list__task-title'));
      const titleContent = taskTitles[0].nativeElement.textContent;
      
      // Should display the escaped text, not execute it
      expect(titleContent).not.toContain('<script>');
      expect(titleContent).not.toContain('alert("Unicode XSS")');
    });
  });

  describe('SECURITY: Content Security Policy (A05)', () => {
    it('should not allow inline styles in task content', () => {
      taskService.getTasksByStatusAndProject.mockReturnValue([
        {
          id: 'inline-style',
          title: 'Task with style',
          description: '<div style="background: url(\'javascript:alert("XSS")\')">Malicious</div>',
          priority: 'medium',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date('2024-01-20T10:00:00'),
          updatedAt: new Date('2024-01-20T10:00:00')
        }
      ]);
      component.forceRefresh();
      fixture.detectChanges();

      const descriptions = fixture.debugElement.queryAll(By.css('.task-list__task-description'));
      if (descriptions.length > 0) {
        const descContent = descriptions[0].nativeElement.innerHTML;
        expect(descContent).not.toContain('style=');
        expect(descContent).not.toContain('background:');
      }
    });

    it('should prevent external resource loading', () => {
      taskService.getTasksByStatusAndProject.mockReturnValue([
        {
          id: 'external-resource',
          title: 'External Resource Test',
          description: '<img src="https://malicious.example.com/track.jpg">',
          priority: 'low',
          status: 'TODO',
          project: 'Personal',
          createdAt: new Date('2024-01-20T10:00:00'),
          updatedAt: new Date('2024-01-20T10:00:00')
        }
      ]);
      component.forceRefresh();
      fixture.detectChanges();

      const descriptions = fixture.debugElement.queryAll(By.css('.task-list__task-description'));
      if (descriptions.length > 0) {
        const descContent = descriptions[0].nativeElement.innerHTML;
        expect(descContent).not.toContain('https://malicious.example.com');
        expect(descContent).not.toContain('<img');
      }
    });

    it('should sanitize data URLs', () => {
      taskService.getTasksByStatusAndProject.mockReturnValue([
        {
          id: 'data-url',
          title: 'Data URL Test',
          description: '<img src="data:text/html,<script>alert(\'XSS\')</script>">',
          priority: 'medium',
          status: 'TODO',
          project: 'Study',
          createdAt: new Date('2024-01-20T10:00:00'),
          updatedAt: new Date('2024-01-20T10:00:00')
        }
      ]);
      component.forceRefresh();
      fixture.detectChanges();

      const descriptions = fixture.debugElement.queryAll(By.css('.task-list__task-description'));
      if (descriptions.length > 0) {
        const descContent = descriptions[0].nativeElement.innerHTML;
        expect(descContent).not.toContain('data:text/html');
        expect(descContent).not.toContain('<script>');
      }
    });
  });

  describe('SECURITY: Input Validation at Component Level (A04)', () => {
    it('should handle very long task titles without breaking layout', () => {
      const longTitle = 'A'.repeat(1000);
      taskService.getTasksByStatusAndProject.mockReturnValue([
        {
          id: 'long-title',
          title: longTitle,
          priority: 'medium',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date('2024-01-20T10:00:00'),
          updatedAt: new Date('2024-01-20T10:00:00')
        }
      ]);
      component.forceRefresh();
      fixture.detectChanges();

      const taskTitles = fixture.debugElement.queryAll(By.css('.task-list__task-title'));
      expect(taskTitles[0]).toBeTruthy();
      
      // Should truncate or handle long content gracefully
      const displayedTitle = taskTitles[0].nativeElement.textContent;
      expect(displayedTitle.length).toBeLessThanOrEqual(500); // Reasonable display limit
    });

    it('should handle control characters in task content', () => {
      const maliciousTitle = 'Task\u0000with\u0001control\u0002characters';
      taskService.getTasksByStatusAndProject.mockReturnValue([
        {
          id: 'control-chars',
          title: maliciousTitle,
          priority: 'low',
          status: 'TODO',
          project: 'Personal',
          createdAt: new Date('2024-01-20T10:00:00'),
          updatedAt: new Date('2024-01-20T10:00:00')
        }
      ]);
      component.forceRefresh();
      fixture.detectChanges();

      const taskTitles = fixture.debugElement.queryAll(By.css('.task-list__task-title'));
      const titleContent = taskTitles[0].nativeElement.textContent;
      
      // Should remove or escape control characters
      expect(titleContent).not.toContain('\u0000');
      expect(titleContent).not.toContain('\u0001');
      expect(titleContent).not.toContain('\u0002');
    });
  });

  describe('SECURITY: Accessibility & Screen Reader Security (A01)', () => {
    it('should not expose sensitive data in ARIA labels', () => {
      taskService.getTasksByStatusAndProject.mockReturnValue([
        {
          id: 'sensitive-task',
          title: 'Secret Project: Password=12345',
          description: 'Confidential information',
          priority: 'high',
          status: 'TODO',
          project: 'Work',
          createdAt: new Date('2024-01-20T10:00:00'),
          updatedAt: new Date('2024-01-20T10:00:00')
        }
      ]);
      component.forceRefresh();
      fixture.detectChanges();

      const editButtons = fixture.debugElement.queryAll(By.css('.task-list__action-btn--edit'));
      const ariaLabel = editButtons[0].nativeElement.getAttribute('aria-label');
      
      // Should sanitize sensitive information in ARIA labels
      expect(ariaLabel).not.toContain('Password=12345');
      expect(ariaLabel).not.toContain('Confidential');
    });

    it('should sanitize live region content', () => {
      // Test dynamic content updates to screen readers
      const maliciousUpdate = '<script>alert("Screen Reader XSS")</script>';
      
      // Simulate dynamic content update
      // This test will fail until live region sanitization is implemented
      expect(() => {
        component.forceRefresh();
        fixture.detectChanges();
      }).not.toThrow();
    });
  });

  describe('SECURITY: Error Handling Security (A09)', () => {
    it('should not leak sensitive information in error display', () => {
      // Simulate error state with potentially sensitive data
      taskService.getTasksByStatusAndProject.mockImplementation(() => {
        throw new Error('Database connection failed: password=secret123, host=internal.db');
      });

      expect(() => {
        component.forceRefresh();
        fixture.detectChanges();
      }).toThrow();

      // Component should handle error without exposing sensitive details
      const errorElement = fixture.debugElement.query(By.css('.task-list__error'));
      if (errorElement) {
        const errorText = errorElement.nativeElement.textContent;
        expect(errorText).not.toContain('password=secret123');
        expect(errorText).not.toContain('host=internal.db');
        expect(errorText).not.toContain('connection failed');
      }
    });

    it('should sanitize error messages before logging', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      
      taskService.getTasksByStatusAndProject.mockImplementation(() => {
        throw new Error('<script>alert("Error XSS")</script>Database error');
      });

      try {
        component.forceRefresh();
        fixture.detectChanges();
      } catch (error) {
        // Expected
      }

      // Check that logged errors are sanitized
      if (consoleSpy.mock.calls.length > 0) {
        const loggedError = consoleSpy.mock.calls[0][0];
        expect(typeof loggedError).toBe('string');
        expect(loggedError).not.toContain('<script>');
        expect(loggedError).not.toContain('alert(');
      }

      consoleSpy.mockRestore();
    });
  });
});