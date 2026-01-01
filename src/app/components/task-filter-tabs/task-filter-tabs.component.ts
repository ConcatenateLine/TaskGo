import { Component, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../shared/services/task.service';

@Component({
  selector: 'app-task-filter-tabs',
  standalone: true,
  imports: [CommonModule],
  template: '',
  styles: ''
})
export class TaskFilterTabsComponent {
  private taskService = inject(TaskService);

  currentFilter = signal<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('all');
  filterChange = output<'all' | 'TODO' | 'IN_PROGRESS' | 'DONE'>();
}
