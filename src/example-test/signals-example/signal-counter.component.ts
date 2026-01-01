import { Component, signal, computed, effect, inject, input, output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface User {
  id: number;
  name: string;
  email: string;
}

@Component({
  selector: 'app-signal-counter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="signal-demo">
      <h2>{{ title() }} - Angular 21 Signals Demo</h2>

      <!-- Input/Output Example -->
      <section class="input-output">
        <h3>Angular 21 Input/Output</h3>
        <p>Initial Count: {{ initialCount() }}</p>
        <p>Max Count: {{ maxCount() }}</p>
        <p>Step Size: {{ stepSize() }}</p>
        <p>Disabled: {{ disabled() ? 'Yes' : 'No' }}</p>
        <p>Current Title: {{ title() }}</p>
      </section>

      <!-- Basic Signal Example -->
      <section class="basic-signal">
        <h3>Basic Signal</h3>
        <p>Count: {{ count() }}</p>
        <p>Double Count: {{ doubleCount() }}</p>
        <button (click)="increment()" [disabled]="disabled()">Increment</button>
        <button (click)="decrement()" [disabled]="disabled()">Decrement</button>
        <button (click)="reset()" [disabled]="disabled()">Reset</button>
      </section>

      <!-- Computed Signal Example -->
      <section class="computed-signal">
        <h3>Computed Signal</h3>
        <p>Is Even: {{ isEven() ? 'Yes' : 'No' }}</p>
        <p>Count Status: {{ countStatus() }}</p>
        <p>Message: {{ message() }}</p>
      </section>

      <!-- Object Signal Example -->
      <section class="object-signal">
        <h3>Object Signal</h3>
        <div *ngIf="user(); else noUser">
          <p>User: {{ user()?.name }} ({{ user()?.email }})</p>
          <p>User ID: {{ user()?.id }}</p>
        </div>
        <ng-template #noUser>
          <p>No user selected</p>
        </ng-template>
        <button (click)="loadUser()">Load User</button>
        <button (click)="updateUserName()">Update Name</button>
        <button (click)="clearUser()">Clear User</button>
      </section>

      <!-- Array Signal Example -->
      <section class="array-signal">
        <h3>Array Signal</h3>
        <p>Items count: {{ items().length }}</p>
        <p>Total items: {{ totalItems() }}</p>
        <ul>
          <li *ngFor="let item of items()">
            {{ item.name }} ({{ item.quantity }})
          </li>
        </ul>
        <button (click)="addItem()">Add Item</button>
        <button (click)="removeLastItem()">Remove Last</button>
        <button (click)="clearItems()">Clear All</button>
      </section>

      <!-- Effect Log -->
      <section class="effect-log">
        <h3>Effect Log</h3>
        <div class="log-container">
          <div *ngFor="let log of effectLogs()" class="log-entry">
            {{ log }}
          </div>
        </div>
        <button (click)="clearLogs()">Clear Logs</button>
      </section>
    </div>
  `,
  styles: [`
    .signal-demo {
      max-width: 800px;
      margin: 20px auto;
      padding: 20px;
      font-family: Arial, sans-serif;
    }

    section {
      margin-bottom: 30px;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background-color: #f9f9f9;
    }

    .input-output {
      background-color: #e8f5e8;
      border-color: #4caf50;
    }

    h2 {
      color: #333;
      text-align: center;
      margin-bottom: 30px;
    }

    h3 {
      color: #555;
      margin-bottom: 15px;
    }

    button {
      margin: 5px;
      padding: 8px 16px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    button:hover {
      background-color: #0056b3;
    }

    .log-container {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #ccc;
      padding: 10px;
      background-color: white;
    }

    .log-entry {
      padding: 2px 0;
      font-family: monospace;
      font-size: 12px;
      color: #666;
    }

    ul {
      list-style-type: none;
      padding: 0;
    }

    li {
      padding: 5px 0;
      border-bottom: 1px solid #eee;
    }
  `]
})
export class SignalCounterComponent {
  // Angular 21 Input signals
  initialCount = input<number>(0);
  maxCount = input<number>(100);
  stepSize = input<number>(1);
  disabled = input<boolean>(false);
  title = input<string>('Signal Counter');

  // Angular 21 Output functions
  countChanged = output<number>();
  userSelected = output<User>();
  maxCountReached = output<void>();
  resetTriggered = output<void>();

  // Basic signals
  count = signal(0);

  // Computed signals
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

  message = computed(() => {
    const status = this.countStatus();
    const even = this.isEven();
    return `Count is ${status.toLowerCase()} and ${even ? 'even' : 'odd'}`;
  });

  // Object signal
  user = signal<User | null>(null);

  // Array signal
  items = signal<{ name: string; quantity: number }[]>([]);

  // Effect logs
  effectLogs = signal<string[]>([]);

  constructor() {
    // Initialize count from input signal
    this.count.set(this.initialCount());

    // Effect that runs whenever count changes
    effect(() => {
      const currentCount = this.count();
      const timestamp = new Date().toLocaleTimeString();
      this.addLog(`[${timestamp}] Count changed to: ${currentCount}`);

      // Emit count changed output
      this.countChanged.emit(currentCount);

      // Check if max count reached
      if (currentCount >= this.maxCount()) {
        this.maxCountReached.emit();
      }
    });

    // Effect that runs when user changes
    effect(() => {
      const currentUser = this.user();
      if (currentUser) {
        this.addLog(`User loaded: ${currentUser.name}`);
        this.userSelected.emit(currentUser);
      }
    });

    // Effect that runs when items change
    effect(() => {
      const itemsCount = this.items().length;
      this.addLog(`Items count: ${itemsCount}`);
    });
  }

  // Basic signal methods
  increment(): void {
    if (this.disabled()) return;

    const step = this.stepSize();
    const newCount = this.count() + step;
    const maxCount = this.maxCount();

    this.count.set(Math.min(newCount, maxCount));
  }

  decrement(): void {
    if (this.disabled()) return;

    const step = this.stepSize();
    this.count.update(value => Math.max(value - step, 0));
  }

  reset(): void {
    this.count.set(this.initialCount());
    this.resetTriggered.emit();
  }

  // Object signal methods
  loadUser(): void {
    this.user.set({
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com'
    });
  }

  updateUserName(): void {
    this.user.update(currentUser => {
      if (!currentUser) return currentUser;
      return {
        ...currentUser,
        name: 'Jane Smith'
      };
    });
  }

  clearUser(): void {
    this.user.set(null);
  }

  // Array signal methods
  addItem(): void {
    const newItem = {
      name: `Item ${this.items().length + 1}`,
      quantity: Math.floor(Math.random() * 10) + 1
    };
    this.items.update(currentItems => [...currentItems, newItem]);
  }

  removeLastItem(): void {
    this.items.update(currentItems =>
      currentItems.slice(0, -1)
    );
  }

  clearItems(): void {
    this.items.set([]);
  }

  // Computed signal for total items
  totalItems = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  // Utility methods
  private addLog(message: string): void {
    this.effectLogs.update(logs => [...logs, message]);
  }

  clearLogs(): void {
    this.effectLogs.set([]);
  }
}
