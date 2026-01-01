# Angular 21 Signals Example with Vitest 4+

This folder contains a comprehensive example of how to work with Angular 21 signals using Vitest 4+ for testing.

## Files Overview

- `signal-counter.component.ts` - Main component demonstrating various signal patterns
- `signal-counter.component.spec.ts` - Comprehensive test suite using Vitest
- `README.md` - This documentation file

## Signal Patterns Demonstrated

### 1. Angular 21 Input/Output Functions

```typescript
// Input signals - receive data from parent components
initialCount = input<number>(0);
maxCount = input<number>(100);
stepSize = input<number>(1);
disabled = input<boolean>(false);
title = input<string>('Signal Counter');

// Output functions - emit events to parent components
countChanged = output<number>();
userSelected = output<User>();
maxCountReached = output<void>();
resetTriggered = output<void>();

// Using inputs in component logic
increment(): void {
  if (this.disabled()) return;
  
  const step = this.stepSize();
  const newCount = this.count() + step;
  const maxCount = this.maxCount();
  
  this.count.set(Math.min(newCount, maxCount));
}

// Emitting outputs in effects
effect(() => {
  const currentCount = this.count();
  this.countChanged.emit(currentCount);
  
  if (currentCount >= this.maxCount()) {
    this.maxCountReached.emit();
  }
});
```

### 2. Basic Signals

```typescript
// Creating a basic signal
count = signal(0);

// Reading signal value
const currentValue = this.count();

// Updating signal value
this.count.set(10);           // Set absolute value
this.count.update(value => value + 1);  // Update based on current value
```

### 2. Computed Signals

```typescript
// Creating computed signals
doubleCount = computed(() => this.count() * 2);
isEven = computed(() => this.count() % 2 === 0);
countStatus = computed(() => {
  const currentCount = this.count();
  if (currentCount === 0) return 'Zero';
  if (currentCount < 0) return 'Negative';
  if (currentCount < 10) return 'Small';
  if (currentCount < 100) return 'Medium';
  return 'Large';
});
```

### 3. Object Signals

```typescript
// Signal with object type
user = signal<User | null>(null);

// Updating object signal
this.user.set({
  id: 1,
  name: 'John Doe',
  email: 'john.doe@example.com'
});

// Updating object properties immutably
this.user.update(currentUser => {
  if (!currentUser) return currentUser;
  return {
    ...currentUser,
    name: 'Jane Smith'
  };
});
```

### 4. Array Signals

```typescript
// Signal with array type
items = signal<{ name: string; quantity: number }[]>([]);

// Adding items to array
this.items.update(currentItems => [...currentItems, newItem]);

// Removing items from array
this.items.update(currentItems => 
  currentItems.slice(0, -1)
);

// Clearing array
this.items.set([]);
```

### 5. Effects

```typescript
// Effect that runs when dependencies change
effect(() => {
  const currentCount = this.count();
  const timestamp = new Date().toLocaleTimeString();
  this.addLog(`[${timestamp}] Count changed to: ${currentCount}`);
});

// Effect for object changes
effect(() => {
  const currentUser = this.user();
  if (currentUser) {
    this.addLog(`User loaded: ${currentUser.name}`);
  }
});
```

## Testing Signals with Vitest 4+

### Test Setup

The test file uses Vitest 4+ with Angular 21. Key setup includes:

```typescript
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

describe('SignalCounterComponent', () => {
  let component: SignalCounterComponent;
  let fixture: ComponentFixture<SignalCounterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignalCounterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SignalCounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
});
```

### Testing Angular 21 Input/Output Functions

```typescript
describe('Angular 21 Input/Output', () => {
  it('should initialize with default input values', () => {
    expect(component.initialCount()).toBe(0);
    expect(component.maxCount()).toBe(100);
    expect(component.stepSize()).toBe(1);
    expect(component.disabled()).toBe(false);
    expect(component.title()).toBe('Signal Counter');
  });

  it('should emit outputs on count changes', () => {
    const countChangedSpy = vi.fn();
    component.countChanged.subscribe(countChangedSpy);
    
    component.increment();
    fixture.detectChanges(); // Trigger effects
    
    expect(countChangedSpy).toHaveBeenCalledWith(1);
  });

  it('should emit userSelected when user is loaded', () => {
    const userSelectedSpy = vi.fn();
    component.userSelected.subscribe(userSelectedSpy);
    
    component.loadUser();
    fixture.detectChanges(); // Trigger effects
    
    expect(userSelectedSpy).toHaveBeenCalledWith({
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com'
    });
  });

  it('should respect maxCount limit', () => {
    component.count.set(98);
    component.increment();
    expect(component.count()).toBe(99);
    
    component.increment();
    expect(component.count()).toBe(100);
    
    component.increment();
    expect(component.count()).toBe(100); // Should not exceed maxCount
  });
});
```

