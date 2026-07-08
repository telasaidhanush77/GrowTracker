import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { ThemeProvider } from '../../context/ThemeContext';
import { ToastProvider, useToast } from '../../context/ToastContext';

function ToastTrigger({ message = 'Hello', type = 'success', title }: { message?: string; type?: any; title?: string }) {
  const { showToast } = useToast();
  return (
    <TouchableOpacity testID="trigger" onPress={() => showToast(message, type, title)}>
      <Text>Show Toast</Text>
    </TouchableOpacity>
  );
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>,
  );
}

describe('ToastContext', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders children without showing a toast initially', () => {
    renderWithProviders(<Text testID="child">Child</Text>);
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('shows toast message when showToast is called', () => {
    renderWithProviders(<ToastTrigger message="Task done!" />);
    act(() => { fireEvent.press(screen.getByTestId('trigger')); });
    expect(screen.getByText('Task done!')).toBeTruthy();
  });

  it('shows toast title when provided', () => {
    renderWithProviders(<ToastTrigger message="Done" title="Success!" />);
    act(() => { fireEvent.press(screen.getByTestId('trigger')); });
    expect(screen.getByText('Success!')).toBeTruthy();
  });

  it('hides toast after 3600ms', () => {
    renderWithProviders(<ToastTrigger message="Fading" />);
    act(() => { fireEvent.press(screen.getByTestId('trigger')); });
    expect(screen.getByText('Fading')).toBeTruthy();
    act(() => { jest.advanceTimersByTime(4000); });
    expect(screen.queryByText('Fading')).toBeNull();
  });

  it('throws when useToast is called outside ToastProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    function Bad() {
      useToast();
      return null;
    }
    expect(() => render(<Bad />)).toThrow('useToast must be inside ToastProvider');
    spy.mockRestore();
  });

  it('shows error type toast', () => {
    renderWithProviders(<ToastTrigger message="Failed!" type="error" />);
    act(() => { fireEvent.press(screen.getByTestId('trigger')); });
    expect(screen.getByText('Failed!')).toBeTruthy();
  });
});
