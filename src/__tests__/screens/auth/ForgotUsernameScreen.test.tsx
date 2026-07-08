import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';
import ForgotUsernameScreen from '../../../screens/auth/ForgotUsernameScreen';

const MOCK_COLORS: any = {
  bg: '#111', bgElevated: '#1a1a1a', card: '#222', border: '#333',
  textPrimary: '#fff', textSecondary: '#ccc', textMuted: '#999',
  primary: '#4f46e5', approved: '#22c55e', approvedBg: '#dcfce7',
  rejected: '#ef4444', rejectedBg: '#fee2e2',
};

function buildChain(result: any) {
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.single = jest.fn().mockResolvedValue(result);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
  (useTheme as jest.Mock).mockReturnValue({ colors: MOCK_COLORS, isDark: true });
});

describe('ForgotUsernameScreen', () => {
  it('renders Recover Username heading', () => {
    render(<ForgotUsernameScreen onBack={jest.fn()} />);
    expect(screen.getAllByText('Recover Username').length).toBeGreaterThan(0);
  });

  it('calls onBack when Back button pressed', () => {
    const onBack = jest.fn();
    render(<ForgotUsernameScreen onBack={onBack} />);
    fireEvent.press(screen.getByText('‹ Back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('shows validation error for invalid email', () => {
    render(<ForgotUsernameScreen onBack={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'notanemail');
    fireEvent.press(screen.getAllByText('Recover Username')[1]);
    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
  });

  it('calls supabase when valid email entered', async () => {
    const chain = buildChain({ data: null, error: null });
    (supabase.from as jest.Mock).mockReturnValue(chain);
    render(<ForgotUsernameScreen onBack={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
    fireEvent.press(screen.getAllByText('Recover Username')[1]);
    expect(supabase.from).toHaveBeenCalledWith('profiles');
  });

  it('shows error when no account found', async () => {
    const chain = buildChain({ data: null, error: null });
    (supabase.from as jest.Mock).mockReturnValue(chain);
    render(<ForgotUsernameScreen onBack={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'nouser@example.com');
    fireEvent.press(screen.getAllByText('Recover Username')[1]);
    await screen.findByText('No account found with that email address.');
    expect(screen.getByText('No account found with that email address.')).toBeTruthy();
  });

  it('shows username and ID when account found', async () => {
    const chain = buildChain({ data: { username: 'alice.smith', employee_code: 'GT-001' }, error: null });
    (supabase.from as jest.Mock).mockReturnValue(chain);
    render(<ForgotUsernameScreen onBack={jest.fn()} />);
    fireEvent.changeText(screen.getByPlaceholderText('your@email.com'), 'alice@example.com');
    fireEvent.press(screen.getAllByText('Recover Username')[1]);
    await screen.findByText('alice.smith');
    expect(screen.getByText('alice.smith')).toBeTruthy();
    expect(screen.getByText('GT-001')).toBeTruthy();
  });
});
