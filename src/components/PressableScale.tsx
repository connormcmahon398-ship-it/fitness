import React from 'react';
import { Pressable, PressableProps, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '../theme';
import { useTheme } from '../lib/theme-context';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends PressableProps {
  style?: StyleProp<ViewStyle>;
  /** How far the press sinks. 0.97 for large surfaces, 0.94 for small ones. */
  scaleTo?: number;
  /** Also dim slightly while pressed. */
  dim?: boolean;
  children?: React.ReactNode;
}

/** A pressable with a tactile spring press — the app's one button primitive. */
export function PressableScale({ style, scaleTo = 0.97, dim = true, children, ...rest }: Props) {
  const { reduceMotion } = useTheme();
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
    opacity: dim ? 1 - pressed.value * 0.25 : 1,
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        pressed.value = reduceMotion
          ? withTiming(1, { duration: 0 })
          : withSpring(1, motion.spring);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = reduceMotion
          ? withTiming(0, { duration: 0 })
          : withSpring(0, motion.spring);
        rest.onPressOut?.(e);
      }}
      style={[style, animStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
