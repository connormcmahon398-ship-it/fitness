import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { Button } from '../components/Button';
import { Feedback, formatWeight } from '../lib/stats';
import { formatDuration } from '../lib/format';
import { useTheme } from '../lib/theme-context';
import { WeightUnit } from '../lib/parser';
import { serif, type } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const R = 26;
const CIRC = 2 * Math.PI * R;
const CHECK = 'M20 30.5 L27 37.5 L40.5 23';
const CHECK_LEN = 26;

function CompletionMark() {
  const { palette, reduceMotion } = useTheme();
  const ring = useSharedValue(0);
  const check = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      ring.value = 1;
      check.value = 1;
      return;
    }
    ring.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) });
    check.value = withDelay(420, withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) }));
  }, [reduceMotion, ring, check]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC * (1 - ring.value),
  }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LEN * (1 - check.value),
  }));

  return (
    <Svg width={60} height={60} viewBox="0 0 60 60">
      <AnimatedCircle
        cx={30}
        cy={30}
        r={R}
        stroke={palette.accent}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={CIRC}
        animatedProps={ringProps}
        transform="rotate(-90 30 30)"
      />
      <AnimatedPath
        d={CHECK}
        stroke={palette.accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={CHECK_LEN}
        animatedProps={checkProps}
      />
    </Svg>
  );
}

interface Props {
  feedback: Feedback;
  unit: WeightUnit;
  onDone: () => void;
}

export function Summary({ feedback, unit, onDone }: Props) {
  const { palette, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();

  const d = (ms: number) => (reduceMotion ? undefined : FadeInUp.duration(420).delay(ms));

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: palette.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <View style={styles.body}>
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(400)}>
          <CompletionMark />
        </Animated.View>

        <Animated.Text entering={d(500)} style={[styles.headline, { color: palette.text }]}>
          {feedback.headline}
        </Animated.Text>

        <View style={styles.lines}>
          {feedback.lines.map((line, i) => (
            <Animated.Text
              key={line}
              entering={d(700 + i * 110)}
              style={[styles.line, { color: palette.text2 }]}
            >
              {line}
            </Animated.Text>
          ))}
        </View>

        <Animated.View entering={d(760 + feedback.lines.length * 110)} style={styles.metaRow}>
          {feedback.durationMin !== null && (
            <View style={styles.metaItem}>
              <Text style={[styles.metaValue, { color: palette.text }, type.mono]}>
                {formatDuration(feedback.durationMin)}
              </Text>
              <Text style={[styles.metaLabel, { color: palette.text3 }]}>duration</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Text style={[styles.metaValue, { color: palette.text }, type.mono]}>
              {feedback.totalSets}
            </Text>
            <Text style={[styles.metaLabel, { color: palette.text3 }]}>sets</Text>
          </View>
          {feedback.totalVolume > 0 && (
            <View style={styles.metaItem}>
              <Text style={[styles.metaValue, { color: palette.text }, type.mono]}>
                {formatWeight(Math.round(feedback.totalVolume))} {unit}
              </Text>
              <Text style={[styles.metaLabel, { color: palette.text3 }]}>volume</Text>
            </View>
          )}
        </Animated.View>
      </View>

      <Animated.View
        entering={reduceMotion ? undefined : FadeInUp.duration(420).delay(1100)}
        style={styles.footer}
      >
        <Button label="Done" onPress={onDone} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 32 },
  body: { flex: 1, justifyContent: 'center' },
  headline: {
    fontFamily: serif,
    fontSize: 30,
    lineHeight: 38,
    marginTop: 28,
    letterSpacing: 0.2,
  },
  lines: { marginTop: 20, gap: 10 },
  line: { fontSize: 16, lineHeight: 23 },
  metaRow: {
    flexDirection: 'row',
    gap: 36,
    marginTop: 40,
  },
  metaItem: { gap: 3 },
  metaValue: { fontSize: 17, fontWeight: '600' },
  metaLabel: { fontSize: 12, letterSpacing: 0.4 },
  footer: { alignItems: 'center' },
});
