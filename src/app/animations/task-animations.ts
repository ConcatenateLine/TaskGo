import {
  animation,
  animate,
  keyframes,
  style,
  trigger,
  transition,
  useAnimation,
  query,
  stagger,
  group,
  sequence,
} from '@angular/animations';

// Notification animations (existing)
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

// Task creation animations
export const taskCreateIn = animation([
  animate(
    '400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    keyframes([
      style({ opacity: 0, transform: 'translateY(-20px) scale(0.95)', height: 0, marginBottom: 0 }),
      style({ opacity: 0.7, transform: 'translateY(-5px) scale(1.02)', height: '*', marginBottom: '1rem' }),
      style({ opacity: 1, transform: 'translateY(0) scale(1)', height: '*', marginBottom: '1rem' })
    ])
  )
]);

export const taskCreateSuccess = animation([
  animate(
    '500ms ease-out',
    keyframes([
      style({ transform: 'scale(1)', 'box-shadow': 'none' }),
      style({ transform: 'scale(1.05)', 'box-shadow': 'none' }),
      style({ transform: 'scale(1)', 'box-shadow': '0 0 20px rgba(34, 197, 94, 0.3)' }),
      style({ transform: 'scale(1)', 'box-shadow': 'none' })
    ])
  )
]);

// Task update animations
export const taskUpdateHighlight = animation([
  animate(
    '800ms ease-out',
    keyframes([
      style({ 
        'background-color': 'transparent',
        'border-color': 'transparent',
        transform: 'scale(1)'
      }),
      style({ 
        'background-color': 'rgba(59, 130, 246, 0.1)',
        'border-color': 'rgb(59, 130, 246)',
        transform: 'scale(1.02)'
      }),
      style({ 
        'background-color': 'transparent',
        'border-color': 'transparent',
        transform: 'scale(1)'
      })
    ])
  )
]);

export const taskEditIn = animation([
  animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', keyframes([
      style({ opacity: 0, transform: 'translateX(-10px) scale(0.98)' }),
      style({ opacity: 1, transform: 'translateX(0) scale(1)' })
    ])
  )
]);

// Task delete animations
export const taskDeleteOut = animation([
  animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', keyframes([
      style({ opacity: 1, transform: 'translateX(0) scale(1)', height: '*', marginBottom: '1rem' }),
      style({ opacity: 0.5, transform: 'translateX(20px) scale(0.98)', height: '*', marginBottom: '1rem' }),
      style({ opacity: 0, transform: 'translateX(-50px) scale(0.9)', height: 0, marginBottom: 0, overflow: 'hidden' })
    ])
  )
]);

export const taskDeleteShake = animation([
  animate(
    '500ms ease-in-out',
    keyframes([
      style({ transform: 'translateX(0)' }),
      style({ transform: 'translateX(-5px)' }),
      style({ transform: 'translateX(5px)' }),
      style({ transform: 'translateX(-5px)' }),
      style({ transform: 'translateX(5px)' }),
      style({ transform: 'translateX(0)' })
    ])
  )
]);

// Loading animations
export const taskLoading = animation([
  animate('1s ease-in-out', keyframes([
    style({ opacity: 0.3 }),
    style({ opacity: 1 }),
    style({ opacity: 0.3 })
  ])
  )
]);

// Animation triggers
export const taskAnimations = [
  trigger('taskItemAnimation', [
    transition(':enter', [useAnimation(taskCreateIn)]),
    transition(':leave', [useAnimation(taskDeleteOut)])
  ]),

  trigger('taskCreateSuccess', [
    transition('* => *', [useAnimation(taskCreateSuccess)])
  ]),

  trigger('taskUpdateHighlight', [
    transition('* => *', [useAnimation(taskUpdateHighlight)])
  ]),

  trigger('taskEditAnimation', [
    transition(':enter', [useAnimation(taskEditIn)])
  ]),

  trigger('deleteConfirmationAnimation', [
    transition(':enter', [style({ opacity: 0 }), animate('200ms ease-out', style({ opacity: 1 }))]),
    transition(':leave', [style({ opacity: 1 }), animate('150ms ease-in', style({ opacity: 0 }))])
  ]),

  trigger('taskListStagger', [
    transition(':enter', [query('@taskItemAnimation', stagger('100ms', [useAnimation(taskCreateIn)]))])
  ])
];

// Animation utility functions
export const getTaskAnimationDuration = (animationType: 'create' | 'update' | 'delete'): number => {
  const durations = {
    create: 400,
    update: 800,
    delete: 500
  };
  return durations[animationType];
};

export const getTaskAnimationEasing = (animationType: 'create' | 'update' | 'delete'): string => {
  const easings = {
    create: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    update: 'cubic-bezier(0.4, 0, 0.2, 1)',
    delete: 'cubic-bezier(0.4, 0, 0.2, 1)'
  };
  return easings[animationType];
};

// Respect prefers-reduced-motion for animations
export const respectfulAnimations = [
  trigger('respectfulAnimations', [
    transition(':enter', [
      query('@*', [animate('{{duration}} {{easing}}', keyframes([
        style({ opacity: 0 }),
        style({ opacity: 1 })
      ]))], { optional: true })
    ]),
    transition(':leave', [
      query('@*', [
        animate(
          '{{duration}} {{easing}}',
          keyframes([
            style({ opacity: 1 }),
            style({ opacity: 0 })
          ])
        )
      ], { optional: true })
    ])
  ])
];