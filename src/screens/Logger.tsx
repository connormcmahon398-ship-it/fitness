import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { PressableScale } from '../components/PressableScale';
import { RecognitionMark } from '../components/RecognitionMark';
import { formatDate, formatDuration } from '../lib/format';
import { parseLine } from '../lib/parser';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme-context';
import { Entry, uid } from '../lib/types';
import { motion } from '../theme';

interface LineState extends Entry {
  /** The line has been committed with Enter (or blur) — show the mark. */
  committed: boolean;
}

interface Props {
  onClose: () => void;
  onComplete: () => void;
  /** Set right after onboarding — the editor greets with "Start typing." */
  firstRun?: boolean;
}

function toLines(entries: Entry[]): LineState[] {
  const lines = entries.map((e) => ({ ...e, committed: true }));
  if (lines.length === 0 || lines[lines.length - 1].raw.trim() !== '') {
    lines.push({ id: uid(), raw: '', parsed: null, committed: false });
  }
  return lines;
}

export function Logger({ onClose, onComplete, firstRun = false }: Props) {
  const { palette, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useStore();
  const active = state.active;

  const [lines, setLines] = useState<LineState[]>(() => toLines(active?.entries ?? []));
  const inputRefs = useRef(new Map<string, TextInput>());
  const scrollRef = useRef<ScrollView>(null);
  const [, forceTick] = useState(0);

  // Persist lines into the store whenever they change.
  useEffect(() => {
    dispatch({
      type: 'setEntries',
      entries: lines.map(({ id, raw, parsed }) => ({ id, raw, parsed })),
    });
  }, [lines, dispatch]);

  // Elapsed time ticks quietly in the header.
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const last = lines[lines.length - 1];
    const t = setTimeout(
      () => last && inputRefs.current.get(last.id)?.focus(),
      reduceMotion ? 80 : 380,
    );
    return () => clearTimeout(t);
    // Focus only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRaw = useCallback((id: string, raw: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, raw, parsed: parseLine(raw) } : l)),
    );
  }, []);

  const commitLine = useCallback(
    (id: string) => {
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx === -1) return prev;
        const line = prev[idx];
        if (line.raw.trim() === '') return prev; // Enter on an empty line does nothing.
        const next = prev.map((l, i) => (i === idx ? { ...l, committed: true } : l));
        if (line.parsed) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        let focusId: string;
        if (idx === prev.length - 1) {
          const fresh: LineState = { id: uid(), raw: '', parsed: null, committed: false };
          next.push(fresh);
          focusId = fresh.id;
        } else {
          focusId = prev[idx + 1].id;
        }
        requestAnimationFrame(() => {
          inputRefs.current.get(focusId)?.focus();
          scrollRef.current?.scrollToEnd({ animated: !reduceMotion });
        });
        return next;
      });
    },
    [reduceMotion],
  );

  const handleBackspaceOnEmpty = useCallback((id: string) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx <= 0 || prev[idx].raw !== '') return prev;
      const next = prev.filter((l) => l.id !== id);
      const prevLine = next[idx - 1];
      requestAnimationFrame(() => {
        const input = inputRefs.current.get(prevLine.id);
        input?.focus();
      });
      return next;
    });
  }, []);

  const recognizedCount = useMemo(
    () => lines.filter((l) => l.parsed !== null).length,
    [lines],
  );
  const hasContent = lines.some((l) => l.raw.trim() !== '');

  const complete = useCallback(() => {
    if (!hasContent) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onComplete();
  }, [hasContent, onComplete]);

  const discard = useCallback(() => {
    dispatch({ type: 'discardWorkout' });
    onClose();
  }, [dispatch, onClose]);

  const elapsedMin = active ? Math.floor((Date.now() - active.startedAt) / 60000) : 0;

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <PressableScale
          scaleTo={0.94}
          hitSlop={12}
          onPress={hasContent ? onClose : discard}
          accessibilityRole="button"
          accessibilityLabel={hasContent ? 'Close, keep workout' : 'Close'}
        >
          <Text style={[styles.headerAction, { color: palette.text2 }]}>Close</Text>
        </PressableScale>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: palette.text }]}>
            {active ? formatDate(active.startedAt) : 'Workout'}
          </Text>
          {elapsedMin > 0 && (
            <Text style={[styles.headerSub, { color: palette.text3 }]}>
              {formatDuration(elapsedMin)}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {hasContent && (
            <PressableScale
              scaleTo={0.94}
              hitSlop={12}
              onPress={discard}
              accessibilityRole="button"
              accessibilityLabel="Discard workout"
            >
              <Text style={[styles.headerAction, { color: palette.text3 }]}>Discard</Text>
            </PressableScale>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="interactive"
        >
          {lines.map((line, i) => (
            <Animated.View
              key={line.id}
              layout={reduceMotion ? undefined : LinearTransition.duration(motion.micro)}
              entering={
                i === 0 || reduceMotion ? undefined : FadeInDown.duration(motion.micro)
              }
              style={styles.lineRow}
            >
              <TextInput
                ref={(r) => {
                  if (r) inputRefs.current.set(line.id, r);
                  else inputRefs.current.delete(line.id);
                }}
                value={line.raw}
                onChangeText={(t) => setRaw(line.id, t)}
                onSubmitEditing={() => commitLine(line.id)}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace' && line.raw === '') {
                    handleBackspaceOnEmpty(line.id);
                  }
                }}
                submitBehavior="submit"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="next"
                placeholder={
                  i === 0 && lines.length === 1
                    ? firstRun
                      ? 'Start typing.'
                      : 'bench press 185 3 sets of 6'
                    : undefined
                }
                placeholderTextColor={palette.text3}
                cursorColor={palette.accent}
                selectionColor={palette.accent}
                style={[styles.lineInput, { color: palette.text }]}
                accessibilityLabel={`Workout line ${i + 1}`}
              />
              <RecognitionMark recognized={line.committed && line.parsed !== null} />
            </Animated.View>
          ))}

          {lines.length === 1 && lines[0].raw === '' && !firstRun && (
            <Animated.Text
              entering={reduceMotion ? undefined : FadeIn.delay(600).duration(500)}
              style={[styles.hint, { color: palette.text3 }]}
            >
              Type each exercise on its own line — “bench 185 3x6” works too.
            </Animated.Text>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { borderTopColor: palette.border, paddingBottom: Math.max(insets.bottom, 14) },
          ]}
        >
          <Text style={[styles.footerMeta, { color: palette.text3 }]}>
            {recognizedCount > 0
              ? `${recognizedCount} ${recognizedCount === 1 ? 'exercise' : 'exercises'}`
              : ' '}
          </Text>
          <PressableScale
            scaleTo={0.96}
            disabled={!hasContent}
            onPress={complete}
            accessibilityRole="button"
            accessibilityLabel="Complete workout"
            style={[
              styles.completeBtn,
              { borderColor: palette.borderStrong },
              !hasContent && { opacity: 0.25 },
            ]}
          >
            <Text style={[styles.completeText, { color: palette.text }]}>Complete Workout</Text>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerAction: { fontSize: 15 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '600' },
  headerSub: { fontSize: 12, marginTop: 1, fontVariant: ['tabular-nums'] },
  headerRight: { minWidth: 44, alignItems: 'flex-end' },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 40,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineInput: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 8,
    ...(Platform.OS === 'android' ? { lineHeight: 24 } : null),
  },
  hint: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 21,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerMeta: { fontSize: 13, fontVariant: ['tabular-nums'] },
  completeBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  completeText: { fontSize: 15, fontWeight: '600', letterSpacing: 0.1 },
});
