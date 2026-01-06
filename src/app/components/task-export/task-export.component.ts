import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskExportService, TaskExportResult } from '../../shared/services/task-export.service';

@Component({
  selector: 'app-task-export',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="task-export">
      <button 
        (click)="exportTasks()" 
        class="btn btn-primary"
        [disabled]="isLoading()"
        [attr.aria-label]="isLoading() ? 'Exporting tasks...' : 'Export tasks'"
        [attr.aria-busy]="isLoading()"
      >
        @if (isLoading()) {
          Exporting...
        } @else {
          Export tasks
        }
      </button>

      @if (hasError()) {
        <div class="export-error" role="alert" aria-live="assertive">
          Export failed: {{ errorMessage() }}
        </div>
      }

        @if (hasExportResult()) {
          <div class="export-success" role="status" aria-live="polite">
            Export successful! Downloaded {{ exportResult()?.data?.metadata?.taskCount || 0 }} tasks.
          </div>
        }
    </div>
  `,
  styleUrls: ['./task-export.component.scss'],
  host: {
    class: 'task-export',
  },
})
export class TaskExportComponent {
  private taskExportService = inject(TaskExportService);

  // Signals for reactive state
  readonly isExporting = signal(false);
  readonly exportResult = signal<TaskExportResult | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Computed properties
  readonly isLoading = computed(() => this.isExporting());
  readonly hasExportResult = computed(() => this.exportResult() !== null);
  readonly hasError = computed(() => this.errorMessage() !== null);

  /**
   * Export tasks and handle the result
   */
  async exportTasks(): Promise<void> {
    if (this.isExporting()) {
      return; // Prevent multiple concurrent exports
    }

    // Clear previous state
    this.errorMessage.set(null);
    this.exportResult.set(null);
    this.isExporting.set(true);

    try {
      const result = await this.taskExportService.exportTasks();
      
      this.exportResult.set(result);

      if (!result.success) {
        this.errorMessage.set(result.error?.message || 'Export failed');
      }

    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      this.isExporting.set(false);
    }
  }
}