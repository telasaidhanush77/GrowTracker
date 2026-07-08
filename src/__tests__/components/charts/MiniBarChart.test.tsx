import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));

import { useTheme } from '../../../context/ThemeContext';
import MiniBarChart from '../../../components/charts/MiniBarChart';

const MOCK_COLORS: any = {
  chartTrack: '#e5e7eb',
  border: '#d1d5db',
  textMuted: '#9ca3af',
};

beforeEach(() => {
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
});

const BAR_DATA = [
  { label: 'Q1', value: 10, color: '#22c55e' },
  { label: 'Q2', value: 20, color: '#3b82f6' },
];

describe('MiniBarChart', () => {
  it('renders without errors', () => {
    const { toJSON } = render(<MiniBarChart data={BAR_DATA} />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays bar values by default', () => {
    render(<MiniBarChart data={BAR_DATA} />);
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('20')).toBeTruthy();
  });

  it('hides values when showValues=false', () => {
    render(<MiniBarChart data={BAR_DATA} showValues={false} />);
    expect(screen.queryByText('10')).toBeNull();
    expect(screen.queryByText('20')).toBeNull();
  });

  it('shows labels by default', () => {
    render(<MiniBarChart data={BAR_DATA} />);
    expect(screen.getByText('Q1')).toBeTruthy();
    expect(screen.getByText('Q2')).toBeTruthy();
  });

  it('hides labels when showLabels=false', () => {
    render(<MiniBarChart data={BAR_DATA} showLabels={false} />);
    expect(screen.queryByText('Q1')).toBeNull();
    expect(screen.queryByText('Q2')).toBeNull();
  });

  it('appends valueSuffix to displayed values', () => {
    render(<MiniBarChart data={BAR_DATA} valueSuffix="%" />);
    expect(screen.getByText('10%')).toBeTruthy();
    expect(screen.getByText('20%')).toBeTruthy();
  });

  it('renders correctly with empty data', () => {
    const { toJSON } = render(<MiniBarChart data={[]} />);
    expect(toJSON()).toBeTruthy();
  });

  it('uses explicit maxValue when provided', () => {
    const { toJSON } = render(<MiniBarChart data={BAR_DATA} maxValue={100} />);
    expect(toJSON()).toBeTruthy();
  });
});
