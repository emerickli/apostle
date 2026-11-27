// Numbers for the Charts view: one row per person and a summary per sphere.
// Only people in visible spheres are counted.

import { BANDS, NO_SPHERE, type Alliance, type Band, type ID, type Stance } from './model';
import type { Derived } from './derive';
import { PRACTICE_KEYS, type PracticeKey } from './rules';
import { sphereKey } from './view';

export interface PersonStat {
  id: ID;
  name: string;
  sphere: ID;
  score: number;
  band: Band;
  you: number;
  them: number;
  /** Positive when you lead. */
  lead: number;
  flags: PracticeKey[];
}

export interface SphereStat {
  id: ID;
  name: string;
  /** Palette index, or null for people with no sphere. */
  color: number | null;
  people: PersonStat[];
  you: number;
  them: number;
  lead: number;
  avgScore: number;
  bands: Record<Band, number>;
  /** Stance counts on the active goal, or null with no goal. */
  stances: Record<Stance, number> | null;
  attention: number;
  /** Contacts logged in each of the last 12 months, oldest first. */
  contacts: number[];
}

/** The last 12 months, oldest first, as YYYY-MM keys. */
export function lastMonths(now: Date, count = 12): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export function chartStats(
  alliance: Alliance,
  derived: Derived,
  now: Date,
): { people: PersonStat[]; spheres: SphereStat[]; months: string[] } {
  const months = lastMonths(now);
  const monthIndex = new Map(months.map((m, i) => [m, i]));
  const flags = new Map<ID, PracticeKey[]>();
  for (const k of PRACTICE_KEYS) for (const id of derived.practice[k]) flags.set(id, [...(flags.get(id) ?? []), k]);

  const people: PersonStat[] = alliance.people
    .filter((p) => derived.visible.has(p.id))
    .map((p) => {
      const bal = derived.balances.get(p.id)!;
      return {
        id: p.id,
        name: p.name || 'Unnamed',
        sphere: sphereKey(alliance, p),
        score: derived.scores.get(p.id) ?? 0,
        band: derived.bands.get(p.id) ?? 'weak',
        you: bal.you,
        them: bal.them,
        lead: bal.lead,
        flags: flags.get(p.id) ?? [],
      };
    });

  const goal = alliance.activeGoalId;
  const groups = [
    ...alliance.spheres.map((s) => ({ id: s.id, name: s.name, color: s.color as number | null })),
    { id: NO_SPHERE, name: 'No sphere', color: null },
  ];
  const spheres = groups
    .map((g) => {
      const members = people.filter((p) => p.sphere === g.id);
      const you = members.reduce((n, p) => n + p.you, 0);
      const them = members.reduce((n, p) => n + p.them, 0);
      const bands = Object.fromEntries(BANDS.map((b) => [b, members.filter((p) => p.band === b).length])) as Record<Band, number>;
      let stances: Record<Stance, number> | null = null;
      if (goal) {
        stances = { with: 0, uncommitted: 0, against: 0 };
        for (const m of members) {
          const s = alliance.people.find((p) => p.id === m.id)?.stances[goal];
          if (s) stances[s]++;
        }
      }
      const contacts = months.map(() => 0);
      for (const m of members) {
        for (const pt of alliance.people.find((p) => p.id === m.id)?.points ?? []) {
          const i = monthIndex.get(pt.date.slice(0, 7));
          if (i !== undefined) contacts[i]++;
        }
      }
      return {
        ...g,
        contacts,
        people: members,
        you,
        them,
        lead: you - them,
        avgScore: members.length ? members.reduce((n, p) => n + p.score, 0) / members.length : 0,
        bands,
        stances,
        attention: members.filter((p) => p.flags.length).length,
      };
    })
    .filter((s) => s.people.length > 0);
  return { people, spheres, months };
}
