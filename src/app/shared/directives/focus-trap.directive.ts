import { Directive, ElementRef, HostListener, AfterViewInit } from '@angular/core';

@Directive({
  selector: '[appFocusTrap]'
})
export class FocusTrapDirective implements AfterViewInit {
  private focusableEls: HTMLElement[] = [];

  constructor(private el: ElementRef) { }

  ngAfterViewInit() {
    // Collect all focusable elements inside the modal
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];

    // Make modal container focusable for accessibility
    this.el.nativeElement.setAttribute('tabindex', '-1');

    // Use setTimeout to ensure Angular has finished rendering
    setTimeout(() => {
      this.focusableEls = Array.from(
        this.el.nativeElement.querySelectorAll(selectors.join(','))
      ) as HTMLElement[];

      // Defer focus until DOM is stable (zoneless safe)
      requestAnimationFrame(() => {
        // Focus on modal container first
        this.el.nativeElement.focus();
      });
    }, 0);
  }

  @HostListener('keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;

    const firstEl = this.focusableEls[0];
    const lastEl = this.focusableEls[this.focusableEls.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    // If modal container is focused, move to first focusable element
    if (activeElement === this.el.nativeElement) {
      if (firstEl) {
        firstEl.focus();
        event.preventDefault();
      }
      return;
    }

    if (event.shiftKey) {
      // Shift+Tab
      if (activeElement === firstEl) {
        lastEl.focus();
        event.preventDefault();
      }
    } else {
      // Tab
      if (activeElement === lastEl) {
        firstEl.focus();
        event.preventDefault();
      }
    }
  }
}

