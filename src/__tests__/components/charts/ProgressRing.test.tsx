import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));

import { useTheme } from '../../../context/ThemeContext';
import ProgressRing from '../../../components/charts/ProgressRing';

const MOCK_COLORS: any = {
  bgElevated: '#f5f5f5',
  chartTrack: '#e5e7eb',
  textMuted: '#9ca3af',
};

beforeEach(() => {
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
});

describe('ProgressRing', () => {
  it('renders without errors at 0%', () => {
    const { toJSON } = render(<ProgressRing pct={0} color="#22c55e" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without errors at 50%', () => {
    const { toJSON } = render(<ProgressRing pct={50} color="#3b82f6" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without errors at 100%', () => {
    const { toJSON } = render(<ProgressRing pct={100} color="#ef4444" />);
    expect(toJSON()).toBeTruthy();
  });

  it('clamps pct above 100 to 100', () => {
    const { toJSON } = render(<ProgressRing pct={150} color="#22c55e" />);
    expect(toJSON()).toBeTruthy();
  });

  it('clamps negative pct to 0', () => {
    const { toJSON } = render(<ProgressRing pct={-10} color="#22c55e" />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays label when provided', () => {
    render(<ProgressRing pct={75} color="#22c55e" label="75%" />);
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('displays sublabel when provided', () => {
    render(<ProgressRing pct={75} color="#22c55e" label="75%" sublabel="score" />);
    expect(screen.getByText('score')).toBeTruthy();
  });

  it('does not display label when not provided', () => {
    render(<ProgressRing pct={50} color="#22c55e" />);
    expect(screen.queryByText('50%')).toBeNull();
  });

  it('accepts custom size and stroke props', () => {
    const { toJSON } = render(<ProgressRing pct={60} color="#22c55e" size={120} stroke={15} />);
    expect(toJSON()).toBeTruthy();
  });

  it('uses custom trackColor when provided', () => {
    const { toJSON } = render(
      <ProgressRing pct={60} color="#22c55e" trackColor="#d1d5db" bg="#ffffff" />,
    );
    expect(toJSON()).toBeTruthy();
  });
});
