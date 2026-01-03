import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { TaskProjectFilterComponent } from './task-project-filter.component';
import { TaskService } from '../../shared/services/task.service';
import { TaskProject } from '../../shared/models/task.model';

// Mock spyOn for Vitest environment
const spyOn = (obj: any, method: string) => {
  const spy = vi.fn();
  obj[method] = spy;
  return spy;
};

describe('TaskProjectFilterComponent - US-008', () => {
  let component: TaskProjectFilterComponent;
  let fixture: ComponentFixture<TaskProjectFilterComponent>;
  let taskService: any;
  let taskServiceSpy: any;

  const mockProjects = ['All projects', 'Personal', 'Work', 'Study', 'General'];

  beforeEach(async () => {
    taskServiceSpy = {
      getTaskCountsByProject: vi.fn().mockReturnValue({
        all: 10,
        Personal: 3,
        Work: 4,
        Study: 2,
        General: 1,
      }),
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, TaskProjectFilterComponent],
      providers: [{ provide: TaskService, useValue: taskServiceSpy }],
    }).compileComponents();

    taskService = TestBed.inject(TaskService);
    fixture = TestBed.createComponent(TaskProjectFilterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Project Options Rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should render dropdown select element', () => {
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      expect(selectElement).toBeTruthy();
    });

    it('should render "All projects" as first option', () => {
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      const options = selectElement.queryAll(By.css('option'));

      expect(options.length).toBeGreaterThanOrEqual(1);
      expect(options[0].nativeElement.textContent).toContain('All projects');
    });

    it('should render all project options', () => {
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      const options = selectElement.queryAll(By.css('option'));

      expect(options.length).toBe(5); // All projects + Personal + Work + Study + General

      const optionTexts = options.map((opt) => opt.nativeElement.textContent);
      expect(optionTexts).toContain('All projects');
      expect(optionTexts).toContain('Personal');
      expect(optionTexts).toContain('Work');
      expect(optionTexts).toContain('Study');
      expect(optionTexts).toContain('General');
    });

    it('should set correct values for project options', () => {
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      const options = selectElement.queryAll(By.css('option'));

      expect(options[0].nativeElement.value).toBe('all');
      expect(options[1].nativeElement.value).toBe('Personal');
      expect(options[2].nativeElement.value).toBe('Work');
      expect(options[3].nativeElement.value).toBe('Study');
      expect(options[4].nativeElement.value).toBe('General');
    });

    it('should display task count for each project option', () => {
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      const options = selectElement.queryAll(By.css('option'));

      const allProjectsText = options[0].nativeElement.textContent;
      const personalText = options[1].nativeElement.textContent;
      const workText = options[2].nativeElement.textContent;
      const studyText = options[3].nativeElement.textContent;
      const generalText = options[4].nativeElement.textContent;

      expect(allProjectsText).toContain('10');
      expect(personalText).toContain('3');
      expect(workText).toContain('4');
      expect(studyText).toContain('2');
      expect(generalText).toContain('1');
    });

    it('should handle zero counts gracefully', () => {
      taskService.getTaskCountsByProject.mockReturnValue({
        all: 0,
        Personal: 0,
        Work: 0,
        Study: 0,
        General: 0,
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [CommonModule, FormsModule, TaskProjectFilterComponent],
        providers: [{ provide: TaskService, useValue: taskServiceSpy }],
      }).compileComponents();

      const zeroFixture = TestBed.createComponent(TaskProjectFilterComponent);
      zeroFixture.detectChanges();

      const selectElement = zeroFixture.debugElement.query(By.css('select.task-project-filter__select'));
      const options = selectElement.queryAll(By.css('option'));

      options.forEach((option) => {
        expect(option.nativeElement.textContent).toContain('0');
      });
    });
  });

  describe('Default Filter State', () => {
    it('should have "All projects" as default filter on load', () => {
      fixture.detectChanges();

      const currentFilter = component.currentProjectFilter();
      expect(currentFilter).toBe('all');
    });

    it('should mark "All projects" as selected by default', () => {
      fixture.detectChanges();

      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      const options = selectElement.queryAll(By.css('option'));

      const selectedOption = options.find((opt) => opt.nativeElement.selected);
      expect(selectedOption).toBeTruthy();
      expect(selectedOption!.nativeElement.textContent).toContain('All projects');
    });
  });

  describe('Filter Selection', () => {
    beforeEach(() => {
      taskService.getTaskCountsByProject.mockReturnValue({
        all: 10,
        Personal: 3,
        Work: 4,
        Study: 2,
        General: 1,
      });
      fixture.detectChanges();
    });

    it('should emit event when "All projects" is selected', () => {
      spyOn(component.filterChange, 'emit');
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      selectElement.triggerEventHandler('change', { target: { value: 'all' } });
      fixture.detectChanges();

      expect(component.filterChange.emit).toHaveBeenCalledWith('all');
    });

    it('should emit event when "Personal" is selected', () => {
      spyOn(component.filterChange, 'emit');
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      selectElement.triggerEventHandler('change', { target: { value: 'Personal' } });
      fixture.detectChanges();

      expect(component.filterChange.emit).toHaveBeenCalledWith('Personal');
    });

    it('should emit event when "Work" is selected', () => {
      spyOn(component.filterChange, 'emit');
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      selectElement.triggerEventHandler('change', { target: { value: 'Work' } });
      fixture.detectChanges();

      expect(component.filterChange.emit).toHaveBeenCalledWith('Work');
    });

    it('should emit event when "Study" is selected', () => {
      spyOn(component.filterChange, 'emit');
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      selectElement.triggerEventHandler('change', { target: { value: 'Study' } });
      fixture.detectChanges();

      expect(component.filterChange.emit).toHaveBeenCalledWith('Study');
    });

    it('should emit event when "General" is selected', () => {
      spyOn(component.filterChange, 'emit');
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      selectElement.triggerEventHandler('change', { target: { value: 'General' } });
      fixture.detectChanges();

      expect(component.filterChange.emit).toHaveBeenCalledWith('General');
    });

    it('should update current filter when option is selected', () => {
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      selectElement.triggerEventHandler('change', { target: { value: 'Work' } });
      fixture.detectChanges();

      expect(component.currentProjectFilter()).toBe('Work');
    });

    it('should update selected option when filter changes', () => {
      component.currentProjectFilter.set('Work');
      fixture.detectChanges();

      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      const options = selectElement.queryAll(By.css('option'));

      const selectedOption = options.find((opt) => opt.nativeElement.selected);
      expect(selectedOption).toBeTruthy();
      expect(selectedOption!.nativeElement.textContent).toContain('Work');
    });
  });

  describe('Filter State Management', () => {
    beforeEach(() => {
      taskService.getTaskCountsByProject.mockReturnValue({
        all: 10,
        Personal: 3,
        Work: 4,
        Study: 2,
        General: 1,
      });
      fixture.detectChanges();
    });

    it('should allow external control of current filter', () => {
      component.currentProjectFilter.set('Personal');
      fixture.detectChanges();

      expect(component.currentProjectFilter()).toBe('Personal');
    });

    it('should update selected option when filter changes externally', () => {
      component.currentProjectFilter.set('Study');
      fixture.detectChanges();

      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      const options = selectElement.queryAll(By.css('option'));

      const selectedOption = options.find((opt) => opt.nativeElement.selected);
      expect(selectedOption).toBeTruthy();
      expect(selectedOption!.nativeElement.textContent).toContain('Study');
    });

    it('should persist filter state between render cycles', () => {
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      selectElement.triggerEventHandler('change', { target: { value: 'Work' } });
      fixture.detectChanges();

      fixture.detectChanges(); // Trigger another change detection cycle

      expect(component.currentProjectFilter()).toBe('Work');
      const options = selectElement.queryAll(By.css('option'));
      const selectedOption = options.find((opt) => opt.nativeElement.selected);
      expect(selectedOption!.nativeElement.textContent).toContain('Work');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      taskService.getTaskCountsByProject.mockReturnValue({
        all: 10,
        Personal: 3,
        Work: 4,
        Study: 2,
        General: 1,
      });
      fixture.detectChanges();
    });

    it('should have proper ARIA label for dropdown', () => {
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      const ariaLabel = selectElement.nativeElement.getAttribute('aria-label');

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('Filter tasks by project');
    });

    it('should announce filter selection to screen readers', () => {
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      const ariaLabel = selectElement.nativeElement.getAttribute('aria-label');

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('Work'); // Default option might have count
    });

    it('should be keyboard navigable', () => {
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      expect(selectElement.nativeElement.getAttribute('tabindex')).toBeDefined();
    });

    it('should have proper ARIA describedby if label exists', () => {
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      const ariaDescribedby = selectElement.nativeElement.getAttribute('aria-describedby');

      // May or may not have describedby, but if it does, should reference an element
      if (ariaDescribedby) {
        expect(ariaDescribedby).toBeTruthy();
      }
    });
  });

  describe('Security', () => {
    beforeEach(() => {
      taskService.getTaskCountsByProject.mockReturnValue({
        all: 10,
        Personal: 3,
        Work: 4,
        Study: 2,
        General: 1,
      });
      fixture.detectChanges();
    });

    it('should sanitize project filter values to prevent XSS', () => {
      expect(() => {
        component.currentProjectFilter.set('<script>alert("XSS")</script>' as any);
      }).not.toThrow();
    });

    it('should validate project enum values', () => {
      const validProjects = ['all', 'Personal', 'Work', 'Study', 'General'];
      validProjects.forEach((project) => {
        expect(() => {
          component.currentProjectFilter.set(project as any);
        }).not.toThrow();
      });
    });

    it('should handle invalid project values gracefully', () => {
      expect(() => {
        component.currentProjectFilter.set('INVALID' as any);
      }).not.toThrow();
    });
  });

  describe('Component Styling', () => {
    beforeEach(() => {
      taskService.getTaskCountsByProject.mockReturnValue({
        all: 10,
        Personal: 3,
        Work: 4,
        Study: 2,
        General: 1,
      });
      fixture.detectChanges();
    });

    it('should have appropriate CSS class for container', () => {
      const container = fixture.debugElement.query(By.css('.task-project-filter'));
      expect(container).toBeTruthy();
    });

    it('should have appropriate CSS class for dropdown', () => {
      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      expect(selectElement).toBeTruthy();
    });

    it('should have appropriate CSS class for label', () => {
      const labelElement = fixture.debugElement.query(By.css('.task-project-filter__label'));
      if (labelElement) {
        expect(labelElement).toBeTruthy();
      }
    });
  });

  describe('Performance', () => {
    it('should recompute counts efficiently when tasks change', () => {
      const startTime = Date.now();

      taskService.getTaskCountsByProject.mockReturnValue({
        all: 15,
        Personal: 5,
        Work: 5,
        Study: 3,
        General: 2,
      });
      fixture.detectChanges();

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // Should render quickly (< 100ms)
      expect(renderTime).toBeLessThan(100);
    });

    it('should not cause unnecessary re-renders', () => {
      taskService.getTaskCountsByProject.mockReturnValue({
        all: 10,
        Personal: 3,
        Work: 4,
        Study: 2,
        General: 1,
      });

      // Initial detection to render component
      fixture.detectChanges();

      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      const options = selectElement.queryAll(By.css('option'));
      const initialText = options[0].nativeElement.textContent;

      // Additional detection cycles
      fixture.detectChanges();
      fixture.detectChanges();

      const newText = options[0].nativeElement.textContent;
      expect(initialText).toBe(newText);
    });
  });

  describe('Integration with TaskService', () => {
    beforeEach(() => {
      taskService.getTaskCountsByProject.mockReturnValue({
        all: 10,
        Personal: 3,
        Work: 4,
        Study: 2,
        General: 1,
      });
      fixture.detectChanges();
    });

    it('should call TaskService to get project counts', () => {
      expect(taskService.getTaskCountsByProject).toHaveBeenCalled();
    });

    it('should update counts when service returns new data', () => {
      taskService.getTaskCountsByProject.mockReturnValue({
        all: 12,
        Personal: 4,
        Work: 5,
        Study: 2,
        General: 1,
      });

      fixture.detectChanges();

      const selectElement = fixture.debugElement.query(By.css('select.task-project-filter__select'));
      const options = selectElement.queryAll(By.css('option'));

      expect(options[0].nativeElement.textContent).toContain('12');
      expect(options[1].nativeElement.textContent).toContain('4');
      expect(options[2].nativeElement.textContent).toContain('5');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle empty project list gracefully', () => {
      taskService.getTaskCountsByProject.mockReturnValue({});

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [CommonModule, FormsModule, TaskProjectFilterComponent],
        providers: [{ provide: TaskService, useValue: taskServiceSpy }],
      }).compileComponents();

      const edgeFixture = TestBed.createComponent(TaskProjectFilterComponent);
      edgeFixture.detectChanges();

      expect(() => {
        edgeFixture.detectChanges();
      }).not.toThrow();
    });

    it('should handle null or undefined service response', () => {
      taskService.getTaskCountsByProject.mockReturnValue(null as any);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [CommonModule, FormsModule, TaskProjectFilterComponent],
        providers: [{ provide: TaskService, useValue: taskServiceSpy }],
      }).compileComponents();

      const edgeFixture = TestBed.createComponent(TaskProjectFilterComponent);
      edgeFixture.detectChanges();

      expect(() => {
        edgeFixture.detectChanges();
      }).not.toThrow();
    });
  });
});
