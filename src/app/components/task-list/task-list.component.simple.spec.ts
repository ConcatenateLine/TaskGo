import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { TaskListComponent } from './task-list.component';

describe('Simple TaskListComponent Test', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, TaskListComponent],
      providers: []
    }).compileComponents();
  });

  it('should create component', () => {
    const fixture = TestBed.createComponent(TaskListComponent);
    expect(fixture).toBeTruthy();
    expect(fixture.componentInstance).toBeTruthy();
  });
});