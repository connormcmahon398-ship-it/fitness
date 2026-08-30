import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
  FadeOutLeft,
  FadeOutRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '../../components/Button';
import { PressableScale } from '../../components/PressableScale';
import { Segmented } from '../../components/Segmented';
import { WheelPicker } from '../../components/WheelPicker';
import { cmToFtIn, ftInToCm } from '../../lib/format';
import { useTheme } from '../../lib/theme-context';
import { HeightUnit, Profile, Settings } from '../../lib/types';
import { WeightUnit } from '../../lib/parser';
import { motion, serif } from '../../theme';
import { OptionList } from './OptionList';

const EXPERIENCE = ['Just starting', 'Less than 1 year', '1–2 years', '2–4 years', '4+ years'];
const FREQUENCY = ['1–2 days a week', '3 days a week', '4 days a week', '5 days a week', '6+ days a week'];
const GOALS = [
  'Build strength',
  'Build muscle',
  'Improve athletic performance',
  'General fitness',
  'Track my progress',
];
const TRACKING = ['Notes app', 'Spreadsheet', 'Fitness app', "I don't track them", 'Other'];

const QUESTION_COUNT = 7;

type Phase = 'logo' | 'welcome' | 'questions' | 'ready';

interface Draft {
  name: string;
  heightUnit: HeightUnit;
  ft: number;
  inch: number;
  cm: number;
  weightUnit: WeightUnit;
  weight: number;
  experience: string | null;
  frequency: string | null;
  goal: string | null;
  tracking: string | null;
}

