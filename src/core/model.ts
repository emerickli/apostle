// The shape of an alliance. Plain data, safe to serialize, no browser types.

export const FILE_FORMAT = 'apostle-alliance';
export const FILE_VERSION = 2;

export type ID = string;
/** Calendar date, YYYY-MM-DD. */
export type DateString = string;
/** Full timestamp, ISO 8601. */
export type Timestamp = string;

export type Band = 'inner' | 'close' | 'active' | 'weak';
export const BANDS: readonly Band[] = ['inner', 'close', 'active', 'weak'];

export type PointKind = 'time' | 'interest' | 'intro' | 'favor';
export const POINT_KINDS: readonly PointKind[] = ['time', 'interest', 'intro', 'favor'];

export type Stance = 'with' | 'against' | 'uncommitted';
export const STANCES: readonly Stance[] = ['with', 'against', 'uncommitted'];

/** Picks the default avatar. 'other' covers nonbinary and anyone who'd rather not say. */
export type Gender = 'female' | 'male' | 'other';
export const GENDERS: readonly Gender[] = ['female', 'male', 'other'];

export type Layout = 'tree' | 'radial' | 'rings' | 'charts';
export const LAYOUTS: readonly Layout[] = ['tree', 'radial', 'rings', 'charts'];

/**
 * Where power comes from. Ids are stable; the interface names live in ui/words.ts.
 * The first six were the original set, so older saves keep their scores.
 */
export const SOURCES = [
  'access', 'money', 'opportunity',
  'information', 'expertise',
  'authority', 'standing', 'influence',
  'debt', 'dependence', 'alternatives', 'bond',
] as const;
export type Source = (typeof SOURCES)[number];
/** Each source scored 0 to 3. */
export type PowerSet = Record<Source, number>;

export interface Point {
  id: ID;
  kind: PointKind;
  date: DateString;
  note: string;
  mutual: boolean;
}

export interface Person {
  id: ID;
  name: string;
  company: string;
  title: string;
  url: string;
  connectedOn: DateString | null;
  sphereId: ID | null;
  /** The person above them. `me.id` means directly under you. null means no parent. */
  parentId: ID | null;
  points: Point[];
  closenessOverride: Band | null;
  powerYou: PowerSet;
  powerThem: PowerSet;
  /** Leverage each way. Private, never drawn on the map. */
  holdYou: string;
  holdThem: string;
  /** Goal id to stance. A goal present here means the person is on that goal. */
  stances: Record<ID, Stance>;
  gender: Gender;
  /** A square photo as a data URL, or null to use the default avatar for their gender. */
  photo: string | null;
  updatedAt: Timestamp;
}

export interface Me {
  id: ID;
  name: string;
  updatedAt: Timestamp;
}

export interface Sphere {
  id: ID;
  name: string;
  /** Index into the theme's sphere palette. */
  color: number;
  updatedAt: Timestamp;
}

export interface Goal {
  id: ID;
  name: string;
  updatedAt: Timestamp;
}

export interface CrossTie {
  id: ID;
  a: ID;
  b: ID;
  updatedAt: Timestamp;
}

export interface Alliance {
  format: typeof FILE_FORMAT;
  version: typeof FILE_VERSION;
  me: Me;
  people: Person[];
  spheres: Sphere[];
  goals: Goal[];
  activeGoalId: ID | null;
  crossTies: CrossTie[];
  layout: Layout;
  showCrossTies: boolean;
  /** Spheres left off the map. NO_SPHERE stands for people with no sphere. */
  hiddenSpheres: ID[];
  updatedAt: Timestamp;
}

export const NO_SPHERE = 'none';

export function emptyPower(): PowerSet {
  return Object.fromEntries(SOURCES.map((s) => [s, 0])) as PowerSet;
}
