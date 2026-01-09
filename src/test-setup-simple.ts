import { beforeEach, vi, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { CommonModule } from '@angular/common';

// Simple DOM setup for Angular tests
beforeEach(() => {
  const rootElement = document.createElement('div');
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
});

// Initialize Angular test environment
beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  
  TestBed.configureTestingModule({
    imports: [CommonModule, BrowserTestingModule],
    providers: []
  }).compileComponents();
});