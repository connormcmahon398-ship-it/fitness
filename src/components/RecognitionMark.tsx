import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../lib/theme-context';
import { motion } from '../theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// A short check stroke inside a 12×12 box.
const CHECK = 'M2.5 6.5 L5 9 L9.5 3.5';
const CHECK_LENGTH = 12;

/**
 * The tiny end-of-line confirmation: a dot springs in, then a check draws
 * itself through it. Quiet enough not to interrupt typing.
 */
export function RecognitionMark({ recognized }: { recognized: boolean }) {
  const { palette, reduceMotion } = useTheme();
  const scale = useSharedValue(0);
  const draw = useSharedValue(0);

  useEffect(() => {
    if (recognized) {
      if (reduceMotion) {
        scale.value = 1;
        draw.value = 1;
      } else {
        scale.value = withSpring(1, { damping: 14, stiffness: 380, mass: 0.6 });
        draw.value = withDelay(
          90,
          withTiming(1, { duration: motion.micro, easing: Easing.out(Easing.cubic) }),
        );
      }
    } else {
      scale.value = reduceMotion ? 0 : withTiming(0, { duration: 120 });
      draw.value = 0;
    }
  }, [recognized, reduceMotion, scale, draw]);

  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  const pathProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - draw.value),
  }));

  return (
    <View style={styles.slot} pointerEvents="none">
      <Animated.View style={[styles.ring, { backgroundColor: palette.accentSoft }, ring]}>
        <Svg width={12} height={12} viewBox="0 0 12 12">
          <AnimatedPath
            d={CHECK}
            stroke={palette.accent}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={CHECK_LENGTH}
            animatedProps={pathProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