**Important Notes for Input/Output Testing:**
- Always call `fixture.detectChanges()` to trigger effects that emit outputs
- Input signals have default values that can be tested directly
- Output functions return `OutputEmitterRef` that can be subscribed to
- Input signals are read-only and cannot be directly set in tests

### Testing Basic Signals

```typescript
it('should increment count', () => {
  component.increment();
  expect(component.count()).toBe(1);
});

it('should handle negative numbers', () => {
  component.decrement();
  expect(component.count()).toBe(-1);
});
```

### Testing Computed Signals

```typescript
it('should calculate double count correctly', () => {
  component.increment();
  expect(component.doubleCount()).toBe(2);
});

it('should determine if count is even', () => {
  component.reset();
  expect(component.isEven()).toBe(true);
  
  component.increment();
  expect(component.isEven()).toBe(false);
});
```

### Testing Object Signals

```typescript
it('should load user', () => {
  component.loadUser();
  expect(component.user()).toEqual(testUser);
});

it('should update user name', () => {
  component.loadUser();
  component.updateUserName();
  
  const updatedUser = component.user();
  expect(updatedUser?.name).toBe('Jane Smith');
});
```

### Testing Array Signals

```typescript
it('should add items', () => {
  component.addItem();
  expect(component.items()).toHaveLength(1);
  expect(component.items()[0].name).toBe('Item 1');
});

it('should calculate total items correctly', () => {
  const originalMathRandom = Math.random;
  Math.random = () => 0.5; // Mock for predictable testing
  
  component.addItem();
  expect(component.totalItems()).toBe(6);
  
  Math.random = originalMathRandom; // Restore
});
```

### Testing Effects

```typescript
describe('Effects and Logging', () => {
  beforeEach(() => {
    component.clearLogs(); // Clear logs before each test
  });

  it('should log count changes', () => {
    component.clearLogs();
    expect(component.effectLogs()).toHaveLength(0);
    
    component.increment();
    fixture.detectChanges(); // Trigger change detection for effects
    
    expect(component.effectLogs().length).toBeGreaterThan(0);
    
    const logs = component.effectLogs();
    expect(logs.some(log => log.includes('Count changed to: 1'))).toBe(true);
  });

  it('should log user loading', () => {
    component.clearLogs();
    component.loadUser();
    fixture.detectChanges(); // Trigger change detection for effects
    
    const logs = component.effectLogs();
    expect(logs.some(log => log.includes('User loaded: John Doe'))).toBe(true);
  });
});
```

**Important Notes for Effect Testing:**
- Always call `fixture.detectChanges()` after signal changes to trigger effects
- Effects need Angular's change detection cycle to run in test environment
- Clear logs in `beforeEach` to ensure test isolation

### Testing Template Rendering

```typescript
it('should render initial template correctly', () => {
  const compiled = fixture.nativeElement;
  
  expect(compiled.querySelector('h2').textContent).toContain('Angular 21 Signals Demo');
  expect(compiled.querySelector('.basic-signal p').textContent).toContain('Count: 0');
  
  // Use querySelectorAll for multiple elements and array indexing
  const basicSignalPs = compiled.querySelectorAll('.basic-signal p');
  expect(basicSignalPs[1].textContent).toContain('Double Count: 0');
});

it('should update template when count changes', () => {
  component.increment();
  fixture.detectChanges(); // Always trigger change detection after signal updates
  
  const compiled = fixture.nativeElement;
  expect(compiled.querySelector('.basic-signal p').textContent).toContain('Count: 1');
  
  const basicSignalPs = compiled.querySelectorAll('.basic-signal p');
  expect(basicSignalPs[1].textContent).toContain('Double Count: 2');
});
```

**Important Notes for Template Testing:**
- Always call `fixture.detectChanges()` after signal changes to update the template
- Use `querySelectorAll()` when multiple similar elements exist
- Array indexing is more reliable than `:nth-child()` selectors

### Testing Button Interactions

