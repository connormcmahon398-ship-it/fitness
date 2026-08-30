import { Platform } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Palette {
  /** Page background — warm paper in light, near-black in dark. */
  bg: string;
  /** Slightly raised surface (rows, inputs). */
  surface: string;
  /** Primary text / ink. */
  text: string;
  /** Secondary text. */
  text2: string;
  /** Tertiary text — placeholders, faint labels. */
  text3: string;
  /** Hairline borders. */
  border: string;
  /** Slightly stronger border for focused / selected states. */
  borderStrong: string;
  /** The single accent — a restrained ember orange. */
  accent: string;
  /** Accent at low opacity, for tints. */
  accentSoft: string;
  /** Positive deltas. */
  positive: string;
  danger: string;
  chartLine: string;
  chartGrid: string;
  isDark: boolean;
}

export const light: Palette = {
  bg: '#FAFAF8',
  surface: '#FFFFFF',
  text: '#1C1C1A',
  text2: '#83837E',
  text3: '#B9B9B3',
  border: 'rgba(28,28,26,0.08)',
  borderStrong: 'rgba(28,28,26,0.22)',
  accent: '#C25E3A',
  accentSoft: 'rgba(194,94,58,0.10)',
  positive: '#3D7A5C',
  danger: '#B4473C',
  chartLine: '#1C1C1A',
  chartGrid: 'rgba(28,28,26,0.06)',
  isDark: false,
};

export const dark: Palette = {
  bg: '#141416',
  surface: '#1D1D20',
  text: '#ECECE8',
  text2: '#8E8E89',
  text3: '#5C5C58',
  border: 'rgba(236,236,232,0.08)',
  borderStrong: 'rgba(236,236,232,0.26)',
  accent: '#DE8158',
  accentSoft: 'rgba(222,129,88,0.14)',
  positive: '#6FAE8C',
  danger: '#C96A5F',
  chartLine: '#ECECE8',
  chartGrid: 'rgba(236,236,232,0.07)',
  isDark: true,
};

/** Editorial serif for the wordmark and greetings. */
export const serif = Platform.select({ ios: 'Georgia', default: 'serif' })!;

export const type = {
  /** Large editorial heading. */
  title: { fontSize: 28, fontFamily: serif, letterSpacing: 0.2 },
  /** Body text — matches the logger. */
  body: { fontSize: 17, lineHeight: 26 },
  /** Small uppercase section label. */
  label: {
    fontSize: 11.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
    fontWeight: '600' as const,
  },
  mono: { fontVariant: ['tabular-nums'] as ['tabular-nums'] },
};

/** Motion durations (ms). Micro = presses/dots, minor = element transitions, major = screens. */
export const motion = {
  micro: 180,
  minor: 320,
  major: 460,
  spring: { damping: 26, stiffness: 320, mass: 0.9 },
  springSoft: { damping: 30, stiffness: 190, mass: 1 },
};
