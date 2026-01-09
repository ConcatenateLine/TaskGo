import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';
import { TaskListComponent } from './task-list.component';
import { TaskService } from '../../shared/services/task.service';
import { ValidationService } from '../../shared/services/validation.service';
import { AuthService } from '../../shared/services/auth.service';
import { SecurityService } from '../../shared/services/security.service';
import { Task, PROJECT_COLORS } from '../../shared/models/task.model';
import { TaskInlineEditComponent } from '../task-inline-edit/task-inline-edit.component';
import { TaskStatusComponent } from '../task-status/task-status.component';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';

describe('TaskListComponent - US-007: Project Badge Display', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let taskService: any;
  let mockTasks: Task[];

  beforeEach(async () => {
    mockTasks = [
      {
        id: '1',
        title: 'Work Task',
        description: 'This is a work task',
        priority: 'high',
        status: 'TODO',
        project: 'Work',
        createdAt: new Date('2024-01-20T10:00:00'),
        updatedAt: new Date('2024-01-20T10:00:00')
      },
      {
        id: '2',
        title: 'Personal Task',
        description: 'This is a personal task',
        priority: 'medium',
        status: 'IN_PROGRESS',
        project: 'Personal',
        createdAt: new Date('2024-01-19T14:30:00'),
        updatedAt: new Date('2024-01-16T09:00:00')
      },
      {
        id: '3',
        title: 'Study Task',
        description: 'This is a study task',
        priority: 'low',
        status: 'DONE',
        project: 'Study',
        createdAt: new Date('2024-01-18T09:00:00'),
        updatedAt: new Date('2024-01-17T11:00:00')
      },
      {
        id: '4',
        title: 'General Task',
        priority: 'medium',
        status: 'TODO',
        project: 'General',
        createdAt: new Date('2024-01-17T10:00:00'),
        updatedAt: new Date('2024-01-17T10:00:00')
      }
    ];

    const taskServiceSpy = {
      loadFromEncryptedStorage: vi.fn().mockResolvedValue(undefined),
      getTasksByStatusAndProject: vi.fn().mockReturnValue(mockTasks),
      getTaskCounts: vi.fn().mockReturnValue({
        todo: 2,
        inProgress: 1,
        done: 1,
        total: 4
      }),
      initializeMockData: vi.fn(),
      getTask: vi.fn(),
      changeStatus: vi.fn(),
      deleteTask: vi.fn().mockReturnValue(true),
      getStatusTransitions: vi.fn().mockImplementation((status: any) => {
        if (status === 'TODO') return ['IN_PROGRESS'];
        if (status === 'IN_PROGRESS') return ['TODO', 'DONE'];
        if (status === 'DONE') return ['IN_PROGRESS'];
        return [];
      }),
      syncEncryptedStorage: vi.fn().mockResolvedValue(undefined),
    };

    const validationServiceSpy = {
      sanitizeForDisplay: vi.fn().mockImplementation((input: string) => input),
    };

    const authServiceSpy = {
      logSecurityEvent: vi.fn(),
      getUserContext: vi.fn().mockReturnValue({ userId: 'test-user' }),
      requireAuthentication: vi.fn(),
    };

    const securityServiceSpy = {
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
    };

    const domSanitizerSpy = {
      sanitize: vi.fn().mockImplementation((context: any, value: string) => value),
    };

    // Mock ngDevMode to avoid undefined reference errors
    if (typeof window !== 'undefined') {
      (window as any).ngDevMode = true;
    }

    await TestBed.configureTestingModule({
      imports: [
        CommonModule, 
        TaskListComponent,
        TaskInlineEditComponent,
        TaskStatusComponent,
        FocusTrapDirective
      ],
      providers: [
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: ValidationService, useValue: validationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SecurityService, useValue: securityServiceSpy },
        { provide: DomSanitizer, useValue: domSanitizerSpy },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);
    fixture.detectChanges();
  });

  describe('Project Badge Rendering', () => {
    it('should render project badge for each task', () => {
      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));

      expect(projectBadges).toHaveLength(4);
    });

    it('should display correct project name in badge', () => {
      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));

      expect(projectBadges[0].nativeElement.textContent.trim()).toBe('Work');
      expect(projectBadges[1].nativeElement.textContent.trim()).toBe('Personal');
      expect(projectBadges[2].nativeElement.textContent.trim()).toBe('Study');
      expect(projectBadges[3].nativeElement.textContent.trim()).toBe('General');
    });

    it('should render project badges in task cards', () => {
      const taskCards = fixture.debugElement.queryAll(By.css('.task-list__task'));
      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));

      expect(taskCards).toHaveLength(4);
      expect(projectBadges).toHaveLength(4);
    });

    it('should apply correct CSS class for Personal project', () => {
      const projectBadge = fixture.debugElement.query(By.css('.task-list__badge--project-personal'));

      expect(projectBadge).toBeTruthy();
      expect(projectBadge!.nativeElement.textContent.trim()).toBe('Personal');
    });

    it('should apply correct CSS class for Work project', () => {
      const projectBadge = fixture.debugElement.query(By.css('.task-list__badge--project-work'));

      expect(projectBadge).toBeTruthy();
      expect(projectBadge!.nativeElement.textContent.trim()).toBe('Work');
    });

    it('should apply correct CSS class for Study project', () => {
      const projectBadge = fixture.debugElement.query(By.css('.task-list__badge--project-study'));

      expect(projectBadge).toBeTruthy();
      expect(projectBadge!.nativeElement.textContent.trim()).toBe('Study');
    });

    it('should apply correct CSS class for General project', () => {
      const projectBadge = fixture.debugElement.query(By.css('.task-list__badge--project-general'));

      expect(projectBadge).toBeTruthy();
      expect(projectBadge!.nativeElement.textContent.trim()).toBe('General');
    });
  });

  describe('Project Badge Colors', () => {
    it('should apply correct color for Personal project (blue)', () => {
      const projectBadge = fixture.debugElement.query(By.css('.task-list__badge--project-personal'));
      const badgeElement = projectBadge!.nativeElement as HTMLElement;

      const computedStyle = window.getComputedStyle(badgeElement);
      const backgroundColor = computedStyle.backgroundColor;

      expect(backgroundColor).toBe('rgb(59, 130, 246)');
    });

    it('should apply correct color for Work project (purple)', () => {
      const projectBadge = fixture.debugElement.query(By.css('.task-list__badge--project-work'));
      const badgeElement = projectBadge!.nativeElement as HTMLElement;

      const computedStyle = window.getComputedStyle(badgeElement);
      const backgroundColor = computedStyle.backgroundColor;

      expect(backgroundColor).toBe('rgb(139, 92, 246)');
    });

    it('should apply correct color for Study project (amber)', () => {
      const projectBadge = fixture.debugElement.query(By.css('.task-list__badge--project-study'));
      const badgeElement = projectBadge!.nativeElement as HTMLElement;

      const computedStyle = window.getComputedStyle(badgeElement);
      const backgroundColor = computedStyle.backgroundColor;

      expect(backgroundColor).toBe('rgb(245, 158, 11)');
    });

    it('should apply correct color for General project (gray)', () => {
      const projectBadge = fixture.debugElement.query(By.css('.task-list__badge--project-general'));
      const badgeElement = projectBadge!.nativeElement as HTMLElement;

      const computedStyle = window.getComputedStyle(badgeElement);
      const backgroundColor = computedStyle.backgroundColor;

      expect(backgroundColor).toBe('rgb(107, 114, 128)');
    });

    it('should use distinctive colors for each project type', () => {
      const personalBadge = fixture.debugElement.query(By.css('.task-list__badge--project-personal'))!.nativeElement as HTMLElement;
      const workBadge = fixture.debugElement.query(By.css('.task-list__badge--project-work'))!.nativeElement as HTMLElement;
      const studyBadge = fixture.debugElement.query(By.css('.task-list__badge--project-study'))!.nativeElement as HTMLElement;
      const generalBadge = fixture.debugElement.query(By.css('.task-list__badge--project-general'))!.nativeElement as HTMLElement;

      const personalColor = window.getComputedStyle(personalBadge).backgroundColor;
      const workColor = window.getComputedStyle(workBadge).backgroundColor;
      const studyColor = window.getComputedStyle(studyBadge).backgroundColor;
      const generalColor = window.getComputedStyle(generalBadge).backgroundColor;

      expect(personalColor).not.toBe(workColor);
      expect(workColor).not.toBe(studyColor);
      expect(studyColor).not.toBe(generalColor);
      expect(generalColor).not.toBe(personalColor);
    });
  });

  describe('getProjectBadgeClasses Method', () => {
    it('should return correct CSS classes for Personal project', () => {
      const classes = component.getProjectBadgeClasses('Personal');
      expect(classes).toBe('task-list__badge task-list__badge--project task-list__badge--project-personal');
    });

    it('should return correct CSS classes for Work project', () => {
      const classes = component.getProjectBadgeClasses('Work');
      expect(classes).toBe('task-list__badge task-list__badge--project task-list__badge--project-work');
    });

    it('should return correct CSS classes for Study project', () => {
      const classes = component.getProjectBadgeClasses('Study');
      expect(classes).toBe('task-list__badge task-list__badge--project task-list__badge--project-study');
    });

    it('should return correct CSS classes for General project', () => {
      const classes = component.getProjectBadgeClasses('General');
      expect(classes).toBe('task-list__badge task-list__badge--project task-list__badge--project-general');
    });
  });

  describe('Accessibility - Project Badges', () => {
    it('should have proper ARIA labels for project badges', () => {
      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));

      expect(projectBadges[0].nativeElement.getAttribute('aria-label')).toBe('Project: Work');
      expect(projectBadges[1].nativeElement.getAttribute('aria-label')).toBe('Project: Personal');
      expect(projectBadges[2].nativeElement.getAttribute('aria-label')).toBe('Project: Study');
      expect(projectBadges[3].nativeElement.getAttribute('aria-label')).toBe('Project: General');
    });

    it('should have proper ARIA role for project badges', () => {
      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));

      projectBadges.forEach(badge => {
        expect(badge.nativeElement.getAttribute('role')).toBe('badge');
      });
    });

    it('should provide sufficient color contrast for accessibility', () => {
      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));

      projectBadges.forEach(badge => {
        const badgeElement = badge.nativeElement as HTMLElement;
        const computedStyle = window.getComputedStyle(badgeElement);
        const backgroundColor = computedStyle.backgroundColor;
        const color = computedStyle.color;

        expect(backgroundColor).not.toBe('transparent');
        expect(color).toBeTruthy();
      });
    });
  });

  describe('Project Badge Positioning', () => {
    it('should display project badge in task header', () => {
      const taskHeaders = fixture.debugElement.queryAll(By.css('.task-list__task-header'));
      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));

      expect(taskHeaders).toHaveLength(4);
      expect(projectBadges).toHaveLength(4);
    });

    it('should position project badge consistently across tasks', () => {
      const taskCards = fixture.debugElement.queryAll(By.css('.task-list__task'));

      taskCards.forEach(card => {
        const projectBadge = card.query(By.css('.task-list__badge--project'));
        expect(projectBadge).toBeTruthy();
      });
    });
  });

  describe('Visual Design', () => {
    it('should use rounded corners for project badges', () => {
      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));

      projectBadges.forEach(badge => {
        const badgeElement = badge.nativeElement as HTMLElement;
        const computedStyle = window.getComputedStyle(badgeElement);
        const borderRadius = computedStyle.borderRadius;

        expect(borderRadius).not.toBe('0px');
        expect(borderRadius).not.toBe('none');
      });
    });

    it('should use appropriate padding for project badges', () => {
      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));

      projectBadges.forEach(badge => {
        const badgeElement = badge.nativeElement as HTMLElement;
        const computedStyle = window.getComputedStyle(badgeElement);
        const padding = computedStyle.padding;

        expect(padding).not.toBe('0px');
        expect(padding).not.toBe('none');
      });
    });

    it('should use appropriate font size for project badges', () => {
      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));

      projectBadges.forEach(badge => {
        const badgeElement = badge.nativeElement as HTMLElement;
        const computedStyle = window.getComputedStyle(badgeElement);
        const fontSize = computedStyle.fontSize;

        expect(fontSize).toBeTruthy();
        expect(parseFloat(fontSize)).toBeGreaterThan(0);
      });
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      taskService.getTasksByStatusAndProject.mockReturnValue([]);
      component.forceRefresh();
      fixture.detectChanges();
    });

    it('should not render project badges when no tasks', () => {
      const projectBadges = fixture.debugElement.queryAll(By.css('.task-list__badge--project'));

      expect(projectBadges).toHaveLength(0);
    });
  });

  describe('Integration with Other Badges', () => {
    it('should display project badge alongside priority badge', () => {
      const taskCards = fixture.debugElement.queryAll(By.css('.task-list__task'));

      taskCards.forEach(card => {
        const projectBadge = card.query(By.css('.task-list__badge--project'));
        const priorityBadge = card.query(By.css('.task-list__badge--priority'));

        expect(projectBadge).toBeTruthy();
        expect(priorityBadge).toBeTruthy();
      });
    });

    it('should maintain distinct visual appearance between project and priority badges', () => {
      const taskCard = fixture.debugElement.query(By.css('.task-list__task'));
      const projectBadge = taskCard.query(By.css('.task-list__badge--project'))!.nativeElement as HTMLElement;
      const priorityBadge = taskCard.query(By.css('.task-list__badge--priority'))!.nativeElement as HTMLElement;

      const projectColor = window.getComputedStyle(projectBadge).backgroundColor;
      const priorityColor = window.getComputedStyle(priorityBadge).backgroundColor;

      expect(projectColor).not.toBe(priorityColor);
    });
  });
});
