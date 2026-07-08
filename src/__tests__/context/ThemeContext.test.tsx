import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';

function ThemeConsumer() {
  const { colors, isDark, toggleTheme } = useTheme();
  return (
    <>
      <Text testID="dark-mode">{isDark ? 'dark' : 'light'}</Text>
      <Text testID="bg-color">{colors.bg}</Text>
      <TouchableOpacity testID="toggle" onPress={toggleTheme}>
        <Text>Toggle</Text>
      </TouchableOpacity>
    </>
  );
}

describe('ThemeContext', () => {
  it('starts in light mode by default', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('dark-mode').props.children).toBe('light');
  });

  it('provides color palette to consumers', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    const bg = screen.getByTestId('bg-color').props.children;
    expect(typeof bg).toBe('string');
    expect(bg.length).toBeGreaterThan(0);
  });

  it('toggles to dark mode when toggleTheme is called', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('dark-mode').props.children).toBe('light');
    fireEvent.press(screen.getByTestId('toggle'));
    expect(screen.getByTestId('dark-mode').props.children).toBe('dark');
  });

  it('toggles back to light mode on second toggle', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByTestId('toggle'));
    fireEvent.press(screen.getByTestId('toggle'));
    expect(screen.getByTestId('dark-mode').props.children).toBe('light');
  });

  it('throws when useTheme is called outside ThemeProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow('useTheme must be used within ThemeProvider');
    spy.mockRestore();
  });
});
