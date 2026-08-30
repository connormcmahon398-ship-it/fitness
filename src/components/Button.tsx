import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, ViewStyle, StyleProp } from 'react-native';
import { PressableScale } from './PressableScale';
import { useTheme } from '../lib/theme-context';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** 'quiet' = hairline border; 'ghost' = text only. */
  variant?: 'quiet' | 'ghost';
  tone?: 'default' | 'accent' | 'danger';
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
}

/** The app's button: hairline border, tactile press, no heavy fills. */
export function Button({
  label,
  onPress,
  disabled,
  variant = 'quiet',
  tone = 'default',
  style,
  haptic = true,
}: Props) {
  const { palette } = useTheme();
  const color =
    tone === 'accent' ? palette.accent : tone === 'danger' ? palette.danger : palette.text;
  return (
    <PressableScale
      scaleTo={0.965}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={[
        styles.base,
        variant === 'quiet' && { borderWidth: StyleSheet.hairlineWidth, borderColor: palette.borderStrong },
        disabled && { opacity: 0.3 },
        style,
      ]}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
