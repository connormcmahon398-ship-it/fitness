export type WeightUnit = 'lb' | 'kg';

export interface ParsedLine {
  /** Display name, title-cased: "Bench Press". */
  name: string;
  /** Canonical key for matching across sessions: "bench press". */
  key: string;
  weight: number | null;
  unit: WeightUnit | null;
  sets: number | null;
  reps: number | null;
}

const UNIT_ALIASES: Record<string, WeightUnit> = {
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  kg: 'kg',
  kgs: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
};

function titleCase(s: string): string {
  return s
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Parse a single notes-style line into structured data.
 *
 * Handles natural variations:
 *   "bench press 185 3 sets of 6"
 *   "bench 185 3x6"          "bench 185lb 3 x 6"
 *   "bench press — 185 — 3x6"
 *   "squat 100kg 5x5"        "incline db press 60 3 sets 10 reps"
 *   "pull ups 3x10"          (bodyweight — no weight)
 *   "deadlift 315 for 5"     (single set of 5)
 *
 * Returns null when the line can't be confidently understood.
 * Ambiguous numbers are left null rather than guessed.
 */
export function parseLine(raw: string): ParsedLine | null {
  let s = raw.trim().toLowerCase();
  if (s.length === 0) return null;

  // Normalize separators (em/en dashes, bullets, commas, colons, @) to spaces.
  s = s.replace(/[—–\-·•,:@]+/g, ' ').replace(/\s+/g, ' ').trim();

  let sets: number | null = null;
  let reps: number | null = null;

  // "3x6" / "3 x 6" / "3×6"
  const cross = /(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)/.exec(s);
  // "3 sets of 6" / "3 sets 6 reps" / "3 set of 6 reps"
  const wordy = /(\d+)\s*sets?(?:\s*of)?\s*(\d+(?:\.\d+)?)(?:\s*reps?)?/.exec(s);
  // "for 5" / "for 5 reps" — a single set
  const single = /\bfor\s+(\d+)(?:\s*reps?)?\b/.exec(s);
  // "3 sets" alone / "8 reps" alone
  const setsOnly = /(\d+)\s*sets?\b/.exec(s);
  const repsOnly = /(\d+)\s*reps?\b/.exec(s);

  let consumed: { start: number; end: number } | null = null;
  if (cross) {
    sets = parseInt(cross[1], 10);
    reps = Math.round(parseFloat(cross[2]));
    consumed = { start: cross.index, end: cross.index + cross[0].length };
  } else if (wordy) {
    sets = parseInt(wordy[1], 10);
    reps = Math.round(parseFloat(wordy[2]));
    consumed = { start: wordy.index, end: wordy.index + wordy[0].length };
  } else if (single) {
    sets = 1;
    reps = parseInt(single[1], 10);
    consumed = { start: single.index, end: single.index + single[0].length };
  } else {
    if (setsOnly) {
      sets = parseInt(setsOnly[1], 10);
      consumed = { start: setsOnly.index, end: setsOnly.index + setsOnly[0].length };
    }
    if (repsOnly && (!setsOnly || repsOnly.index !== setsOnly.index)) {
      reps = parseInt(repsOnly[1], 10);
      if (!consumed) consumed = { start: repsOnly.index, end: repsOnly.index + repsOnly[0].length };
      else {
        consumed = {
          start: Math.min(consumed.start, repsOnly.index),
          end: Math.max(consumed.end, repsOnly.index + repsOnly[0].length),
        };
      }
    }
  }

  // Remove the sets/reps span, then look for a weight in what's left.
  const remainder = consumed ? s.slice(0, consumed.start) + ' ' + s.slice(consumed.end) : s;

  let weight: number | null = null;
  let unit: WeightUnit | null = null;

  const numberRe = /(\d+(?:\.\d+)?)\s*([a-z]+)?/g;
  const candidates: { value: number; unit: WeightUnit | null; index: number; length: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = numberRe.exec(remainder)) !== null) {
    const suffix = m[2];
    if (suffix && !(suffix in UNIT_ALIASES)) {
      // A number glued to a non-unit word ("v2" in an exercise name) isn't a weight —
      // but "185 press" style (number then word) should still count the number.
      // Only reject when the word is directly attached with no meaning as a unit.
      candidates.push({ value: parseFloat(m[1]), unit: null, index: m.index, length: m[1].length });
    } else {
      candidates.push({
        value: parseFloat(m[1]),
        unit: suffix ? UNIT_ALIASES[suffix] : null,
        index: m.index,
        length: m[0].length,
      });
    }
  }

  let weightSpan: { start: number; end: number } | null = null;
  if (candidates.length === 1) {
    weight = candidates[0].value;
    unit = candidates[0].unit;
    weightSpan = { start: candidates[0].index, end: candidates[0].index + candidates[0].length };
  } else if (candidates.length > 1) {
    // Ambiguous — prefer the one with an explicit unit; otherwise don't invent.
    const withUnit = candidates.filter((c) => c.unit !== null);
    if (withUnit.length === 1) {
      weight = withUnit[0].value;
      unit = withUnit[0].unit;
      weightSpan = { start: withUnit[0].index, end: withUnit[0].index + withUnit[0].length };
    }
  }

  // The exercise name is the text before the first number or structured token.
  let nameEnd = remainder.length;
  if (weightSpan) nameEnd = Math.min(nameEnd, weightSpan.start);
  if (consumed) nameEnd = Math.min(nameEnd, consumed.start);
  if (candidates.length > 0) nameEnd = Math.min(nameEnd, candidates[0].index);
  const name = remainder
    .slice(0, nameEnd)
    .replace(/\b(at|with|of|the)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (name.length < 2) return null;
  // Recognized only when we got at least one structured fact beyond the name.
  if (weight === null && sets === null && reps === null) return null;

  return {
    name: titleCase(name),
    key: name,
    weight,
    unit,
    sets,
    reps,
  };
}

export function describeParsed(p: ParsedLine, defaultUnit: WeightUnit): string {
  const parts: string[] = [];
  if (p.weight !== null) parts.push(`${p.weight} ${p.unit ?? defaultUnit}`);
  if (p.sets !== null && p.reps !== null) parts.push(`${p.sets} × ${p.reps}`);
  else if (p.sets !== null) parts.push(`${p.sets} sets`);
  else if (p.reps !== null) parts.push(`${p.reps} reps`);
  return parts.join(' · ');
}
