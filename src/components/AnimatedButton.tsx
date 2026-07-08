import { useRef } from 'react';
import {
  AccessibilityRole,
  Animated,
  StyleProp,
  TouchableWithoutFeedback,
  ViewStyle,
} from 'react-native';

interface Props {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  activeScale?: number;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityHint?: string;
}

export function AnimatedButton({
  onPress,
  style,
  children,
  disabled = false,
  activeScale = 0.95,
  accessibilityLabel,
  accessibilityRole,
  accessibilityHint,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(scale, {
      toValue: activeScale,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  }

  function onPressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 12,
    }).start();
  }

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityHint={accessibilityHint}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
