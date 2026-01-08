import { beforeEach, vi, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

// Mock DOM APIs before Angular test environment initialization
Object.defineProperty(Element.prototype, 'setAttribute', {
  value: vi.fn(),
  writable: true,
  configurable: true,
});

Object.defineProperty(Element.prototype, 'removeAttribute', {
  value: vi.fn(),
  writable: true,
  configurable: true,
});

// Also mock for Node elements (which might be what Angular is using)
Object.defineProperty(Node.prototype, 'setAttribute', {
  value: vi.fn(),
  writable: true,
  configurable: true,
});

Object.defineProperty(Node.prototype, 'removeAttribute', {
  value: vi.fn(),
  writable: true,
  configurable: true,
});

// Mock HTMLElement specifically
Object.defineProperty(HTMLElement.prototype, 'setAttribute', {
  value: vi.fn(),
  writable: true,
  configurable: true,
});

Object.defineProperty(HTMLElement.prototype, 'removeAttribute', {
  value: vi.fn(),
  writable: true,
  configurable: true,
});

// Initialize Angular test environment after DOM mocking
TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

// Resolve component resources for Angular 21+ with Vitest
beforeAll(async () => {
  try {
    const { ɵresolveComponentResources: resolveComponentResources } = await import('@angular/core');
    if (resolveComponentResources) {
      // Simple no-op resolver for tests
      await resolveComponentResources(() => Promise.resolve(''));
    }
  } catch {
    // Fallback if resolveComponentResources is not available
    return;
  }
});

// Mock DOM APIs that might not be available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
(globalThis as any).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
(globalThis as any).IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollTo
Element.prototype.scrollTo = vi.fn();
window.scrollTo = vi.fn();

// Mock getComputedStyle
(window as any).getComputedStyle = vi.fn().mockReturnValue({
  getPropertyValue: vi.fn().mockReturnValue(''),
  zIndex: '0',
});

// Mock console methods to avoid noise in tests
(globalThis as any).console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

// Mock additional DOM APIs that might be missing
Object.defineProperty(Element.prototype, 'setAttribute', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(Element.prototype, 'removeAttribute', {
  value: vi.fn(),
  writable: true,
});

// Mock document.createElement to return proper elements
const originalCreateElement = document.createElement;
document.createElement = vi.fn().mockImplementation((tagName: string) => {
  const element = originalCreateElement.call(document, tagName);
  // Ensure the element has setAttribute
  if (!element.setAttribute) {
    element.setAttribute = vi.fn();
  }
  if (!element.removeAttribute) {
    element.removeAttribute = vi.fn();
  }
  return element;
});

