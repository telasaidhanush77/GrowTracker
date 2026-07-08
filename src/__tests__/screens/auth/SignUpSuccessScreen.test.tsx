import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));

import { useTheme } from '../../../context/ThemeContext';
import SignUpSuccessScreen from '../../../screens/auth/SignUpSuccessScreen';

const MOCK_COLORS: any = {
  bg: '#111', card: '#1a1a1a', textPrimary: '#fff', textMuted: '#aaa',
  approvedBg: '#dcfce7', approved: '#22c55e', primary: '#4f46e5',
};

beforeEach(() => {
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS });
});

describe('SignUpSuccessScreen', () => {
  const defaultProps = {
    uniqueId: 'EMP-001',
    username: 'alice_s',
    onContinue: jest.fn(),
  };

  it('renders "Account Created!" heading', () => {
    render(<SignUpSuccessScreen {...defaultProps} />);
    expect(screen.getByText('Account Created!')).toBeTruthy();
  });

  it('displays the unique ID', () => {
    render(<SignUpSuccessScreen {...defaultProps} />);
    expect(screen.getByText('EMP-001')).toBeTruthy();
  });

  it('displays the username', () => {
    render(<SignUpSuccessScreen {...defaultProps} />);
    expect(screen.getByText('alice_s')).toBeTruthy();
  });

  it('shows the "Continue to Sign In" button', () => {
    render(<SignUpSuccessScreen {...defaultProps} />);
    expect(screen.getByText('Continue to Sign In →')).toBeTruthy();
  });

  it('calls onContinue when the button is pressed', () => {
    const onContinue = jest.fn();
    render(<SignUpSuccessScreen {...defaultProps} onContinue={onContinue} />);
    fireEvent.press(screen.getByText('Continue to Sign In →'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('shows label text for Unique ID and Username', () => {
    render(<SignUpSuccessScreen {...defaultProps} />);
    expect(screen.getByText('Unique ID')).toBeTruthy();
    expect(screen.getByText('Username')).toBeTruthy();
  });
});
