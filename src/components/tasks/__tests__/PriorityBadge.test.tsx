import { render } from '@testing-library/react-native';

import { PriorityBadge } from '../PriorityBadge';

describe('PriorityBadge', () => {
  it('renders a view for high priority', () => {
    const { toJSON } = render(<PriorityBadge priority="high" />);
    const json = toJSON() as { props: { className: string } };
    expect(json.props.className).toContain('bg-red-500');
  });

  it('renders a view for medium priority', () => {
    const { toJSON } = render(<PriorityBadge priority="medium" />);
    const json = toJSON() as { props: { className: string } };
    expect(json.props.className).toContain('bg-amber-400');
  });

  it('renders a view for low priority', () => {
    const { toJSON } = render(<PriorityBadge priority="low" />);
    const json = toJSON() as { props: { className: string } };
    expect(json.props.className).toContain('bg-green-500');
  });
});
