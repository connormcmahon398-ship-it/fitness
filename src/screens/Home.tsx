import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PressableScale } from '../components/PressableScale';
import { formatDate, greeting } from '../lib/format';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme-context';
import { Workout } from '../lib/types';
import { serif, type } from '../theme';

interface Props {
  onStart: () => void;
  onOpenWorkout: (w: Workout) => void;
}

function summarize(w: Workout): string {
  const names: string[] = [];
  for (const e of w.entries) {
    if (e.parsed && !names.includes(e.parsed.name)) names.push(e.parsed.name);
  }
  if (names.length === 0) {
    const first = w.entries.find((e) => e.raw.trim() !== '');
    return first ? first.raw.trim() : 'Empty workout';
  }
  return names.join(' · ');
}

function countSets(w: Workout): number {
  return w.entries.reduce((n, e) => n + (e.parsed ? e.parsed.sets ?? 1 : 0), 0);
}

export function Home({ onStart, onOpenWorkout }: Props) {
  const { palette, reduceMotion } = useTheme();
  const { state } = useStore();
  const name = state.profile?.name ?? '';
  const hasActive = state.active !== null && state.active.entries.some((e) => e.raw.trim() !== '');
  const activeCount = hasActive
    ? state.active!.entries.filter((e) => e.raw.trim() !== '').length
    : 0;

  return (
    <ScrollView
      style={{ backgroundColor: palette.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(420)}>
        <Text style={[styles.greeting, { color: palette.text2 }]}>{greeting()},</Text>
        <Text style={[styles.name, { color: palette.text }]}>{name}</Text>
      </Animated.View>

      <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(420).delay(90)}>
        <PressableScale
          scaleTo={0.98}
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel={hasActive ? 'Continue workout' : 'Start workout'}
          style={[styles.startRow, { borderColor: palette.borderStrong }]}
        >
          <View>
            <Text style={[styles.startText, { color: palette.text }]}>
              {hasActive ? 'Continue workout' : 'Start workout'}
            </Text>
            {hasActive && (
              <Text style={[styles.startSub, { color: palette.text2 }]}>
                {activeCount} {activeCount === 1 ? 'line' : 'lines'} in progress
              </Text>
            )}
          </View>
          <View style={[styles.startDot, { backgroundColor: palette.accent }]} />
        </PressableScale>
      </Animated.View>

      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(420).delay(180)}
        style={styles.recentSection}
      >
        <Text style={[type.label, { color: palette.text3 }]}>Recent</Text>
        {state.workouts.length === 0 ? (
          <Text style={[styles.empty, { color: palette.text3 }]}>
            Your completed workouts will appear here.
          </Text>
        ) : (
          <View style={styles.list}>
            {state.workouts.slice(0, 12).map((w, i) => {
              const sets = countSets(w);
              return (
                <PressableScale
                  key={w.id}
                  scaleTo={0.985}
                  onPress={() => onOpenWorkout(w)}
                  accessibilityRole="button"
                  accessibilityLabel={`Workout, ${formatDate(w.completedAt ?? w.startedAt)}`}
                  style={[
                    styles.row,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border },
                  ]}
                >
                  <View style={styles.rowMain}>
                    <Text style={[styles.rowDate, { color: palette.text }]}>
                      {formatDate(w.completedAt ?? w.startedAt)}
                    </Text>
                    <Text
                      style={[styles.rowSummary, { color: palette.text2 }]}
                      numberOfLines={1}
                    >
                      {summarize(w)}
                    </Text>
                  </View>
                  {sets > 0 && (
                    <Text style={[styles.rowMeta, { color: palette.text3 }, type.mono]}>
                      {sets} sets
                    </Text>
                  )}
                </PressableScale>
              );
            })}
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
  },
  greeting: { fontSize: 16 },
  name: {
    fontFamily: serif,
    fontSize: 32,
    marginTop: 3,
    letterSpacing: 0.2,
  },
  startRow: {
    marginTop: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  startText: { fontSize: 17, fontWeight: '600', letterSpacing: 0.1 },
  startSub: { fontSize: 13.5, marginTop: 3 },
  startDot: { width: 7, height: 7, borderRadius: 3.5 },
  recentSection: { marginTop: 44 },
  empty: { marginTop: 16, fontSize: 15, lineHeight: 22 },
  list: { marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 12,
  },
  rowMain: { flex: 1 },
  rowDate: { fontSize: 16, fontWeight: '500' },
  rowSummary: { fontSize: 14, marginTop: 3 },
  rowMeta: { fontSize: 13 },
});
