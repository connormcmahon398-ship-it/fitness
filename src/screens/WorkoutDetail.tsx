import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../components/PressableScale';
import { describeParsed } from '../lib/parser';
import { formatDate, formatDuration, formatTime } from '../lib/format';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme-context';
import { Workout } from '../lib/types';
import { serif, type } from '../theme';

interface Props {
  workout: Workout;
  onClose: () => void;
}

export function WorkoutDetail({ workout, onClose }: Props) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useStore();
  const unit = state.settings.weightUnit;

  const durationMin =
    workout.completedAt !== null
      ? Math.max(1, Math.round((workout.completedAt - workout.startedAt) / 60000))
      : null;

  const confirmDelete = () => {
    Alert.alert('Delete workout?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'deleteWorkout', id: workout.id });
          onClose();
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <PressableScale scaleTo={0.94} hitSlop={12} onPress={onClose} accessibilityRole="button">
          <Text style={[styles.headerAction, { color: palette.text2 }]}>Close</Text>
        </PressableScale>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: palette.text }]}>
          {formatDate(workout.completedAt ?? workout.startedAt)}
        </Text>
        <Text style={[styles.subtitle, { color: palette.text3 }]}>
          {formatTime(workout.startedAt)}
          {durationMin !== null ? ` · ${formatDuration(durationMin)}` : ''}
        </Text>

        <View style={styles.lines}>
          {workout.entries.map((e) => (
            <View key={e.id} style={styles.line}>
              <Text style={[styles.raw, { color: palette.text }]}>{e.raw}</Text>
              {e.parsed && (
                <Text style={[styles.parsed, { color: palette.text2 }, type.mono]}>
                  {e.parsed.name}
                  {describeParsed(e.parsed, unit) ? `   ${describeParsed(e.parsed, unit)}` : ''}
                </Text>
              )}
            </View>
          ))}
        </View>

        <PressableScale
          scaleTo={0.97}
          onPress={confirmDelete}
          accessibilityRole="button"
          style={styles.deleteBtn}
        >
          <Text style={[styles.deleteText, { color: palette.danger }]}>Delete workout</Text>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 6,
  },
  headerAction: { fontSize: 15 },
  content: { paddingHorizontal: 24, paddingTop: 14 },
  title: { fontFamily: serif, fontSize: 28, letterSpacing: 0.2 },
  subtitle: { fontSize: 13.5, marginTop: 5 },
  lines: { marginTop: 28, gap: 16 },
  line: { gap: 3 },
  raw: { fontSize: 17, lineHeight: 24 },
  parsed: { fontSize: 13 },
  deleteBtn: { marginTop: 48, alignSelf: 'flex-start' },
  deleteText: { fontSize: 15 },
});
