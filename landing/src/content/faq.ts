export interface FAQItem {
  q: string;
  a: string;
}

export const faq: FAQItem[] = [
  {
    q: 'Does Slow to Pro work offline?',
    a: 'Yes. Tasks, Pomodoro, and Finances all work offline. Cloud sync (optional) kicks in when you reconnect.',
  },
  {
    q: 'Where is my data stored?',
    a: 'By default, data lives on your device (MMKV, end-to-end private). Sign in to sync across devices via Supabase with row-level security.',
  },
  {
    q: 'What platforms are supported?',
    a: 'iOS, Android, and the web. One account, same experience, different glass.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes. Core features — Tasks, Pomodoro, Finances — are free forever. Pro unlocks advanced statistics, themes, and priority support.',
  },
  {
    q: 'Can I export my data?',
    a: 'Always. One-tap export to CSV / PDF from Settings. Your data is yours.',
  },
  {
    q: 'How do I contact support?',
    a: 'Write to hello@slowtopro.app. Real humans, calm replies, usually within a day.',
  },
];
