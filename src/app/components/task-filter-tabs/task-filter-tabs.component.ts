import { Component, signal, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../shared/services/task.service';

@Component({
  selector: 'app-task-filter-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="task-filter-tabs" role="tablist">
      <button 
        class="task-filter-tabs__tab" 
        [class.task-filter-tabs__tab--active]="isActive('all')"
        role="tab" 
        [attr.aria-label]="getAriaLabel('all')"
        [attr.aria-selected]="isActive('all')"
        [attr.tabindex]="isActive('all') ? 0 : -1"
        (click)="onFilterClick('all')" 
        type="button">
        <span class="task-filter-tabs__label">All</span>
        <span class="task-filter-tabs__count" aria-hidden="true">{{ getCount('all') }}</span>
      </button>
      <button 
        class="task-filter-tabs__tab" 
        [class.task-filter-tabs__tab--active]="isActive('TODO')"
        role="tab" 
        [attr.aria-label]="getAriaLabel('TODO')"
        [attr.aria-selected]="isActive('TODO')"
        [attr.tabindex]="isActive('TODO') ? 0 : -1"
        (click)="onFilterClick('TODO')" 
        type="button">
        <span class="task-filter-tabs__label">To Do</span>
        <span class="task-filter-tabs__count" aria-hidden="true">{{ getCount('TODO') }}</span>
      </button>
      <button 
        class="task-filter-tabs__tab" 
        [class.task-filter-tabs__tab--active]="isActive('IN_PROGRESS')"
        role="tab" 
        [attr.aria-label]="getAriaLabel('IN_PROGRESS')"
        [attr.aria-selected]="isActive('IN_PROGRESS')"
        [attr.tabindex]="isActive('IN_PROGRESS') ? 0 : -1"
        (click)="onFilterClick('IN_PROGRESS')" 
        type="button">
        <span class="task-filter-tabs__label">In Progress</span>
        <span class="task-filter-tabs__count" aria-hidden="true">{{ getCount('IN_PROGRESS') }}</span>
      </button>
      <button 
        class="task-filter-tabs__tab" 
        [class.task-filter-tabs__tab--active]="isActive('DONE')"
        role="tab" 
        [attr.aria-label]="getAriaLabel('DONE')"
        [attr.aria-selected]="isActive('DONE')"
        [attr.tabindex]="isActive('DONE') ? 0 : -1"
        (click)="onFilterClick('DONE')" 
        type="button">
        <span class="task-filter-tabs__label">Completed</span>
        <span class="task-filter-tabs__count" aria-hidden="true">{{ getCount('DONE') }}</span>
      </button>
    </div>
  `,
  styles: [`
    .task-filter-tabs {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e5e7eb;
      background-color: #ffffff;
    }
    
    .task-filter-tabs__tab {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem 0.5rem 0 0;
      background-color: #f9fafb;
      color: #6b7280;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      border-bottom: none;
      min-width: 120px;
      justify-content: center;

      &:hover {
        background-color: #f3f4f6;
        color: #374151;
        border-color: #9ca3af;
      }

      &:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      &.task-filter-tabs__tab--active {
        background-color: #ffffff;
        color: #111827;
        border-color: #d1d5db;
        border-bottom-color: #ffffff;
        position: relative;
        margin-bottom: -1px;
        z-index: 1;
      }

      &[aria-selected="true"] {
        background-color: #ffffff;
        color: #111827;
      }

      &[aria-selected="false"] {
        background-color: #f9fafb;
        color: #6b7280;
      }
    }

    .task-filter-tabs__label {
      font-weight: 500;
      white-space: nowrap;
    }

    .task-filter-tabs__count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.5rem;
      height: 1.5rem;
      padding: 0 0.375rem;
      background-color: #e5e7eb;
      color: #374151;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 9999px;
      line-height: 1;
    }

    .task-filter-tabs__tab--active .task-filter-tabs__count {
      background-color: #3b82f6;
      color: #ffffff;
    }

    /* Accessibility improvements */
    @media (prefers-reduced-motion: reduce) {
      .task-filter-tabs__tab {
        transition: none;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .task-filter-tabs {
        border-bottom-color: ButtonText;
      }

      .task-filter-tabs__tab {
        border-color: ButtonText;
      }

      .task-filter-tabs__tab--active {
        border-bottom-color: Background;
      }
    }
  `]
})
export class TaskFilterTabsComponent {
  private taskService = inject(TaskService);

  currentFilter = signal<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('all');
  filterChange = output<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>();

  readonly filterTabs = [
    { key: 'all' as const, label: 'All', ariaLabel: 'Filter tasks: All' },
    { key: 'TODO' as const, label: 'To Do', ariaLabel: 'Filter tasks: To Do' },
    { key: 'IN_PROGRESS' as const, label: 'In Progress', ariaLabel: 'Filter tasks: In Progress' },
    { key: 'DONE' as const, label: 'Completed', ariaLabel: 'Filter tasks: Completed' },
  ];

  readonly taskCounts = computed(() => {
    return this.taskService.getTaskCounts();
  });

  onFilterClick(filter: 'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'): void {
    this.currentFilter.set(filter);
    this.filterChange.emit(filter);
  }

  isActive(filter: 'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'): boolean {
    return this.currentFilter() === filter;
  }

  getActiveClass(filter: 'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'): string {
    return this.isActive(filter) ? 'task-filter-tabs__tab--active' : '';
  }

  getCount(filter: 'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'): number {
    const counts = this.taskCounts();
    switch (filter) {
      case 'all':
        return counts.total;
      case 'TODO':
        return counts.todo;
      case 'IN_PROGRESS':
        return counts.inProgress;
      case 'DONE':
        return counts.done;
      default:
        return 0;
    }
  }

  getAriaLabel(filter: 'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'): string {
    const count = this.getCount(filter);
    const tab = this.filterTabs.find(tab => tab.key === filter);
    return `${tab?.ariaLabel || filter} (${count} tasks)`;
  }
}
