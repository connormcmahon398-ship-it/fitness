import { WeightUnit } from './parser';
import { Workout } from './types';

/** Convert a logged weight into the user's display unit. Lines without an explicit
 *  unit are assumed to already be in the display unit. */
export function toDisplayWeight(
  weight: number,
  loggedUnit: WeightUnit | null,
  displayUnit: WeightUnit,
): number {
  if (loggedUnit === null || loggedUnit === displayUnit) return weight;
  const converted = loggedUnit === 'kg' ? weight * 2.20462 : weight / 2.20462;
  return Math.round(converted * 10) / 10;
}

export function formatWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(1);
}

export interface SessionPoint {
  workoutId: string;
  date: number;
  /** Heaviest weight logged for the exercise that session (display unit). */
  topWeight: number | null;
  reps: number | null;
  sets: number;
  volume: number;
}

export interface ExerciseSeries {
  key: string;
  name: string;
  points: SessionPoint[]; // oldest → newest
  current: number | null;
  best: number | null;
  bestReps: number | null;
  totalSessions: number;
}

/** Completed workouts, oldest first. */
function chronological(workouts: Workout[]): Workout[] {
  return workouts
    .filter((w) => w.completedAt !== null)
    .slice()
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));
}

export function buildSeries(workouts: Workout[], unit: WeightUnit): Map<string, ExerciseSeries> {
  const map = new Map<string, ExerciseSeries>();
  for (const w of chronological(workouts)) {
    const perExercise = new Map<string, SessionPoint & { name: string }>();
    for (const e of w.entries) {
      if (!e.parsed) continue;
      const p = e.parsed;
      const weight = p.weight !== null ? toDisplayWeight(p.weight, p.unit, unit) : null;
      const sets = p.sets ?? 1;
      const vol = weight !== null && p.reps !== null ? weight * sets * p.reps : 0;
      const existing = perExercise.get(p.key);
      if (existing) {
        existing.sets += sets;
        existing.volume += vol;
        if (weight !== null && (existing.topWeight === null || weight > existing.topWeight)) {
          existing.topWeight = weight;
          existing.reps = p.reps;
        }
      } else {
        perExercise.set(p.key, {
          name: p.name,
          workoutId: w.id,
          date: w.completedAt ?? w.startedAt,
          topWeight: weight,
          reps: p.reps,
          sets,
          volume: vol,
        });
      }
    }
    for (const [key, point] of perExercise) {
      let series = map.get(key);
      if (!series) {
        series = {
          key,
          name: point.name,
          points: [],
          current: null,
          best: null,
          bestReps: null,
          totalSessions: 0,
        };
        map.set(key, series);
      }
      series.points.push(point);
      series.totalSessions += 1;
      if (point.topWeight !== null) {
        series.current = point.topWeight;
        if (series.best === null || point.topWeight > series.best) {
          series.best = point.topWeight;
          series.bestReps = point.reps;
        }
      }
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Post-workout feedback

export interface Feedback {
  headline: string;
  lines: string[];
  totalSets: number;
  totalVolume: number;
  durationMin: number | null;
}

export function buildFeedback(
  completed: Workout,
  previousWorkouts: Workout[], // not including `completed`
  unit: WeightUnit,
): Feedback {
  const prevSeries = buildSeries(previousWorkouts, unit);
  const lines: string[] = [];
  let prCount = 0;
  let improvements = 0;

  let totalSets = 0;
  let totalVolume = 0;
  const seen = new Set<string>();

  for (const e of completed.entries) {
    if (!e.parsed) continue;
    const p = e.parsed;
    const sets = p.sets ?? 1;
    totalSets += sets;
    const weight = p.weight !== null ? toDisplayWeight(p.weight, p.unit, unit) : null;
    if (weight !== null && p.reps !== null) totalVolume += weight * sets * p.reps;

    if (seen.has(p.key) || weight === null) continue;
    seen.add(p.key);

    const prev = prevSeries.get(p.key);
    if (!prev || prev.best === null) continue;

    const last = [...prev.points].reverse().find((pt) => pt.topWeight !== null);
    if (weight > prev.best) {
      prCount += 1;
      lines.push(`${p.name}: new best — ${formatWeight(weight)} ${unit}.`);
    } else if (last && last.topWeight !== null && weight > last.topWeight) {
      improvements += 1;
      lines.push(
        `${p.name}: +${formatWeight(weight - last.topWeight)} ${unit} from your previous session.`,
      );
    } else if (weight === prev.best) {
      lines.push(`You matched your best on ${p.name.toLowerCase()}.`);
    }
  }

  if (totalSets > 0) {
    lines.push(`You completed ${totalSets} working ${totalSets === 1 ? 'set' : 'sets'}.`);
  }

  let headline = 'Session logged.';
  if (prCount > 0) headline = prCount === 1 ? 'A new personal best.' : `${prCount} new personal bests.`;
  else if (improvements > 0) headline = 'Strong session.';
  else if (totalSets >= 15) headline = 'Solid work.';
  else if (previousWorkouts.length === 0) headline = 'First one down.';

  const durationMin =
    completed.completedAt !== null
      ? Math.max(1, Math.round((completed.completedAt - completed.startedAt) / 60000))
      : null;

  return { headline, lines: lines.slice(0, 5), totalSets, totalVolume, durationMin };
}

// ---------------------------------------------------------------------------
// Overview stats

export interface WeekBucket {
  label: string;
  count: number;
}

/** Workouts per week for the trailing `weeks` weeks, oldest first. */
export function weeklyConsistency(workouts: Workout[], weeks = 12): WeekBucket[] {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const mondayOffset = (day + 6) % 7;
  const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = new Date(startOfThisWeek);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const count = workouts.filter((w) => {
      const t = w.completedAt ?? 0;
      return t >= start.getTime() && t < end.getTime();
    }).length;
    buckets.push({ label: `${start.getMonth() + 1}/${start.getDate()}`, count });
  }
  return buckets;
}

export function totalVolumeByWorkout(workouts: Workout[], unit: WeightUnit): SessionPoint[] {
  return chronological(workouts).map((w) => {
    let vol = 0;
    let sets = 0;
    for (const e of w.entries) {
      if (!e.parsed) continue;
      const s = e.parsed.sets ?? 1;
      sets += s;
      if (e.parsed.weight !== null && e.parsed.reps !== null) {
        vol += toDisplayWeight(e.parsed.weight, e.parsed.unit, unit) * s * e.parsed.reps;
      }
    }
    return {
      workoutId: w.id,
      date: w.completedAt ?? w.startedAt,
      topWeight: null,
      reps: null,
      sets,
      volume: vol,
    };
  });
}

export interface Improvement {
  name: string;
  detail: string;
  when: number;
}

/** Recent improvements — sessions where an exercise beat its previous best. */
export function recentImprovements(workouts: Workout[], unit: WeightUnit, limit = 4): Improvement[] {
  const out: Improvement[] = [];
  const bestSoFar = new Map<string, number>();
  for (const w of chronological(workouts)) {
    const perExercise = new Map<string, { name: string; top: number }>();
    for (const e of w.entries) {
      if (!e.parsed || e.parsed.weight === null) continue;
      const wgt = toDisplayWeight(e.parsed.weight, e.parsed.unit, unit);
      const ex = perExercise.get(e.parsed.key);
      if (!ex || wgt > ex.top) perExercise.set(e.parsed.key, { name: e.parsed.name, top: wgt });
    }
    for (const [key, { name, top }] of perExercise) {
      const prev = bestSoFar.get(key);
      if (prev !== undefined && top > prev) {
        out.push({
          name,
          detail: `${formatWeight(prev)} → ${formatWeight(top)} ${unit}`,
          when: w.completedAt ?? w.startedAt,
        });
      }
      if (prev === undefined || top > prev) bestSoFar.set(key, top);
    }
  }
  return out.reverse().slice(0, limit);
}
