import { render } from '@testing-library/react-native';

import { BarChartView } from '../BarChartView';

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: false,
    bg: '#ffffff',
    surface: '#f8fafc',
    surfaceElevated: '#ffffff',
    surfaceMuted: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#334155',
    textSubtle: '#64748b',
    primary: '#2563eb',
    primarySoft: '#dbeafe',
    danger: '#ef4444',
    success: '#10b981',
    overlay: 'rgba(2,6,23,0.45)',
  }),
}));

jest.mock('react-native-gifted-charts', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    BarChart: ({ testID }: { testID?: string }) =>
      React.createElement(View, { testID: testID ?? 'mock-bar-chart' }),
    PieChart: ({ testID }: { testID?: string }) =>
      React.createElement(View, { testID: testID ?? 'mock-pie-chart' }),
  };
});

const categories = [
  { id: 'cat-food', name: 'Food', color: '#f97316' },
  { id: 'cat-transport', name: 'Transport', color: '#3b82f6' },
];

describe('BarChartView', () => {
  it('renders empty-state message when there is no spending data', () => {
    const { getByText } = render(
      <BarChartView categories={categories} spentByCategory={() => 0} type="bar" />
    );

    expect(getByText('No spending data this month')).toBeTruthy();
  });

  it('renders bar chart when bar type has spending data', () => {
    const { getByTestId } = render(
      <BarChartView
        categories={categories}
        spentByCategory={(id) => (id === 'cat-food' ? 42 : 0)}
        type="bar"
      />
    );

    expect(getByTestId('finance-bar-chart')).toBeTruthy();
  });

  it('renders pie chart when pie type has spending data', () => {
    const { getByTestId } = render(
      <BarChartView
        categories={categories}
        spentByCategory={(id) => (id === 'cat-food' ? 42 : 0)}
        type="pie"
      />
    );

    expect(getByTestId('finance-pie-chart')).toBeTruthy();
  });
});
