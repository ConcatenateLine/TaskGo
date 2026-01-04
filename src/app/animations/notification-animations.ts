import { animation, animate, keyframes, style } from '@angular/animations';

export const slideInRight = animation([
  animate(
    '300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    keyframes([
      style({ opacity: 0, transform: 'translateX(100%) scale(0.8)' }),
      style({ opacity: 1, transform: 'translateX(0) scale(1)' })
    ])
  )
]);

export const slideOutRight = animation([
  animate(
    '250ms ease-in',
    keyframes([
      style({ opacity: 1, transform: 'translateX(0) scale(1)' }),
      style({ opacity: 0, transform: 'translateX(100%) scale(0.8)' })
    ])
  )
]);