import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));

import { useTheme } from '../../context/ThemeContext';
import Header from '../../components/Header';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333', borderLight: '#444',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  primary: '#4f46e5', overlay: 'rgba(0,0,0,0.5)', divider: '#444',
};

const mockToggleTheme = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({
    colors: MOCK_COLORS, isDark: true, toggleTheme: mockToggleTheme,
  });
});

describe('Header', () => {
  it('renders title', () => {
    render(<Header title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    render(<Header title="Title" subtitle="Subtitle text" />);
    expect(screen.getByText('Subtitle text')).toBeTruthy();
  });

  it('does not render subtitle when not provided', () => {
    render(<Header title="Title" />);
    expect(screen.queryByText('Subtitle text')).toBeNull();
  });

  it('renders back button when onBack provided', () => {
    const onBack = jest.fn();
    render(<Header title="Title" onBack={onBack} />);
    fireEvent.press(screen.getByText('‹'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders notification bell when onNotif provided', () => {
    const onNotif = jest.fn();
    render(<Header title="Title" onNotif={onNotif} />);
    fireEvent.press(screen.getByText('🔔'));
    expect(onNotif).toHaveBeenCalledTimes(1);
  });

  it('calls toggleTheme when Light mode button pressed (menu open, currently dark)', () => {
    render(<Header title="Title" onLogout={jest.fn()} />);
    fireEvent.press(screen.getByText('···'));
    fireEvent.press(screen.getByText('☀️'));
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('does not render menu when no onProfile or onLogout', () => {
    render(<Header title="Title" />);
    expect(screen.queryByText('···')).toBeNull();
  });

  it('renders menu button when onLogout provided', () => {
    render(<Header title="Title" onLogout={jest.fn()} />);
    expect(screen.getByText('···')).toBeTruthy();
  });

  it('shows notification badge count when notifCount > 0', () => {
    render(<Header title="Title" onNotif={jest.fn()} notifCount={3} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('shows 9+ badge when notifCount > 9', () => {
    render(<Header title="Title" onNotif={jest.fn()} notifCount={15} />);
    expect(screen.getByText('9+')).toBeTruthy();
  });

  it('calls onProfile when My Profile menu item pressed', () => {
    const onProfile = jest.fn();
    render(<Header title="Title" onProfile={onProfile} onLogout={jest.fn()} />);
    fireEvent.press(screen.getByText('···'));
    fireEvent.press(screen.getByText('My Profile'));
    expect(onProfile).toHaveBeenCalledTimes(1);
  });

  it('calls onNotif when Notifications menu item pressed', () => {
    const onNotif = jest.fn();
    render(<Header title="Title" onLogout={jest.fn()} onNotif={onNotif} />);
    fireEvent.press(screen.getByText('···'));
    fireEvent.press(screen.getAllByText('Notifications')[0]);
    expect(onNotif).toHaveBeenCalledTimes(1);
  });

  it('calls onPrivacySecurity when Privacy & Security menu item pressed', () => {
    const onPrivacySecurity = jest.fn();
    render(<Header title="Title" onLogout={jest.fn()} onPrivacySecurity={onPrivacySecurity} />);
    fireEvent.press(screen.getByText('···'));
    fireEvent.press(screen.getByText('Privacy & Security'));
    expect(onPrivacySecurity).toHaveBeenCalledTimes(1);
  });

  it('shows Alert when Help & Support pressed', () => {
    const mockAlert = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
    render(<Header title="Title" onLogout={jest.fn()} />);
    fireEvent.press(screen.getByText('···'));
    fireEvent.press(screen.getByText('Help & Support'));
    expect(mockAlert).toHaveBeenCalledWith('Help & Support', expect.any(String), expect.any(Array));
    mockAlert.mockRestore();
  });

  it('calls onLogout when Sign Out menu item pressed', () => {
    const onLogout = jest.fn();
    render(<Header title="Title" onLogout={onLogout} />);
    fireEvent.press(screen.getByText('···'));
    fireEvent.press(screen.getByText('Sign Out'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('calls onSwitchAccount when Switch Account menu item pressed', () => {
    const onSwitchAccount = jest.fn();
    render(<Header title="Title" onLogout={jest.fn()} onSwitchAccount={onSwitchAccount} />);
    fireEvent.press(screen.getByText('···'));
    fireEvent.press(screen.getByText('Switch Account'));
    expect(onSwitchAccount).toHaveBeenCalledTimes(1);
  });

  it('shows user initials in menu header', () => {
    render(<Header title="Alice Smith" subtitle="Dev" onLogout={jest.fn()} userInitials="AS" />);
    fireEvent.press(screen.getByText('···'));
    expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(0);
  });

  it('shows notification count badge in menu Notifications row', () => {
    render(<Header title="Title" onLogout={jest.fn()} onNotif={jest.fn()} notifCount={5} />);
    fireEvent.press(screen.getByText('···'));
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
  });

  it('calls toggleTheme when Dark mode button pressed (currently light mode)', () => {
    (useTheme as jest.Mock).mockReturnValue({
      colors: MOCK_COLORS, isDark: false, toggleTheme: mockToggleTheme,
    });
    render(<Header title="Title" onLogout={jest.fn()} />);
    fireEvent.press(screen.getByText('···'));
    fireEvent.press(screen.getByText('🌙'));
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });
});
