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
    this.focusableEls = Array.from(
      this.el.nativeElement.querySelectorAll(selectors.join(','))
    ) as HTMLElement[];

    // Defer focus until DOM is stable (zoneless safe)
    requestAnimationFrame(() => {
      // Focus the first element when modal opens
      if (this.focusableEls.length) {
        this.focusableEls[0].focus();
      }
    });
  }

  @HostListener('keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;

    const firstEl = this.focusableEls[0];
    const lastEl = this.focusableEls[this.focusableEls.length - 1];

    if (event.shiftKey) {
      // Shift+Tab
      if (document.activeElement === firstEl) {
        lastEl.focus();
        event.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastEl) {
        firstEl.focus();
        event.preventDefault();
      }
    }
  }
}