interface Props {
  onDone: (profile: Profile, settings: Partial<Settings>) => void;
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const FT = range(3, 7);
const IN = range(0, 11);
const CM = range(120, 220);
const LB = range(70, 400);
const KG = range(35, 180);

export function Onboarding({ onDone }: Props) {
  const { palette, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('logo');
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [draft, setDraft] = useState<Draft>({
    name: '',
    heightUnit: 'ftin',
    ft: 5,
    inch: 10,
    cm: 178,
    weightUnit: 'lb',
    weight: 175,
    experience: null,
    frequency: null,
    goal: null,
    tracking: null,
  });

  const progress = useSharedValue(0);

  useEffect(() => {
    if (phase !== 'logo') return;
    const t = setTimeout(() => setPhase('welcome'), reduceMotion ? 400 : 1600);
    return () => clearTimeout(t);
  }, [phase, reduceMotion]);

  useEffect(() => {
    const target = phase === 'questions' ? (step + 1) / QUESTION_COUNT : phase === 'ready' ? 1 : 0;
    progress.value = withTiming(target, {
      duration: reduceMotion ? 0 : motion.minor,
      easing: Easing.out(Easing.cubic),
    });
  }, [phase, step, progress, reduceMotion]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const advance = useCallback(
    (patch: Partial<Draft>) => {
      setDraft((d) => ({ ...d, ...patch }));
      setDirection(1);
      if (step === QUESTION_COUNT - 1) {
        setPhase('ready');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        setStep((s) => s + 1);
      }
    },
    [step],
  );

  const back = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const finish = useCallback(() => {
    const heightCm = draft.heightUnit === 'cm' ? draft.cm : ftInToCm(draft.ft, draft.inch);
    onDone(
      {
        name: draft.name.trim(),
        heightCm,
        weight: draft.weight,
        experience: draft.experience,
        frequency: draft.frequency,
        goal: draft.goal,
        tracking: draft.tracking,
      },
      { weightUnit: draft.weightUnit, heightUnit: draft.heightUnit },
    );
  }, [draft, onDone]);

  useEffect(() => {
    if (phase !== 'ready') return;
    const t = setTimeout(finish, reduceMotion ? 600 : 1700);
    return () => clearTimeout(t);
  }, [phase, finish, reduceMotion]);

  const enter = direction === 1 ? FadeInRight : FadeInLeft;
  const exit = direction === 1 ? FadeOutLeft : FadeOutRight;
  const enterAnim = reduceMotion
    ? undefined
    : enter.duration(motion.minor).easing(Easing.out(Easing.cubic));
  const exitAnim = reduceMotion ? undefined : exit.duration(220).easing(Easing.in(Easing.cubic));

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
      {phase === 'logo' && (
        <Animated.View
          key="logo"
          style={styles.center}
          exiting={reduceMotion ? undefined : FadeOut.duration(360)}
        >
          <Animated.Text
            entering={
              reduceMotion
                ? undefined
                : FadeIn.duration(800).easing(Easing.out(Easing.quad))
            }
            style={[styles.wordmark, { color: palette.text }]}
          >
            Trace
          </Animated.Text>
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.delay(500).duration(500)}
            style={[styles.wordmarkDot, { backgroundColor: palette.accent }]}
          />
        </Animated.View>
      )}

      {phase === 'welcome' && (
        <Animated.View
          key="welcome"
          style={[styles.center, { paddingHorizontal: 40 }]}
          entering={reduceMotion ? undefined : FadeIn.duration(500)}
          exiting={reduceMotion ? undefined : FadeOut.duration(240)}
        >
          <Animated.Text
            entering={reduceMotion ? undefined : FadeInUp.duration(motion.major).delay(100)}
            style={[styles.welcomeTitle, { color: palette.text }]}
          >
            Let’s get to know your training.
          </Animated.Text>
          <Animated.Text
            entering={reduceMotion ? undefined : FadeInUp.duration(motion.major).delay(300)}
            style={[styles.welcomeSub, { color: palette.text2 }]}
          >
            A few quick questions. No account, no email.
          </Animated.Text>
          <Animated.View
            entering={reduceMotion ? undefined : FadeInUp.duration(motion.major).delay(520)}
            style={{ marginTop: 44 }}
          >
            <Button
              label="Begin"
              onPress={() => {
                setStep(0);
                setPhase('questions');
              }}
            />
          </Animated.View>
        </Animated.View>
      )}

      {phase === 'questions' && (
        <View style={styles.flex}>
          <View style={styles.topBar}>
            <View style={styles.backSlot}>
              {step > 0 && (
                <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(200)}>
                  <PressableScale
                    scaleTo={0.94}
                    onPress={back}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    hitSlop={12}
                  >
                    <Text style={[styles.backText, { color: palette.text2 }]}>Back</Text>
                  </PressableScale>
                </Animated.View>
              )}
            </View>
            <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
              <Animated.View
                style={[styles.progressFill, { backgroundColor: palette.accent }, progressStyle]}
              />
            </View>
            <View style={styles.backSlot} />
          </View>

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Animated.View key={step} style={styles.step} entering={enterAnim} exiting={exitAnim}>
              {step === 0 && (
                <NameStep initial={draft.name} onNext={(name) => advance({ name })} />
              )}
              {step === 1 && (
                <HeightStep
                  draft={draft}
                  onNext={(p) => advance(p)}
                  onChangeDraft={(p) => setDraft((d) => ({ ...d, ...p }))}
                />
              )}
              {step === 2 && (
                <WeightStep
                  draft={draft}
                  onNext={(p) => advance(p)}
                  onChangeDraft={(p) => setDraft((d) => ({ ...d, ...p }))}
                />
              )}
              {step === 3 && (
                <QuestionStep title="How long have you been training?">
                  <OptionList
                    options={EXPERIENCE}
                    initial={draft.experience}
                    onSelect={(experience) => advance({ experience })}
                  />
                </QuestionStep>
              )}
              {step === 4 && (
                <QuestionStep title="How often do you train?">
                  <OptionList
                    options={FREQUENCY}
                    initial={draft.frequency}
                    onSelect={(frequency) => advance({ frequency })}
                  />
                </QuestionStep>
              )}
              {step === 5 && (
                <QuestionStep title="What are you training for?">
                  <OptionList
                    options={GOALS}
                    initial={draft.goal}
                    onSelect={(goal) => advance({ goal })}
                  />
                </QuestionStep>
              )}
              {step === 6 && (
                <QuestionStep title="How do you currently track your workouts?">
                  <OptionList
                    options={TRACKING}
                    initial={draft.tracking}
                    onSelect={(tracking) => advance({ tracking })}
                  />
                </QuestionStep>
              )}
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      )}

      {phase === 'ready' && (
        <Animated.View
          key="ready"
          style={styles.center}
          entering={reduceMotion ? undefined : FadeIn.duration(400)}
          exiting={reduceMotion ? undefined : FadeOut.duration(380)}
        >
          <Animated.Text
            entering={
              reduceMotion ? undefined : FadeInUp.duration(motion.major).delay(150)
            }
            style={[styles.welcomeTitle, { color: palette.text }]}
          >
            You’re ready{draft.name.trim() ? `, ${draft.name.trim()}` : ''}.
          </Animated.Text>
        </Animated.View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------

function QuestionStep({ title, children }: { title: string; children: React.ReactNode }) {
  const { palette, reduceMotion } = useTheme();
  return (
    <View style={styles.flex}>
      <Animated.Text
        entering={reduceMotion ? undefined : FadeInUp.duration(motion.minor)}
        style={[styles.question, { color: palette.text }]}
      >
        {title}
      </Animated.Text>
      <View style={{ marginTop: 32 }}>{children}</View>
    </View>
  );
}

function NameStep({ initial, onNext }: { initial: string; onNext: (name: string) => void }) {
  const { palette, reduceMotion } = useTheme();
  const [name, setName] = useState(initial);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), reduceMotion ? 100 : 420);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  const valid = name.trim().length > 0;

  return (
    <View style={styles.flex}>
      <Animated.Text
        entering={reduceMotion ? undefined : FadeInUp.duration(motion.minor)}
        style={[styles.question, { color: palette.text }]}
      >
        What should we call you?
      </Animated.Text>
      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(motion.minor).delay(120)}
      >
        <TextInput
          ref={inputRef}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={palette.text3}
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => valid && onNext(name)}
          style={[
            styles.nameInput,
            { color: palette.text, borderBottomColor: palette.borderStrong },
          ]}
          accessibilityLabel="Your name"
        />
      </Animated.View>
      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(motion.minor).delay(220)}
        style={styles.stepFooter}
      >
        <Button label="Continue" disabled={!valid} onPress={() => onNext(name)} />
      </Animated.View>
    </View>
  );
}

