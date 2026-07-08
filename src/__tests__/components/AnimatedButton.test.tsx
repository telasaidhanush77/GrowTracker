import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AnimatedButton } from '../../components/AnimatedButton';

describe('AnimatedButton', () => {
  it('renders children', () => {
    render(
      <AnimatedButton onPress={jest.fn()}>
        <Text>Click Me</Text>
      </AnimatedButton>,
    );
    expect(screen.getByText('Click Me')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(
      <AnimatedButton onPress={onPress}>
        <Text>Press</Text>
      </AnimatedButton>,
    );
    fireEvent.press(screen.getByText('Press'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(
      <AnimatedButton onPress={onPress} disabled>
        <Text>Disabled</Text>
      </AnimatedButton>,
    );
    fireEvent.press(screen.getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('passes accessibilityLabel to the touchable', () => {
    render(
      <AnimatedButton onPress={jest.fn()} accessibilityLabel="Submit form">
        <Text>Submit</Text>
      </AnimatedButton>,
    );
    expect(screen.getByLabelText('Submit form')).toBeTruthy();
  });

  it('renders with custom children', () => {
    render(
      <AnimatedButton onPress={jest.fn()}>
        <Text testID="child-a">A</Text>
        <Text testID="child-b">B</Text>
      </AnimatedButton>,
    );
    expect(screen.getByTestId('child-a')).toBeTruthy();
    expect(screen.getByTestId('child-b')).toBeTruthy();
  });
});
