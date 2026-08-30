import type { ParsedLine, WeightUnit } from './parser';

export type HeightUnit = 'ftin' | 'cm';

export interface Profile {
  name: string;
  /** Stored in the unit chosen at onboarding. */
  heightCm: number | null;
  weight: number | null;
  experience: string | null;
  frequency: string | null;
  goal: string | null;
  tracking: string | null;
}

export interface Settings {
  themeMode: 'system' | 'light' | 'dark';
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
}

export interface Entry {
  id: string;
  raw: string;
  parsed: ParsedLine | null;
}

export interface Workout {
  id: string;
  startedAt: number;
  completedAt: number | null;
  entries: Entry[];
}

export interface AppState {
  hydrated: boolean;
  profile: Profile | null;
  settings: Settings;
  workouts: Workout[]; // newest first
  active: Workout | null;
}

export const defaultSettings: Settings = {
  themeMode: 'system',
  weightUnit: 'lb',
  heightUnit: 'ftin',
};

let counter = 0;
export function uid(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}
