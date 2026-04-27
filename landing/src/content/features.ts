export type FeatureIcon = 'check-circle-2' | 'timer' | 'wallet';

export interface Feature {
  id: 'tasks' | 'pomodoro' | 'finances';
  icon: FeatureIcon;
  eyebrow: string;
  title: string;
  shortTitle: string;
  copy: string;
  detail: string;
  bullets: string[];
  screenshot: string;
}

export const features: Feature[] = [
  {
    id: 'tasks',
    icon: 'check-circle-2',
    eyebrow: 'Tasks',
    shortTitle: 'Tasks',
    title: 'Tasks that respect your focus.',
    copy: 'A calm inbox for everything that matters today.',
    detail:
      'Capture ideas the moment they arrive. Drag to reorder. Flag priorities without drowning in categories.',
    bullets: [
      'Drag-to-reorder with haptics',
      'Priorities without friction',
      'Works beautifully offline',
    ],
    screenshot: '/screenshots/tasks.svg',
  },
  {
    id: 'pomodoro',
    icon: 'timer',
    eyebrow: 'Pomodoro',
    shortTitle: 'Pomodoro',
    title: 'Pomodoro, done right.',
    copy: 'Deep work cycles with a finish line worth celebrating.',
    detail:
      'Start a cycle in one tap. Get a gentle nudge when it is time for a break. Confetti when you finish.',
    bullets: [
      'One-tap cycles',
      'Smart break reminders',
      'Confetti on completion',
    ],
    screenshot: '/screenshots/pomodoro.svg',
  },
  {
    id: 'finances',
    icon: 'wallet',
    eyebrow: 'Finances',
    shortTitle: 'Finances',
    title: 'Finances in one glance.',
    copy: 'See where your money goes, without handing it to a bank.',
    detail:
      'Log expenses in seconds. Visualize categories. Everything stays on your device by default — private by design.',
    bullets: [
      'Quick-entry expenses',
      'Category charts',
      'Private by design (local MMKV)',
    ],
    screenshot: '/screenshots/finances.svg',
  },
];
