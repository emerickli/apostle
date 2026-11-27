// Closeness, power and the practice list. Pure functions of the alliance and a date.

import { thresholds as T } from './thresholds';
import { SOURCES, type Alliance, type Band, type DateString, type ID, type Person, type Point, type PowerSet } from './model';

const DAY = 86_400_000;

export function toDateString(d: Date): DateString {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(s: DateString): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function daysSince(date: DateString, now: Date): number {
  const start = parseDate(date);
  const today = parseDate(toDateString(now));
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / DAY));
}

export function pointWeight(p: Point, now: Date): number {
  const age = daysSince(p.date, now);
  const row = T.closeness.recency.find((r) => age <= r.maxDays)!;
  const base = T.closeness.pointValue * (p.mutual ? T.closeness.mutualMultiplier : 1);
  return base * row.factor;
}

export function closenessScore(person: Person, now: Date): number {
  const total = person.points.reduce((sum, p) => sum + pointWeight(p, now), 0);
  return Math.min(T.closeness.cap, Math.round(total * 100) / 100);
}

export function bandForScore(score: number): Band {
  const b = T.closeness.bands;
  if (score >= b.inner) return 'inner';
  if (score >= b.close) return 'close';
  if (score >= b.active) return 'active';
  return 'weak';
}

export function computedBand(person: Person, now: Date): Band {
  return bandForScore(closenessScore(person, now));
}

export function band(person: Person, now: Date): Band {
  return person.closenessOverride ?? computedBand(person, now);
}

export function powerSum(set: PowerSet): number {
  return SOURCES.reduce((sum, s) => sum + (set[s] ?? 0), 0);
}

export type Tone = 'you' | 'them' | 'even';

export interface Balance {
  you: number;
  them: number;
  /** Positive when you lead. */
  lead: number;
  tone: Tone;
  hot: boolean;
}

export function balance(person: Person): Balance {
  const you = powerSum(person.powerYou);
  const them = powerSum(person.powerThem);
  const lead = you - them;
  return {
    you,
    them,
    lead,
    tone: lead > 0 ? 'you' : lead < 0 ? 'them' : 'even',
    hot: Math.abs(lead) >= T.power.hotGap,
  };
}

export function lastPointDate(person: Person): DateString | null {
  let latest: DateString | null = null;
  for (const p of person.points) if (!latest || p.date > latest) latest = p.date;
  return latest;
}

export type PracticeKey = 'cold' | 'exposed' | 'unused' | 'bridge';
export const PRACTICE_KEYS: readonly PracticeKey[] = ['cold', 'exposed', 'unused', 'bridge'];
export type Practice = Record<PracticeKey, ID[]>;

export function practice(alliance: Alliance, now: Date): Practice {
  const out: Practice = { cold: [], exposed: [], unused: [], bridge: [] };
  const sphereCounts = new Map<ID, number>();
  for (const p of alliance.people) {
    if (p.sphereId) sphereCounts.set(p.sphereId, (sphereCounts.get(p.sphereId) ?? 0) + 1);
  }
  const goal = alliance.activeGoalId;

  for (const p of alliance.people) {
    const b = band(p, now);
    const bal = balance(p);

    if (goal && p.stances[goal]) {
      const last = lastPointDate(p);
      if (!last || daysSince(last, now) > T.practice.coldDays) out.cold.push(p.id);
    }
    if (bal.lead < 0 && (b === 'active' || b === 'weak')) out.exposed.push(p.id);
    if (bal.lead >= T.practice.unusedLead) out.unused.push(p.id);
    if (b === 'weak' && p.sphereId && sphereCounts.get(p.sphereId) === 1) out.bridge.push(p.id);
  }
  return out;
}
