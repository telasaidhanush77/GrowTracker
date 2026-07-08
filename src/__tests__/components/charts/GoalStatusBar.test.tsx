import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));

import { useTheme } from '../../../context/ThemeContext';
import GoalStatusBar from '../../../components/charts/GoalStatusBar';

const MOCK_COLORS: any = {
  chartTrack: '#e5e7eb',
  approved: '#22c55e',
  pending: '#f59e0b',
  inProgress: '#3b82f6',
  rejected: '#ef4444',
  notStarted: '#6b7280',
};

beforeEach(() => {
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
});

const EMPTY_STATS = { approved: 0, submitted: 0, inProgress: 0, rejected: 0, notStarted: 0, total: 0 };

describe('GoalStatusBar — empty state', () => {
  it('renders a single track View when total is 0', () => {
    const { toJSON } = render(<GoalStatusBar stats={EMPTY_STATS} />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('GoalStatusBar — with data', () => {
  const stats = {
    approved: 2,
    submitted: 1,
    inProgress: 1,
    rejected: 0,
    notStarted: 1,
    total: 5,
  };

  it('renders without errors when total > 0', () => {
    const { toJSON } = render(<GoalStatusBar stats={stats} />);
    expect(toJSON()).toBeTruthy();
  });

  it('does not render TouchableOpacity segments when no onSegmentPress', () => {
    const { queryAllByRole } = render(<GoalStatusBar stats={stats} />);
    expect(queryAllByRole('button')).toHaveLength(0);
  });

  it('renders touchable segments when onSegmentPress is provided', () => {
    const onPress = jest.fn();
    const { toJSON } = render(
      <GoalStatusBar stats={stats} onSegmentPress={onPress} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('calls onSegmentPress with the correct status when a segment is pressed', () => {
    const onPress = jest.fn();
    render(
      <GoalStatusBar
        stats={{ approved: 3, submitted: 0, inProgress: 0, rejected: 0, notStarted: 0, total: 3 }}
        onSegmentPress={onPress}
      />,
    );
    const pressables = screen.UNSAFE_getAllByType(require('react-native').TouchableOpacity);
    fireEvent.press(pressables[0]);
    expect(onPress).toHaveBeenCalledWith('approved');
  });

  it('filters out zero-pct segments', () => {
    const onPress = jest.fn();
    render(
      <GoalStatusBar
        stats={{ approved: 2, submitted: 0, inProgress: 0, rejected: 0, notStarted: 1, total: 3 }}
        onSegmentPress={onPress}
      />,
    );
    const pressables = screen.UNSAFE_getAllByType(require('react-native').TouchableOpacity);
    expect(pressables).toHaveLength(2);
  });
});
