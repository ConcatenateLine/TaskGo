# TaskGo - Agent Development Guidelines

## Asana Integration

project: TaskGo Kanban board

## Commands

### Build & Development
- `npm run build` - Build the application for production
- `npm run start` - Start development server
- `npm run watch` - Build and watch for changes (development mode)

### Testing
- `npm test` - Run all unit tests (uses Vitest)
- `npm test -- <file>` - Run single test file

## Code Style Guidelines

### Angular Specific
- Use standalone components (Angular 21+)
- Prefer `@if/@for/@switch` control flow over structural directives
- Use signals for reactive state management
- SCSS for styles with single quotes in Prettier config
- Component prefix: `app-`

### TypeScript
- Strict TypeScript config enabled
- Single quotes for strings
- 2-space indentation (EditorConfig)
- Import helpers enabled
- No implicit returns or property access

### Code Organization
- Follow Angular folder structure (src/app/)
- Separate concerns in different files (component, template, styles)
- Use dependency injection for services
- Implement proper error handling with try-catch blocks

### Testing
- Use Vitest for unit tests
- Test components, services, and pipes
- Mock dependencies appropriately
- Write tests alongside source files (*.spec.ts)

## Angular specific best practices

### TypeScript Best Practices
- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain
### Angular Best Practices
- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.
### Accessibility Requirements
- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.
### Components
- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.
### State Management
- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead
### Templates
- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).
### Services
- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
