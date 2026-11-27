// Everything computed from an alliance at a moment in time, in one pass.

import { BANDS, type Alliance, type Band, type ID, type Stance } from './model';
import { balance, band, closenessScore, practice, PRACTICE_KEYS, type Balance, type Practice } from './rules';
import { placedIds } from './tree';
import { visibleIds } from './view';

export interface Standing {
  /** Stance counts on the active goal, or null with no goal. */
  goal: Record<Stance, number> | null;
  power: { you: number; even: number; them: number };
  bands: Record<Band, number>;
  total: number;
}

export interface Derived {
  placed: Set<ID>;
  /** People in spheres that are switched on. */
  visible: Set<ID>;
  bands: Map<ID, Band>;
  scores: Map<ID, number>;
  balances: Map<ID, Balance>;
  /** Only visible people. Bridge still counts every member of a sphere. */
  practice: Practice;
  standing: Standing;
}

export function derive(alliance: Alliance, now: Date): Derived {
  const visible = visibleIds(alliance);
  const bands = new Map(alliance.people.map((p) => [p.id, band(p, now)]));
  const balances = new Map(alliance.people.map((p) => [p.id, balance(p)]));
  const all = practice(alliance, now);
  const shown = Object.fromEntries(PRACTICE_KEYS.map((k) => [k, all[k].filter((id) => visible.has(id))])) as Practice;

  const goalId = alliance.activeGoalId;
  const standing: Standing = {
    goal: goalId ? { with: 0, uncommitted: 0, against: 0 } : null,
    power: { you: 0, even: 0, them: 0 },
    bands: Object.fromEntries(BANDS.map((b) => [b, 0])) as Record<Band, number>,
    total: 0,
  };
  for (const p of alliance.people) {
    if (!visible.has(p.id)) continue;
    standing.total++;
    const stance = goalId ? p.stances[goalId] : undefined;
    if (standing.goal && stance) standing.goal[stance]++;
    standing.power[balances.get(p.id)!.tone]++;
    standing.bands[bands.get(p.id)!]++;
  }

  return {
    placed: placedIds(alliance),
    visible,
    bands,
    scores: new Map(alliance.people.map((p) => [p.id, closenessScore(p, now)])),
    balances,
    practice: shown,
    standing,
  };
}
