import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));

import { useTheme } from '../../context/ThemeContext';
import BottomTabBar, { TabDef } from '../../components/BottomTabBar';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  primary: '#4f46e5',
};

const TABS: TabDef[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
  { key: 'profile', label: 'Profile', icon: '👤' },
];

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS, isDark: true });
});

describe('BottomTabBar', () => {
  it('renders all tab labels', () => {
    render(<BottomTabBar tabs={TABS} activeKey="home" onSelect={jest.fn()} />);
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
  });

  it('calls onSelect with tab key when tab pressed', () => {
    const onSelect = jest.fn();
    render(<BottomTabBar tabs={TABS} activeKey="home" onSelect={onSelect} />);
    fireEvent.press(screen.getByText('Settings'));
    expect(onSelect).toHaveBeenCalledWith('settings');
  });

  it('calls onSelect with correct key for each tab', () => {
    const onSelect = jest.fn();
    render(<BottomTabBar tabs={TABS} activeKey="home" onSelect={onSelect} />);
    fireEvent.press(screen.getByText('Profile'));
    expect(onSelect).toHaveBeenCalledWith('profile');
  });

  it('renders without errors when activeKey matches no tab', () => {
    const { toJSON } = render(<BottomTabBar tabs={TABS} activeKey="nonexistent" onSelect={jest.fn()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders single tab correctly', () => {
    const singleTab: TabDef[] = [{ key: 'only', label: 'Only', icon: '✓' }];
    render(<BottomTabBar tabs={singleTab} activeKey="only" onSelect={jest.fn()} />);
    expect(screen.getByText('Only')).toBeTruthy();
  });
});
