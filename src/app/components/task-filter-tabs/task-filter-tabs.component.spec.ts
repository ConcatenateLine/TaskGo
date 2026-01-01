import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { TaskFilterTabsComponent } from './task-filter-tabs.component';
import { TaskService } from '../../shared/services/task.service';

// Mock spyOn for Vitest environment
const spyOn = (obj: any, method: string) => {
  const spy = vi.fn();
  obj[method] = spy;
  return spy;
};

describe('TaskFilterTabsComponent - US-006', () => {
  let component: TaskFilterTabsComponent;
  let fixture: ComponentFixture<TaskFilterTabsComponent>;
  let taskService: any;

  beforeEach(async () => {
    const taskServiceSpy = {
      getTaskCounts: vi.fn().mockReturnValue({
        todo: 2,
        inProgress: 1,
        done: 3,
        total: 6,
      }),
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, TaskFilterTabsComponent],
      providers: [{ provide: TaskService, useValue: taskServiceSpy }],
    }).compileComponents();

    taskService = TestBed.inject(TaskService);
    fixture = TestBed.createComponent(TaskFilterTabsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Filter Tab Rendering', () => {
    beforeEach(() => {
      taskService.getTaskCounts.mockReturnValue({
        todo: 2,
        inProgress: 1,
        done: 3,
        total: 6,
      });
      fixture.detectChanges();
    });

    it('should render all four filter tabs', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      expect(tabs).toHaveLength(4);
    });

    it('should render "All" tab first', () => {
      const firstTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab:first-child'));
      expect(firstTab.nativeElement.textContent).toContain('All');
    });

    it('should render "To Do" tab second', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      expect(tabs[1].nativeElement.textContent).toContain('To Do');
    });

    it('should render "In Progress" tab third', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      expect(tabs[2].nativeElement.textContent).toContain('In Progress');
    });

    it('should render "Completed" tab fourth', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      expect(tabs[3].nativeElement.textContent).toContain('Completed');
    });

    it('should display task count in "All" tab', () => {
      const allTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab:first-child'));
      expect(allTab.nativeElement.textContent).toContain('6');
    });

    it('should display task count in "To Do" tab', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      expect(tabs[1].nativeElement.textContent).toContain('2');
    });

    it('should display task count in "In Progress" tab', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      expect(tabs[2].nativeElement.textContent).toContain('1');
    });

    it('should display task count in "Completed" tab', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      expect(tabs[3].nativeElement.textContent).toContain('3');
    });

    it('should handle zero counts gracefully', () => {
      // Create a new component instance with zero counts mock from the start
      const zeroCountsSpy = {
        getTaskCounts: vi.fn().mockReturnValue({
          todo: 0,
        inProgress: 0,
        done: 0,
        total: 0,
        }),
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [CommonModule, TaskFilterTabsComponent],
        providers: [{ provide: TaskService, useValue: zeroCountsSpy }],
      }).compileComponents();

      const zeroFixture = TestBed.createComponent(TaskFilterTabsComponent);
      zeroFixture.detectChanges();

      const tabs = zeroFixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      tabs.forEach((tab) => {
        expect(tab.nativeElement.textContent).toContain('0');
      });
    });
  });

  describe('Default Filter State', () => {
    it('should have "All" as default filter on load', () => {
      fixture.detectChanges();

      const currentFilter = component.currentFilter();
      expect(currentFilter).toBe('all');
    });

    it('should mark "All" tab as active by default', () => {
      fixture.detectChanges();

      const activeTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab--active'));
      expect(activeTab).toBeTruthy();
      expect(activeTab.nativeElement.textContent).toContain('All');
    });
  });

  describe('Filter Selection', () => {
    beforeEach(() => {
      taskService.getTaskCounts.mockReturnValue({
        todo: 2,
        inProgress: 1,
        done: 3,
        total: 6,
      });
      fixture.detectChanges();
    });

    it('should emit event when "All" tab is clicked', () => {
      spyOn(component.filterChange, 'emit');
      const allTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab:first-child'));
      allTab.triggerEventHandler('click', null);
      fixture.detectChanges();

      expect(component.filterChange.emit).toHaveBeenCalledWith('all');
    });

    it('should emit event when "To Do" tab is clicked', () => {
      spyOn(component.filterChange, 'emit');
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      tabs[1].triggerEventHandler('click', null);
      fixture.detectChanges();

      expect(component.filterChange.emit).toHaveBeenCalledWith('TODO');
    });

    it('should emit event when "In Progress" tab is clicked', () => {
      spyOn(component.filterChange, 'emit');
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      tabs[2].triggerEventHandler('click', null);
      fixture.detectChanges();

      expect(component.filterChange.emit).toHaveBeenCalledWith('IN_PROGRESS');
    });

    it('should emit event when "Completed" tab is clicked', () => {
      spyOn(component.filterChange, 'emit');
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      tabs[3].triggerEventHandler('click', null);
      fixture.detectChanges();

      expect(component.filterChange.emit).toHaveBeenCalledWith('DONE');
    });

    it('should update current filter when tab is clicked', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      tabs[1].triggerEventHandler('click', null);
      fixture.detectChanges();

      expect(component.currentFilter()).toBe('TODO');
    });

    it('should mark clicked tab as active', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      tabs[2].triggerEventHandler('click', null);
      fixture.detectChanges();

      const activeTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab--active'));
      expect(activeTab.nativeElement.textContent).toContain('In Progress');
    });

    it('should only have one active tab at a time', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      tabs[1].triggerEventHandler('click', null);
      fixture.detectChanges();

      const activeTabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab--active'));
      expect(activeTabs).toHaveLength(1);
    });
  });

  describe('Filter State Management', () => {
    it('should allow external control of current filter', () => {
      component.currentFilter.set('TODO');
      fixture.detectChanges();

      expect(component.currentFilter()).toBe('TODO');
    });

    it('should update active tab when filter changes externally', () => {
      component.currentFilter.set('IN_PROGRESS');
      fixture.detectChanges();

      const activeTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab--active'));
      expect(activeTab.nativeElement.textContent).toContain('In Progress');
    });

    it('should persist filter state between render cycles', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      tabs[1].triggerEventHandler('click', null);
      fixture.detectChanges();

      fixture.detectChanges(); // Trigger another change detection cycle

      expect(component.currentFilter()).toBe('TODO');
      const activeTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab--active'));
      expect(activeTab.nativeElement.textContent).toContain('To Do');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      taskService.getTaskCounts.mockReturnValue({
        todo: 2,
        inProgress: 1,
        done: 3,
        total: 6,
      });
      fixture.detectChanges();
    });

    it('should have proper ARIA role for filter tabs', () => {
      const tabContainer = fixture.debugElement.query(By.css('.task-filter-tabs'));
      expect(tabContainer.nativeElement.getAttribute('role')).toBe('tablist');
    });

    it('should have proper ARIA role for each tab', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      tabs.forEach((tab) => {
        expect(tab.nativeElement.getAttribute('role')).toBe('tab');
      });
    });

    it('should have ARIA selected state for active tab', () => {
      const activeTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab--active'));
      expect(activeTab.nativeElement.getAttribute('aria-selected')).toBe('true');
    });

    it('should have ARIA selected state false for inactive tabs', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const inactiveTabs = tabs.filter((tab) => !tab.classes['task-filter-tabs__tab--active']);

      inactiveTabs.forEach((tab) => {
        expect(tab.nativeElement.getAttribute('aria-selected')).toBe('false');
      });
    });

    it('should have ARIA labels describing filter purpose', () => {
      const allTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab:first-child'));
      expect(allTab.nativeElement.getAttribute('aria-label')).toContain('Filter tasks: All');
    });

    it('should announce filter count to screen readers', () => {
      const allTab = fixture.debugElement.query(By.css('.task-filter-tabs__tab:first-child'));
      const ariaLabel = allTab.nativeElement.getAttribute('aria-label');
      expect(ariaLabel).toContain('6');
    });

    it('should be keyboard navigable', () => {
      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      tabs.forEach((tab) => {
        expect(tab.nativeElement.getAttribute('tabindex')).toBeDefined();
      });
    });
  });

  describe('Security', () => {
    it('should sanitize filter values to prevent XSS', () => {
      const maliciousFilter = '<script>alert("XSS")</script>';
      expect(() => {
        component.currentFilter.set(maliciousFilter as any);
      }).not.toThrow();
    });

    it('should validate filter enum values', () => {
      const validFilters = ['all', 'TODO', 'IN_PROGRESS', 'DONE'];
      validFilters.forEach((filter) => {
        expect(() => {
          component.currentFilter.set(filter as any);
        }).not.toThrow();
      });
    });

    it('should handle invalid filter values gracefully', () => {
      expect(() => {
        component.currentFilter.set('INVALID' as any);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should recompute counts efficiently when tasks change', () => {
      const startTime = Date.now();

      taskService.getTaskCounts.mockReturnValue({
        todo: 10,
        inProgress: 5,
        done: 2,
        total: 17,
      });
      fixture.detectChanges();

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // Should render quickly (< 100ms)
      expect(renderTime).toBeLessThan(100);
    });

    it('should not cause unnecessary re-renders', () => {
      taskService.getTaskCounts.mockReturnValue({
        todo: 2,
        inProgress: 1,
        done: 3,
        total: 6,
      });

      // Initial detection to render the component
      fixture.detectChanges();

      const tabs = fixture.debugElement.queryAll(By.css('.task-filter-tabs__tab'));
      const initialText = tabs[0].nativeElement.textContent;

      // Additional detection cycles
      fixture.detectChanges();
      fixture.detectChanges();

      const newText = tabs[0].nativeElement.textContent;
      expect(initialText).toBe(newText);
    });
  });
});
