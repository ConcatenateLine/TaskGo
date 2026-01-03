import { Component, signal, computed, inject, ChangeDetectionStrategy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../shared/services/task.service';
import { TaskProject } from '../../shared/models/task.model';

interface ProjectOption {
  value: TaskProject | 'all';
  label: string;
  count: number;
}

@Component({
  selector: 'app-task-project-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <select 
      class="task-project-filter__select"
      [value]="selectedValue()"
      (change)="onProjectChange($event)"
      [attr.aria-label]="ariaLabel()"
      tabindex="0">
      @for (option of projectOptions(); track option.value) {
        <option 
          [value]="option.value"
          [selected]="selectedValue() === option.value">
          {{ option.label }} ({{ option.count }})
        </option>
      }
    </select>
  `,
  styleUrl: './task-project-filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'task-project-filter',
  },
})
export class TaskProjectFilterComponent {
  private taskService = inject(TaskService);

  readonly filterChange = output<TaskProject | 'all'>();
  
  // Internal signal for managing filter state
  readonly currentProjectFilter = signal<TaskProject | 'all'>('all');

  readonly projectCounts = computed(() => {
    try {
      return this.taskService.getTaskCountsByProject() || {
        all: 0,
        Personal: 0,
        Work: 0,
        Study: 0,
        General: 0,
      };
    } catch (error) {
      console.warn('Error getting task counts:', error);
      return {
        all: 0,
        Personal: 0,
        Work: 0,
        Study: 0,
        General: 0,
      };
    }
  });

  readonly projectOptions = computed(() => {
    const counts = this.projectCounts();
    return [
      { value: 'all' as const, label: 'All projects', count: counts.all },
      { value: 'Personal' as const, label: 'Personal', count: counts.Personal },
      { value: 'Work' as const, label: 'Work', count: counts.Work },
      { value: 'Study' as const, label: 'Study', count: counts.Study },
      { value: 'General' as const, label: 'General', count: counts.General },
    ];
  });

  protected readonly selectedValue = computed(() => this.currentProjectFilter());

  protected readonly ariaLabel = computed(() => {
    const selectedOption = this.projectOptions().find(opt => opt.value === this.selectedValue());
    return `Filter tasks by project: ${selectedOption?.label || 'All projects'} (${selectedOption?.count || 0})`;
  });

  onProjectChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newProject = select.value as TaskProject | 'all';
    this.currentProjectFilter.set(newProject);
    this.filterChange.emit(newProject);
  }
}