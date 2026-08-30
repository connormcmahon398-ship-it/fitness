import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  SharedValue,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../lib/theme-context';

const ITEM_HEIGHT = 46;
const VISIBLE = 5;

interface Props {
  values: string[];
  index: number;
  onChange: (index: number) => void;
  width?: number;
}

function Item({
  label,
  i,
  scrollY,
  color,
}: {
  label: string;
  i: number;
  scrollY: SharedValue<number>;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const center = scrollY.value / ITEM_HEIGHT;
    const dist = Math.abs(center - i);
    return {
      opacity: interpolate(dist, [0, 1, 2.2], [1, 0.35, 0.08]),
      transform: [{ scale: interpolate(dist, [0, 2], [1, 0.86]) }],
    };
  });
  return (
    <Animated.View style={[styles.item, style]}>
      <Text style={[styles.itemText, { color }]} allowFontScaling={false}>
        {label}
      </Text>
    </Animated.View>
  );
}

/** A quiet snap-scroll wheel for numbers — no chrome, just type and fade. */
export function WheelPicker({ values, index, onChange, width = 110 }: Props) {
  const { palette } = useTheme();
  const scrollY = useSharedValue(index * ITEM_HEIGHT);
  const listRef = useRef<Animated.ScrollView>(null);
  const lastHaptic = useRef(index);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      // Initial position without animation.
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const settle = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.min(
        values.length - 1,
        Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT)),
      );
      if (i !== lastHaptic.current) {
        lastHaptic.current = i;
        Haptics.selectionAsync().catch(() => {});
      }
      onChange(i);
    },
    [onChange, values.length],
  );

  const pad = (ITEM_HEIGHT * (VISIBLE - 1)) / 2;

  return (
    <View style={[styles.wrap, { width, height: ITEM_HEIGHT * VISIBLE }]}>
      <View
        pointerEvents="none"
        style={[
          styles.selection,
          { top: pad, borderColor: palette.border, backgroundColor: palette.accentSoft },
        ]}
      />
      <Animated.ScrollView
        ref={listRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={settle}
        contentContainerStyle={{ paddingVertical: pad }}
      >
        {values.map((v, i) => (
          <Item key={`${v}-${i}`} label={v} i={i} scrollY={scrollY} color={palette.text} />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  selection: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: 10,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 22,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});
