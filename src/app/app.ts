import { Component, signal, OnInit } from '@angular/core';
import { TaskListComponent } from './components/task-list/task-list.component';
import { TaskService } from './shared/services/task.service';

@Component({
  selector: 'app-root',
  imports: [TaskListComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('TaskGo');

  constructor(private taskService: TaskService) {}

  ngOnInit() {
    // Initialize with mock data for US-001
    this.taskService.initializeMockData();
  }
}
