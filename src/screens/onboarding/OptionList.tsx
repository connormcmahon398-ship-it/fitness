import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { PressableScale } from '../../components/PressableScale';
import { useTheme } from '../../lib/theme-context';
import { motion } from '../../theme';

interface Props {
  options: string[];
  /** Called after the selection animation settles. */
  onSelect: (value: string) => void;
  initial?: string | null;
}

function Check({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Path
        d="M2.5 7.5 L5.6 10.5 L11.5 3.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function Row({
  label,
  index,
  state,
  onPress,
}: {
  label: string;
  index: number;
  state: 'idle' | 'selected' | 'faded';
  onPress: () => void;
}) {
  const { palette, reduceMotion } = useTheme();
  const emphasis = useSharedValue(0);

  React.useEffect(() => {
    const target = state === 'selected' ? 1 : state === 'faded' ? -1 : 0;
    emphasis.value = reduceMotion
      ? withTiming(target, { duration: 0 })
      : withSpring(target, motion.springSoft);
  }, [state, reduceMotion, emphasis]);

  const anim = useAnimatedStyle(() => ({
    opacity: emphasis.value < 0 ? 1 + emphasis.value * 0.72 : 1,
    transform: [{ scale: 1 + Math.max(0, emphasis.value) * 0.015 }],
  }));

  const selected = state === 'selected';

  return (
    <Animated.View
      entering={
        reduceMotion ? undefined : FadeInDown.duration(motion.minor).delay(60 + index * 55)
      }
      style={anim}
    >
      <PressableScale
        scaleTo={0.975}
        dim={false}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={[
          styles.row,
          {
            borderColor: selected ? palette.borderStrong : palette.border,
            backgroundColor: selected ? palette.accentSoft : 'transparent',
          },
        ]}
      >
        <Text
          style={[
            styles.rowText,
            { color: palette.text },
            selected && { fontWeight: '600' },
          ]}
        >
          {label}
        </Text>
        {selected && (
          <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(160)}>
            <Check color={palette.accent} />
          </Animated.View>
        )}
      </PressableScale>
    </Animated.View>
  );
}

/**
 * Onboarding option list. Selecting an option emphasizes it, fades the rest,
 * then advances after a beat — one continuous gesture, no separate Continue.
 */
export function OptionList({ options, onSelect, initial = null }: Props) {
  const [chosen, setChosen] = useState<string | null>(initial);
  const [locked, setLocked] = useState(false);
  const { reduceMotion } = useTheme();

  const choose = (value: string) => {
    if (locked) return;
    setLocked(true);
    setChosen(value);
    Haptics.selectionAsync().catch(() => {});
    setTimeout(() => onSelect(value), reduceMotion ? 80 : 480);
  };

  return (
    <View style={styles.list}>
      {options.map((opt, i) => (
        <Row
          key={opt}
          label={opt}
          index={i}
          state={chosen === null ? 'idle' : chosen === opt ? 'selected' : 'faded'}
          onPress={() => choose(opt)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowText: { fontSize: 16.5 },
});
