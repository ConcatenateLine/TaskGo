import { beforeEach, vi, beforeAll, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

// Initialize Angular test environment once
beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
});

// Clean up DOM after each test
afterEach(() => {
  // Clean up any elements created during tests
  document.body.innerHTML = '';
  // Clear any root elements that might interfere with next test
  const existingRoots = document.querySelectorAll('[id^="root"]');
  existingRoots.forEach(el => el.remove());
});

// Set up DOM before each test
beforeEach(() => {
  // Create multiple potential root elements that Angular might look for
  for (let i = 0; i <= 10; i++) {
    const rootElement = document.createElement('div');
    rootElement.id = `root${i}`;
    rootElement.setAttribute('data-testid', `test-root-${i}`);
    document.body.appendChild(rootElement);
  }
  
  // Also create a generic root element
  const genericRoot = document.createElement('div');
  genericRoot.id = 'root';
  document.body.appendChild(genericRoot);
  
  // Create angular app root as well
  const angularRoot = document.createElement('app-root');
  document.body.appendChild(angularRoot);
});

// Mock getBoundingClientRect for positioning tests
Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
  value: vi.fn(() => ({
    top: 0,
    left: 0,
    bottom: 100,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: 0,
    toJSON: vi.fn()
  })),
  writable: true,
  configurable: true,
});

// Mock window.getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: vi.fn(() => ({
    getPropertyValue: vi.fn(() => ''),
    setProperty: vi.fn(),
    removeProperty: vi.fn()
  })),
  writable: true,
  configurable: true,
});