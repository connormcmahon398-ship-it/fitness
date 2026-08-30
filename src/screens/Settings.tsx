import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PressableScale } from '../components/PressableScale';
import { Segmented } from '../components/Segmented';
import { cmToFtIn } from '../lib/format';
import { useResetAll, useStore } from '../lib/store';
import { useTheme } from '../lib/theme-context';
import { HeightUnit } from '../lib/types';
import { WeightUnit } from '../lib/parser';
import { serif, type } from '../theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[type.label, { color: palette.text3 }]}>{title}</Text>
      <View style={[styles.sectionBody, { borderColor: palette.border }]}>{children}</View>
    </View>
  );
}

function Row({
  label,
  children,
  last,
  onPress,
}: {
  label: string;
  children?: React.ReactNode;
  last?: boolean;
  onPress?: () => void;
}) {
  const { palette } = useTheme();
  const content = (
    <>
      <Text style={[styles.rowLabel, { color: palette.text }]}>{label}</Text>
      <View style={styles.rowValue}>{children}</View>
    </>
  );
  const rowStyle = [
    styles.row,
    !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  ];
  if (onPress) {
    return (
      <PressableScale scaleTo={0.99} onPress={onPress} accessibilityRole="button" style={rowStyle}>
        {content}
      </PressableScale>
    );
  }
  return <View style={rowStyle}>{content}</View>;
}

export function Settings() {
  const { palette } = useTheme();
  const { state, dispatch } = useStore();
  const resetAll = useResetAll();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [editingWeight, setEditingWeight] = useState(false);
  const [weightDraft, setWeightDraft] = useState('');

  const { settings, profile } = state;

  const heightLabel = (() => {
    if (!profile?.heightCm) return '—';
    if (settings.heightUnit === 'cm') return `${profile.heightCm} cm`;
    const { ft, inch } = cmToFtIn(profile.heightCm);
    return `${ft}′ ${inch}″`;
  })();

  const exportData = async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: state.profile,
      settings: state.settings,
      workouts: state.workouts,
    };
    try {
      await Share.share({
        title: 'Trace export',
        message: JSON.stringify(payload, null, 2),
      });
    } catch {
      // user dismissed the share sheet
    }
  };

  const confirmReset = () => {
    Alert.alert('Reset everything?', 'Your profile and all workouts will be erased.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetAll },
    ]);
  };

  const saveName = () => {
    const v = nameDraft.trim();
    if (v.length > 0) dispatch({ type: 'updateProfile', patch: { name: v } });
    setEditingName(false);
  };

  const saveWeight = () => {
    const v = parseFloat(weightDraft);
    if (!Number.isNaN(v) && v > 0) dispatch({ type: 'updateProfile', patch: { weight: v } });
    setEditingWeight(false);
  };

  return (
    <ScrollView
      style={{ backgroundColor: palette.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: palette.text }]}>Settings</Text>

      <Section title="Appearance">
        <Row label="Theme" last>
          <Segmented
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={settings.themeMode}
            onChange={(themeMode) => dispatch({ type: 'updateSettings', patch: { themeMode } })}
          />
        </Row>
      </Section>

      <Section title="Units">
        <Row label="Weight">
          <Segmented
            options={[
              { value: 'lb', label: 'lb' },
              { value: 'kg', label: 'kg' },
            ]}
            value={settings.weightUnit}
            onChange={(u) =>
              dispatch({ type: 'updateSettings', patch: { weightUnit: u as WeightUnit } })
            }
          />
        </Row>
        <Row label="Height" last>
          <Segmented
            options={[
              { value: 'ftin', label: 'ft / in' },
              { value: 'cm', label: 'cm' },
            ]}
            value={settings.heightUnit}
            onChange={(u) =>
              dispatch({ type: 'updateSettings', patch: { heightUnit: u as HeightUnit } })
            }
          />
        </Row>
      </Section>

      <Section title="Profile">
        <Row
          label="Name"
          onPress={() => {
            setNameDraft(profile?.name ?? '');
            setEditingName(true);
          }}
        >
          {editingName ? (
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              onSubmitEditing={saveName}
              onBlur={saveName}
              autoFocus
              returnKeyType="done"
              style={[styles.inlineInput, { color: palette.text }]}
            />
          ) : (
            <Text style={[styles.value, { color: palette.text2 }]}>{profile?.name ?? '—'}</Text>
          )}
        </Row>
        <Row
          label="Weight"
          onPress={() => {
            setWeightDraft(profile?.weight != null ? String(profile.weight) : '');
            setEditingWeight(true);
          }}
        >
          {editingWeight ? (
            <TextInput
              value={weightDraft}
              onChangeText={setWeightDraft}
              onSubmitEditing={saveWeight}
              onBlur={saveWeight}
              autoFocus
              keyboardType="numeric"
              returnKeyType="done"
              style={[styles.inlineInput, { color: palette.text }]}
            />
          ) : (
            <Text style={[styles.value, { color: palette.text2 }]}>
              {profile?.weight != null ? `${profile.weight} ${settings.weightUnit}` : '—'}
            </Text>
          )}
        </Row>
        <Row label="Height" last>
          <Text style={[styles.value, { color: palette.text2 }]}>{heightLabel}</Text>
        </Row>
      </Section>

      <Section title="Data">
        <Row label="Export data" onPress={exportData}>
          <Text style={[styles.value, { color: palette.text3 }]}>JSON</Text>
        </Row>
        <Row label="Reset onboarding & data" last onPress={confirmReset}>
          <Text style={[styles.value, { color: palette.danger }]}>Reset</Text>
        </Row>
      </Section>

      <Section title="About">
        <Row label="Trace" last>
          <Text style={[styles.value, { color: palette.text3 }]}>1.0</Text>
        </Row>
      </Section>

      <Text style={[styles.footnote, { color: palette.text3 }]}>
        Your data never leaves this device.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 56,
  },
  title: { fontFamily: serif, fontSize: 32, letterSpacing: 0.2 },
  section: { marginTop: 36 },
  sectionBody: {
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    minHeight: 54,
    gap: 12,
  },
  rowLabel: { fontSize: 16 },
  rowValue: { flexShrink: 1, alignItems: 'flex-end' },
  value: { fontSize: 15 },
  inlineInput: {
    fontSize: 16,
    minWidth: 120,
    textAlign: 'right',
    padding: 0,
  },
  footnote: {
    marginTop: 28,
    fontSize: 13,
    textAlign: 'center',
  },
});
