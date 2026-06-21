import { ReactNode, useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { motion } from '../../constants/motion';

type AnimatedPressableProps = PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  pressedScale?: number;
};

export function AnimatedPressable({
  children,
  style,
  containerStyle,
  pressedScale = motion.pressScale,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function animateScale(toValue: number) {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: motion.spring.speed,
      bounciness: motion.spring.bounciness,
    }).start();
  }

  function handlePressIn(event: GestureResponderEvent) {
    if (!disabled) {
      animateScale(pressedScale);
    }

    onPressIn?.(event);
  }

  function handlePressOut(event: GestureResponderEvent) {
    animateScale(1);
    onPressOut?.(event);
  }

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale }],
          opacity: disabled ? 0.55 : 1,
        },
        containerStyle,
      ]}
    >
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