function HeightStep({
  draft,
  onNext,
  onChangeDraft,
}: {
  draft: Draft;
  onNext: (patch: Partial<Draft>) => void;
  onChangeDraft: (patch: Partial<Draft>) => void;
}) {
  const { palette, reduceMotion } = useTheme();
  const ftin = draft.heightUnit === 'ftin';
  return (
    <View style={styles.flex}>
      <Animated.Text
        entering={reduceMotion ? undefined : FadeInUp.duration(motion.minor)}
        style={[styles.question, { color: palette.text }]}
      >
        How tall are you?
      </Animated.Text>
      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(motion.minor).delay(120)}
        style={{ marginTop: 24, alignItems: 'center' }}
      >
        <Segmented
          options={[
            { value: 'ftin', label: 'ft / in' },
            { value: 'cm', label: 'cm' },
          ]}
          value={draft.heightUnit}
          onChange={(u) => {
            const heightUnit = u as HeightUnit;
            if (heightUnit === draft.heightUnit) return;
            if (heightUnit === 'cm') {
              const cm = Math.min(220, Math.max(120, ftInToCm(draft.ft, draft.inch)));
              onChangeDraft({ heightUnit, cm });
            } else {
              const { ft, inch } = cmToFtIn(draft.cm);
              onChangeDraft({ heightUnit, ft: Math.min(7, Math.max(3, ft)), inch });
            }
          }}
        />
        <View style={styles.wheels}>
          {ftin ? (
            <React.Fragment key="ftin">
              <WheelPicker
                values={FT.map((v) => `${v} ft`)}
                index={Math.max(0, FT.indexOf(draft.ft))}
                onChange={(i) => onChangeDraft({ ft: FT[i] })}
              />
              <WheelPicker
                values={IN.map((v) => `${v} in`)}
                index={Math.max(0, IN.indexOf(draft.inch))}
                onChange={(i) => onChangeDraft({ inch: IN[i] })}
              />
            </React.Fragment>
          ) : (
            <WheelPicker
              key="cm"
              width={140}
              values={CM.map((v) => `${v} cm`)}
              index={Math.max(0, CM.indexOf(draft.cm))}
              onChange={(i) => onChangeDraft({ cm: CM[i] })}
            />
          )}
        </View>
      </Animated.View>
      <View style={styles.stepFooter}>
        <Button label="Continue" onPress={() => onNext({})} />
      </View>
    </View>
  );
}

function WeightStep({
  draft,
  onNext,
  onChangeDraft,
}: {
  draft: Draft;
  onNext: (patch: Partial<Draft>) => void;
  onChangeDraft: (patch: Partial<Draft>) => void;
}) {
  const { palette, reduceMotion } = useTheme();
  const lb = draft.weightUnit === 'lb';
  const values = lb ? LB : KG;
  const index = Math.max(0, values.indexOf(Math.round(draft.weight)));
  return (
    <View style={styles.flex}>
      <Animated.Text
        entering={reduceMotion ? undefined : FadeInUp.duration(motion.minor)}
        style={[styles.question, { color: palette.text }]}
      >
        What’s your current weight?
      </Animated.Text>
      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(motion.minor).delay(120)}
        style={{ marginTop: 24, alignItems: 'center' }}
      >
        <Segmented
          options={[
            { value: 'lb', label: 'lb' },
            { value: 'kg', label: 'kg' },
          ]}
          value={draft.weightUnit}
          onChange={(u) => {
            const unit = u as WeightUnit;
            if (unit === draft.weightUnit) return;
            const converted =
              unit === 'kg' ? Math.round(draft.weight / 2.20462) : Math.round(draft.weight * 2.20462);
            onChangeDraft({ weightUnit: unit, weight: converted });
          }}
        />
        <View style={styles.wheels}>
          <WheelPicker
            key={draft.weightUnit}
            width={150}
            values={values.map((v) => `${v} ${draft.weightUnit}`)}
            index={index}
            onChange={(i) => onChangeDraft({ weight: values[i] })}
          />
        </View>
      </Animated.View>
      <View style={styles.stepFooter}>
        <Button label="Continue" onPress={() => onNext({})} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wordmark: {
    fontFamily: serif,
    fontSize: 44,
    letterSpacing: 1,
  },
  wordmarkDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 14,
  },
  welcomeTitle: {
    fontFamily: serif,
    fontSize: 30,
    lineHeight: 40,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  welcomeSub: {
    fontSize: 16,
    marginTop: 14,
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 6,
    gap: 16,
  },
  backSlot: { width: 44 },
  backText: { fontSize: 15 },
  progressTrack: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: { height: 2, borderRadius: 1 },
  step: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 28,
  },
  question: {
    fontFamily: serif,
    fontSize: 27,
    lineHeight: 36,
    letterSpacing: 0.2,
  },
  nameInput: {
    marginTop: 36,
    fontSize: 24,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepFooter: {
    marginTop: 'auto',
    alignItems: 'flex-end',
  },
  wheels: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
});
