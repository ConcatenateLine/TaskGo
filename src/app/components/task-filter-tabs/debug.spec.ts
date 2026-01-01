import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { TaskFilterTabsComponent } from './task-filter-tabs.component';
import { TaskService } from '../../shared/services/task.service';

describe('TaskFilterTabsComponent Debug', () => {
  let component: TaskFilterTabsComponent;
  let fixture: ComponentFixture<TaskFilterTabsComponent>;
  let taskService: any;

  beforeEach(async () => {
    const taskServiceSpy = {
      getTaskCounts: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, TaskFilterTabsComponent],
      providers: [{ provide: TaskService, useValue: taskServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskFilterTabsComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);

    taskService.getTaskCounts.mockReturnValue({
      todo: 2,
      inProgress: 1,
      done: 3,
      total: 6,
    });

    fixture.detectChanges();
  });

  it('should render basic structure', () => {
    console.log('Debug - fixture:', fixture);
    console.log('Debug - component:', component);
    console.log('Debug - fixture.nativeElement:', fixture.nativeElement);
    console.log('Debug - innerHTML:', fixture.nativeElement.innerHTML);
    
    const testDiv = document.createElement('div');
    testDiv.innerHTML = '<button class="test">Test</button>';
    console.log('Debug - test div HTML:', testDiv.innerHTML);
    console.log('Debug - test div children:', testDiv.children.length);
    
    // Check if Angular rendered anything at all
    expect(fixture.nativeElement).toBeTruthy();
  });
});