```typescript
it('should call increment when increment button clicked', () => {
  vi.spyOn(component, 'increment');
  
  const compiled = fixture.nativeElement;
  const incrementButton = compiled.querySelector('button'); // First button
  
  incrementButton.click();
  expect(component.increment).toHaveBeenCalled();
});

it('should call decrement when decrement button clicked', () => {
  vi.spyOn(component, 'decrement');
  
  const compiled = fixture.nativeElement;
  const buttons = compiled.querySelectorAll('button');
  const decrementButton = buttons[1]; // Second button
  
  decrementButton.click();
  expect(component.decrement).toHaveBeenCalled();
});

it('should call loadUser when load user button clicked', () => {
  vi.spyOn(component, 'loadUser');
  
  const compiled = fixture.nativeElement;
  const buttons = compiled.querySelectorAll('button');
  const loadUserButton = buttons[3]; // Fourth button
  
  loadUserButton.click();
  expect(component.loadUser).toHaveBeenCalled();
});
```

**Important Notes for Button Testing:**
- Use `vi.spyOn()` instead of jasmine spyOn with Vitest
- Use array indexing with `querySelectorAll()` for reliable button selection
- Button order depends on template structure

## Key Concepts

### Signal Reactivity

- Signals are reactive containers for values
- When a signal's value changes, all dependent computed signals and effects automatically update
- Signals provide better performance than traditional Angular change detection

### Immutability

- Always update signals immutably
- Use `update()` for transformations based on current value
- Use `set()` for absolute value changes

### Computed Signals

- Derived values that automatically update when dependencies change
- Lazy evaluation - only recalculate when dependencies change
- Read-only by design

### Effects

- Side effects that run when signal dependencies change
- Useful for logging, API calls, or DOM manipulation
- Clean up automatically when component is destroyed

## Best Practices

1. **Use signals for component state** - Replace component properties with signals
2. **Prefer computed signals** for derived values
3. **Keep effects simple** - Use for side effects, not state management
4. **Test signal behavior** - Verify both signal values and template updates
5. **Mock randomness** in tests for predictable results
6. **Use vi.spyOn** instead of jasmine spyOn with Vitest
7. **Always call fixture.detectChanges()** after signal changes in tests
8. **Use querySelectorAll()** for multiple similar DOM elements
9. **Clear test data** in beforeEach to ensure test isolation
10. **Test edge cases** including negative values and empty states

## Common Testing Pitfalls & Solutions

### Effects Not Running
**Problem:** Effects don't execute after signal changes
**Solution:** Always call `fixture.detectChanges()` after signal updates

### DOM Selectors Not Working
**Problem:** `:nth-child()` selectors are unreliable
**Solution:** Use `querySelectorAll()` with array indexing

### Test Isolation Issues
**Problem:** Tests affecting each other's state
**Solution:** Clear shared state in `beforeEach` hooks

### Button Selection Issues
**Problem:** Complex CSS selectors fail to find buttons
**Solution:** Use simple selectors with array indexing

## Running the Tests

```bash
# Run all tests
npm test

# Run specific test file with Vitest
npx vitest run src/signals-example/signal-counter.component.spec.ts

# Run tests in watch mode
npx vitest watch src/signals-example/signal-counter.component.spec.ts

# Run tests with coverage
npx vitest run --coverage src/signals-example/signal-counter.component.spec.ts
```

**Test Results:**
- ✅ 48 tests passing (increased from 40)
- ✅ Full coverage of signal patterns including Angular 21 input/output
- ✅ Template rendering tests
- ✅ Effect logging tests
- ✅ Button interaction tests
- ✅ Edge case handling
- ✅ Input/output function tests

## Integration with Angular

The component follows Angular 21+ best practices:

- Standalone components (no NgModules needed)
- Signals for reactive state management
- OnPush change detection strategy
- Modern control flow (@if, @for) in templates
- Proper TypeScript typing throughout

This example provides a solid foundation for working with signals in Angular 21 applications using Vitest for testing. All tests are passing and demonstrate comprehensive signal patterns with proper test coverage.

## Summary

- **48 comprehensive tests** covering all signal patterns
- **Angular 21 input/output functions** with modern component communication
- **Real-world examples** of basic, computed, object, and array signals
- **Effect testing** with proper change detection handling
- **Template rendering** tests with robust DOM selection
- **Button interaction** tests using Vitest spying
- **Edge case handling** for production-ready scenarios
- **Best practices** and common pitfalls documentation
- **Modern Angular patterns** including standalone components and signals

The example now demonstrates the complete Angular 21 signal ecosystem including the new `input()` and `output()` functions, making it a comprehensive reference for modern Angular development.
