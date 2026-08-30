import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './PressableScale';
import { useTheme } from '../lib/theme-context';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

/** A quiet segmented control — hairline pill, no fills except the active tint. */
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const { palette } = useTheme();
  return (
    <View style={[styles.wrap, { borderColor: palette.border }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <PressableScale
            key={opt.value}
            scaleTo={0.96}
            dim={false}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) {
                Haptics.selectionAsync().catch(() => {});
                onChange(opt.value);
              }
            }}
            style={[
              styles.segment,
              active && { backgroundColor: palette.accentSoft },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? palette.text : palette.text2 },
                active && styles.labelActive,
              ]}
            >
              {opt.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 9,
    padding: 2,
    alignSelf: 'flex-start',
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 7,
  },
  label: { fontSize: 14 },
  labelActive: { fontWeight: '600' },
});
