// Reads any saved alliance (file or browser storage) into the current shape.
// Each future version adds one step to `steps`. Old saves pass through every step in order.

import {
  BANDS, FILE_FORMAT, FILE_VERSION, AVATARS, LAYOUTS, POINT_KINDS, SOURCES, STANCES, emptyPower,
  type Alliance, type AvatarId, type Band, type Sphere, type CrossTie, type Goal, type ID, type Layout, type Person,
  type Point, type PowerSet, type Stance,
} from './model';
import { newId } from './id';

export class AllianceFileError extends Error {}

type Raw = Record<string, unknown>;


const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback);
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? v.filter((x): x is Raw => !!x && typeof x === 'object') : []);
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  options.includes(v as T) ? (v as T) : fallback;

function power(v: unknown): PowerSet {
  const out = emptyPower();
  if (v && typeof v === 'object') {
    for (const s of SOURCES) {
      const n = Number((v as Raw)[s]);
      out[s] = Number.isFinite(n) ? Math.max(0, Math.min(3, Math.round(n))) : 0;
    }
  }
  return out;
}

// Saves from before avatars had numbers stored a gender instead. Map it once, keep nothing else.
const OLD_GENDER_AVATAR: Record<string, AvatarId> = { other: 1, female: 2, male: 3 };
function avatarOf(p: Raw): AvatarId {
  if (AVATARS.includes(p.avatar as AvatarId)) return p.avatar as AvatarId;
  return OLD_GENDER_AVATAR[str(p.gender)] ?? 1;
}

// version -> function that upgrades a raw object from that version to the next.
const steps: Record<number, (raw: Raw) => Raw> = {
  // Version 2: every map has a Family sphere. Added once, so deleting it later sticks.
  1: (raw) => {
    const list = arr(raw.spheres ?? raw.circles);
    if (list.some((s) => str(s.name).trim().toLowerCase() === 'family')) return raw;
    const used = new Set(list.map((s) => s.color));
    let color = 0;
    while (used.has(color)) color++;
    const family = { id: newId(), name: 'Family', color, updatedAt: new Date().toISOString() };
    return { ...raw, spheres: [family, ...list], circles: undefined };
  },
};

function normalize(raw: Raw, now: string): Alliance {
  const meRaw = (raw.me && typeof raw.me === 'object' ? raw.me : {}) as Raw;
  const me = { id: str(meRaw.id) || newId(), name: str(meRaw.name, 'You') || 'You', updatedAt: str(meRaw.updatedAt, now) };

  const people: Person[] = arr(raw.people).map((p) => {
    const stances: Record<ID, Stance> = {};
    if (p.stances && typeof p.stances === 'object') {
      for (const [goalId, s] of Object.entries(p.stances as Raw)) {
        if (STANCES.includes(s as Stance)) stances[goalId] = s as Stance;
      }
    }
    const points: Point[] = arr(p.points).map((pt) => ({
      id: str(pt.id) || newId(),
      kind: oneOf(pt.kind, POINT_KINDS, 'time'),
      date: str(pt.date, now.slice(0, 10)),
      note: str(pt.note),
      mutual: bool(pt.mutual),
    }));
    return {
      id: str(p.id) || newId(),
      name: str(p.name),
      company: str(p.company),
      title: str(p.title),
      url: str(p.url),
      connectedOn: strOrNull(p.connectedOn),
      // Early saves called spheres circles.
      sphereId: strOrNull(p.sphereId ?? p.circleId),
      parentId: strOrNull(p.parentId),
      points,
      closenessOverride: BANDS.includes(p.closenessOverride as Band) ? (p.closenessOverride as Band) : null,
      powerYou: power(p.powerYou),
      powerThem: power(p.powerThem),
      holdYou: str(p.holdYou),
      holdThem: str(p.holdThem),
      stances,
      // Added after version 2. Missing in older saves, so they get the neutral default.
      avatar: avatarOf(p),
      photo: typeof p.photo === 'string' && p.photo.startsWith('data:image/') ? p.photo : null,
      updatedAt: str(p.updatedAt, now),
    };
  });

  const spheres: Sphere[] = arr(raw.spheres ?? raw.circles).map((c, i) => ({
    id: str(c.id) || newId(),
    name: str(c.name, 'Sphere'),
    color: Number.isInteger(c.color) ? (c.color as number) : i,
    updatedAt: str(c.updatedAt, now),
  }));
  const goals: Goal[] = arr(raw.goals).map((g) => ({
    id: str(g.id) || newId(),
    name: str(g.name, 'Goal'),
    updatedAt: str(g.updatedAt, now),
  }));
  const ids = new Set(people.map((p) => p.id));
  const crossTies: CrossTie[] = arr(raw.crossTies)
    .map((t) => ({ id: str(t.id) || newId(), a: str(t.a), b: str(t.b), updatedAt: str(t.updatedAt, now) }))
    .filter((t) => ids.has(t.a) && ids.has(t.b) && t.a !== t.b);
  const activeGoalId = strOrNull(raw.activeGoalId);

  return {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    me,
    people,
    spheres,
    goals,
    activeGoalId: goals.some((g) => g.id === activeGoalId) ? activeGoalId : null,
    crossTies,
    // The fourth view used to be a network graph; it is now Charts.
    layout: oneOf<Layout>(raw.layout === 'graph' ? 'charts' : raw.layout, LAYOUTS, 'tree'),
    showCrossTies: bool(raw.showCrossTies),
    hiddenSpheres: Array.isArray(raw.hiddenSpheres) ? raw.hiddenSpheres.filter((x): x is string => typeof x === 'string') : [],
    updatedAt: str(raw.updatedAt, now),
  };
}

/** Turns parsed JSON into a current alliance, or throws AllianceFileError. */
export function readAlliance(input: unknown, now = new Date()): Alliance {
  if (!input || typeof input !== 'object') throw new AllianceFileError('This file is not an Apostle alliance.');
  let raw = input as Raw;
  if (raw.format !== FILE_FORMAT) throw new AllianceFileError('This file is not an Apostle alliance.');
  let version = Number(raw.version);
  if (!Number.isInteger(version) || version < 1) throw new AllianceFileError('This alliance file has no version number.');
  if (version > FILE_VERSION) {
    throw new AllianceFileError('This alliance was saved by a newer version of Apostle. Update Apostle to open it.');
  }
  while (version < FILE_VERSION) {
    const step = steps[version];
    if (!step) throw new AllianceFileError(`No upgrade path from version ${version}.`);
    raw = step(raw);
    version += 1;
  }
  return normalize(raw, now.toISOString());
}
