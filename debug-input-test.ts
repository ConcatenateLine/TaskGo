// Quick test to verify setInput works
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { TaskInlineEditComponent } from './src/app/components/task-inline-edit/task-inline-edit.component';
import { TaskService } from './src/app/shared/services/task.service';

describe('Debug setInput', () => {
  it('should work with TaskInlineEdit', () => {
    const taskServiceSpy = {
      updateTask: vi.fn(),
      getTasks: vi.fn()
    };

    const mockTask = {
      id: 'test-123',
      title: 'Test Task',
      description: 'Test Description',
      priority: 'medium' as any,
      status: 'TODO' as any,
      project: 'Work' as any,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    TestBed.configureTestingModule({
      imports: [CommonModule, TaskInlineEditComponent],
      providers: [{ provide: TaskService, useValue: taskServiceSpy }],
    });

    const fixture = TestBed.createComponent(TaskInlineEditComponent);
    console.log('Before setInput:', fixture.componentInstance.task());
    
    fixture.componentRef.setInput("task", mockTask);
    fixture.detectChanges();
    
    console.log('After setInput:', fixture.componentInstance.task());
    
    expect(fixture.componentInstance.task()).toEqual(mockTask);
  });
});