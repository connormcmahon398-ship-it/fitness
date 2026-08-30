import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LineChart } from '../components/LineChart';
import { PressableScale } from '../components/PressableScale';
import { formatShortDate } from '../lib/format';
import {
  buildSeries,
  formatWeight,
  recentImprovements,
  totalVolumeByWorkout,
  weeklyConsistency,
} from '../lib/stats';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme-context';
import { serif, type } from '../theme';

export function Growth() {
  const { palette, reduceMotion } = useTheme();
  const { state } = useStore();
  const unit = state.settings.weightUnit;

  const series = useMemo(
    () => buildSeries(state.workouts, unit),
    [state.workouts, unit],
  );

  const exercises = useMemo(
    () =>
      [...series.values()]
        .filter((s) => s.points.some((p) => p.topWeight !== null))
        .sort((a, b) => b.totalSessions - a.totalSessions),
    [series],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected =
    exercises.find((s) => s.key === selectedKey) ?? (exercises.length > 0 ? exercises[0] : null);

  const volumePoints = useMemo(
    () =>
      totalVolumeByWorkout(state.workouts, unit)
        .filter((p) => p.volume > 0)
        .map((p) => ({ date: p.date, value: Math.round(p.volume) })),
    [state.workouts, unit],
  );

  const weeks = useMemo(() => weeklyConsistency(state.workouts), [state.workouts]);
  const improvements = useMemo(
    () => recentImprovements(state.workouts, unit),
    [state.workouts, unit],
  );

  const totalWorkouts = state.workouts.length;
  const thisWeek = weeks[weeks.length - 1]?.count ?? 0;
  const maxWeek = Math.max(1, ...weeks.map((w) => w.count));

  const weightPoints = selected
    ? selected.points
        .filter((p) => p.topWeight !== null)
        .map((p) => ({ date: p.date, value: p.topWeight as number }))
    : [];
  const repPoints = selected
    ? selected.points
        .filter((p) => p.reps !== null)
        .map((p) => ({ date: p.date, value: p.reps as number }))
    : [];

  if (totalWorkouts === 0) {
    return (
      <View style={[styles.emptyRoot, { backgroundColor: palette.bg }]}>
        <Text style={[styles.title, { color: palette.text }]}>Growth</Text>
        <Text style={[styles.emptyText, { color: palette.text3 }]}>
          Complete a few workouts and your progress will take shape here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: palette.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: palette.text }]}>Growth</Text>

      {exercises.length > 0 && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.selector}
            contentContainerStyle={styles.selectorContent}
          >
            {exercises.map((s) => {
              const active = selected?.key === s.key;
              return (
                <PressableScale
                  key={s.key}
                  scaleTo={0.96}
                  dim={false}
                  onPress={() => setSelectedKey(s.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={styles.selectorItem}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      { color: active ? palette.text : palette.text3 },
                      active && { fontWeight: '600' },
                    ]}
                  >
                    {s.name}
                  </Text>
                  <View
                    style={[
                      styles.selectorUnderline,
                      { backgroundColor: active ? palette.accent : 'transparent' },
                    ]}
                  />
                </PressableScale>
              );
            })}
          </ScrollView>

          {selected && (
            <Animated.View
              key={selected.key}
              entering={reduceMotion ? undefined : FadeIn.duration(280)}
            >
              <View style={styles.numbersRow}>
                <View>
                  <Text style={[styles.number, { color: palette.text }, type.mono]}>
                    {selected.current !== null ? `${formatWeight(selected.current)} ${unit}` : '—'}
                  </Text>
                  <Text style={[styles.numberLabel, { color: palette.text3 }]}>current</Text>
                </View>
                <View>
                  <Text style={[styles.number, { color: palette.text }, type.mono]}>
                    {selected.best !== null ? `${formatWeight(selected.best)} ${unit}` : '—'}
                  </Text>
                  <Text style={[styles.numberLabel, { color: palette.text3 }]}>best</Text>
                </View>
                <View>
                  <Text style={[styles.number, { color: palette.text }, type.mono]}>
                    {selected.totalSessions}
                  </Text>
                  <Text style={[styles.numberLabel, { color: palette.text3 }]}>sessions</Text>
                </View>
              </View>

              {weightPoints.length >= 2 ? (
                <View style={styles.chartBlock}>
                  <LineChart
                    points={weightPoints}
                    formatValue={(v) => `${formatWeight(v)} ${unit}`}
                  />
                </View>
              ) : (
                <Text style={[styles.chartHint, { color: palette.text3 }]}>
                  Log {selected.name.toLowerCase()} again to see its progression.
                </Text>
              )}

              {repPoints.length >= 2 && weightPoints.length >= 2 && (
                <View style={styles.subChart}>
                  <Text style={[type.label, { color: palette.text3 }]}>Reps at top weight</Text>
                  <View style={{ marginTop: 10 }}>
                    <LineChart points={repPoints} height={90} formatValue={(v) => `${v}`} />
                  </View>
                </View>
              )}
            </Animated.View>
          )}
        </>
      )}

      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(360).delay(80)}
        style={styles.section}
      >
        <Text style={[type.label, { color: palette.text3 }]}>Consistency</Text>
        <View style={styles.consistencyRow}>
          {weeks.map((w, i) => (
            <View key={i} style={styles.weekCol}>
              <View style={[styles.weekTrack, { backgroundColor: palette.chartGrid }]}>
                <View
                  style={[
                    styles.weekFill,
                    {
                      backgroundColor: w.count > 0 ? palette.accent : 'transparent',
                      height: `${Math.round((w.count / maxWeek) * 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
        <View style={styles.consistencyMeta}>
          <Text style={[styles.metaText, { color: palette.text2 }]}>
            {thisWeek === 0
              ? 'No workouts yet this week'
              : `${thisWeek} ${thisWeek === 1 ? 'workout' : 'workouts'} this week`}
          </Text>
          <Text style={[styles.metaText, { color: palette.text3 }, type.mono]}>
            {totalWorkouts} total
          </Text>
        </View>
      </Animated.View>

      {volumePoints.length >= 2 && (
        <View style={styles.section}>
          <Text style={[type.label, { color: palette.text3 }]}>Volume per session</Text>
          <View style={{ marginTop: 10 }}>
            <LineChart
              points={volumePoints}
              height={110}
              formatValue={(v) => `${v.toLocaleString()} ${unit}`}
            />
          </View>
        </View>
      )}

      {improvements.length > 0 && (
        <View style={styles.section}>
          <Text style={[type.label, { color: palette.text3 }]}>Recent improvements</Text>
          <View style={styles.improvementList}>
            {improvements.map((imp, i) => (
              <View
                key={`${imp.name}-${imp.when}`}
                style={[
                  styles.improvementRow,
                  i > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: palette.border,
                  },
                ]}
              >
                <View style={styles.improvementMain}>
                  <Text style={[styles.improvementName, { color: palette.text }]}>{imp.name}</Text>
                  <Text style={[styles.improvementDetail, { color: palette.positive }, type.mono]}>
                    {imp.detail}
                  </Text>
                </View>
                <Text style={[styles.improvementDate, { color: palette.text3 }]}>
                  {formatShortDate(imp.when)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 56,
  },
  emptyRoot: { flex: 1, paddingHorizontal: 24, paddingTop: 28 },
  title: { fontFamily: serif, fontSize: 32, letterSpacing: 0.2 },
  emptyText: { marginTop: 18, fontSize: 15, lineHeight: 22, maxWidth: 280 },
  selector: { marginTop: 24, marginHorizontal: -24 },
  selectorContent: { paddingHorizontal: 24, gap: 20 },
  selectorItem: { alignItems: 'center', paddingVertical: 4 },
  selectorText: { fontSize: 15 },
  selectorUnderline: {
    height: 2,
    borderRadius: 1,
    alignSelf: 'stretch',
    marginTop: 5,
  },
  numbersRow: {
    flexDirection: 'row',
    gap: 36,
    marginTop: 26,
  },
  number: { fontSize: 20, fontWeight: '600' },
  numberLabel: { fontSize: 12, marginTop: 3, letterSpacing: 0.4 },
  chartBlock: { marginTop: 22 },
  chartHint: { marginTop: 22, fontSize: 14, lineHeight: 21 },
  subChart: { marginTop: 28 },
  section: { marginTop: 42 },
  consistencyRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    height: 44,
    alignItems: 'flex-end',
  },
  weekCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  weekTrack: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  weekFill: { borderRadius: 2 },
  consistencyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metaText: { fontSize: 13.5 },
  improvementList: { marginTop: 8 },
  improvementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  improvementMain: { flex: 1 },
  improvementName: { fontSize: 15.5, fontWeight: '500' },
  improvementDetail: { fontSize: 13.5, marginTop: 2 },
  improvementDate: { fontSize: 13 },
});
