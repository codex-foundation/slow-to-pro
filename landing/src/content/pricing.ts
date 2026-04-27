export interface PricingTier {
  id: 'free' | 'pro';
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  highlight: boolean;
  features: string[];
  cta: string;
}

export const pricing: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Everything you need to start.',
    monthly: 0,
    yearly: 0,
    highlight: false,
    features: [
      'Unlimited tasks',
      'Unlimited Pomodoro cycles',
      'Expense tracking',
      'Local, private by default',
      'iOS, Android, and web',
    ],
    cta: 'Download free',
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For people who mean it.',
    monthly: 4.99,
    yearly: 39,
    highlight: true,
    features: [
      'Everything in Free',
      'Advanced analytics & streaks',
      'Cloud sync across devices',
      'Premium themes & icons',
      'Priority support',
    ],
    cta: 'Go Pro',
  },
];
