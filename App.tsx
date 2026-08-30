import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { PressableScale } from './src/components/PressableScale';
import { StoreProvider, useStore } from './src/lib/store';
import { ThemeProvider, useTheme } from './src/lib/theme-context';
import { buildFeedback, Feedback } from './src/lib/stats';
import { Profile, Settings as SettingsType, Workout } from './src/lib/types';
import { dark, light, motion } from './src/theme';
import { Growth } from './src/screens/Growth';
import { Home } from './src/screens/Home';
import { Logger } from './src/screens/Logger';
import { Onboarding } from './src/screens/onboarding/Onboarding';
import { Settings } from './src/screens/Settings';
import { Summary } from './src/screens/Summary';
import { WorkoutDetail } from './src/screens/WorkoutDetail';

type Tab = 'home' | 'growth' | 'settings';

type Overlay =
  | { kind: 'logger'; firstRun: boolean }
  | { kind: 'summary'; feedback: Feedback }
  | { kind: 'detail'; workout: Workout }
  | null;

const TABS: { key: Tab; label: string }[] = [
  { key: 'home', label: 'Today' },
  { key: 'growth', label: 'Growth' },
  { key: 'settings', label: 'Settings' },
];

function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.tabBar,
        {
          borderTopColor: palette.border,
          backgroundColor: palette.bg,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      {TABS.map((t) => {
        const active = t.key === tab;
        return (
          <PressableScale
            key={t.key}
            scaleTo={0.94}
            dim={false}
            onPress={() => onChange(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={styles.tabItem}
          >
            <View
              style={[
                styles.tabDot,
                { backgroundColor: active ? palette.accent : 'transparent' },
              ]}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: active ? palette.text : palette.text3 },
                active && { fontWeight: '600' },
              ]}
            >
              {t.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

function Root() {
  const { state, dispatch } = useStore();
  const { palette, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('home');
  const [overlay, setOverlay] = useState<Overlay>(null);

  const openLogger = useCallback(
    (firstRun = false) => {
      dispatch({ type: 'startWorkout' });
      setOverlay({ kind: 'logger', firstRun });
    },
    [dispatch],
  );

  const finishOnboarding = useCallback(
    (profile: Profile, settings: Partial<SettingsType>) => {
      dispatch({ type: 'completeOnboarding', profile, settings });
      openLogger(true);
    },
    [dispatch, openLogger],
  );

  const completeWorkout = useCallback(() => {
    if (!state.active) return;
    const completed: Workout = {
      ...state.active,
      completedAt: Date.now(),
      entries: state.active.entries.filter((e) => e.raw.trim() !== ''),
    };
    const feedback = buildFeedback(completed, state.workouts, state.settings.weightUnit);
    dispatch({ type: 'completeWorkout' });
    setOverlay({ kind: 'summary', feedback });
  }, [state.active, state.workouts, state.settings.weightUnit, dispatch]);

  if (!state.hydrated) {
    return <View style={{ flex: 1, backgroundColor: palette.bg }} />;
  }

  if (!state.profile) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        <Onboarding onDone={finishOnboarding} />
        {overlay?.kind === 'logger' && (
          <Animated.View
            style={StyleSheet.absoluteFill}
            entering={reduceMotion ? undefined : FadeIn.duration(motion.major)}
          >
            <Logger
              firstRun={overlay.firstRun}
              onClose={() => setOverlay(null)}
              onComplete={completeWorkout}
            />
          </Animated.View>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: insets.top }}>
      <Animated.View
        key={tab}
        style={styles.tabContent}
        entering={reduceMotion ? undefined : FadeIn.duration(200)}
      >
        {tab === 'home' && (
          <Home
            onStart={() => openLogger(false)}
            onOpenWorkout={(workout) => setOverlay({ kind: 'detail', workout })}
          />
        )}
        {tab === 'growth' && <Growth />}
        {tab === 'settings' && <Settings />}
      </Animated.View>
      <TabBar tab={tab} onChange={setTab} />

      {overlay?.kind === 'logger' && (
        <Animated.View
          style={StyleSheet.absoluteFill}
          entering={reduceMotion ? undefined : SlideInDown.duration(motion.major)}
          exiting={reduceMotion ? undefined : SlideOutDown.duration(motion.minor)}
        >
          <Logger
            firstRun={overlay.firstRun}
            onClose={() => setOverlay(null)}
            onComplete={completeWorkout}
          />
        </Animated.View>
      )}

      {overlay?.kind === 'summary' && (
        <Animated.View
          style={StyleSheet.absoluteFill}
          entering={reduceMotion ? undefined : FadeIn.duration(motion.minor)}
          exiting={reduceMotion ? undefined : FadeOut.duration(motion.minor)}
        >
          <Summary
            feedback={overlay.feedback}
            unit={state.settings.weightUnit}
            onDone={() => {
              setOverlay(null);
              setTab('home');
            }}
          />
        </Animated.View>
      )}

      {overlay?.kind === 'detail' && (
        <Animated.View
          style={StyleSheet.absoluteFill}
          entering={reduceMotion ? undefined : SlideInDown.duration(motion.minor)}
          exiting={reduceMotion ? undefined : SlideOutDown.duration(motion.minor)}
        >
          <WorkoutDetail workout={overlay.workout} onClose={() => setOverlay(null)} />
        </Animated.View>
      )}
    </View>
  );
}

function ThemedApp() {
  return (
    <ThemeProvider>
      <StatusBarWrapper />
      <Root />
    </ThemeProvider>
  );
}

function StatusBarWrapper() {
  const { palette } = useTheme();
  return <StatusBar style={palette.isDark ? 'light' : 'dark'} />;
}

export default function App() {
  const scheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: (scheme === 'dark' ? dark : light).bg }}>
      <SafeAreaProvider>
        <StoreProvider>
          <ThemedApp />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabContent: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
