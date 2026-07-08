import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));

import { useTheme } from '../../context/ThemeContext';
import { PermissionDeniedBanner } from '../../components/PermissionDeniedBanner';

const MOCK_COLORS: any = {
  rejectedBg: '#fee2e2', rejected: '#ef4444',
};

beforeEach(() => {
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
});

describe('PermissionDeniedBanner', () => {
  it('renders the message text', () => {
    render(<PermissionDeniedBanner message="Camera access denied." onOpenSettings={jest.fn()} />);
    expect(screen.getByText('Camera access denied.')).toBeTruthy();
  });

  it('renders the Open Settings button', () => {
    render(<PermissionDeniedBanner message="Access denied." onOpenSettings={jest.fn()} />);
    expect(screen.getByText('Open Settings')).toBeTruthy();
  });

  it('calls onOpenSettings when button is pressed', () => {
    const onOpenSettings = jest.fn();
    render(<PermissionDeniedBanner message="Access denied." onOpenSettings={onOpenSettings} />);
    fireEvent.press(screen.getByTestId('open-settings-btn'));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('renders the banner testID', () => {
    render(<PermissionDeniedBanner message="Denied." onOpenSettings={jest.fn()} />);
    expect(screen.getByTestId('permission-denied-banner')).toBeTruthy();
  });
});
