// Interface wording in one place. Keep it plain.

import type { Band, Layout, PointKind, Source, Stance } from '../core/model';
import type { PracticeKey } from '../core/rules';

export const MOTTO = 'Build your alliance. Test your allegiance.';

export const LAYOUT_NAMES: Record<Layout, string> = {
  tree: 'Tree',
  radial: 'Radial',
  rings: 'Rings',
  charts: 'Charts',
};

export const BAND_NAMES: Record<Band, string> = {
  inner: 'Inner',
  close: 'Close',
  active: 'Active',
  weak: 'Weak',
};

export const POINT_NAMES: Record<PointKind, string> = {
  time: 'Time together',
  interest: 'Shared interest',
  intro: 'Introduction',
  favor: 'Favor',
};

export const SOURCE_NAMES: Record<Source, string> = {
  access: 'Access',
  dependence: 'Dependence',
  debt: 'Debt',
  information: 'Information',
  alternatives: 'Alternatives',
  standing: 'Standing',
};

export const STANCE_NAMES: Record<Stance, string> = {
  with: 'With you',
  uncommitted: 'Undecided',
  against: 'Against you',
};

/** The "needs attention" list: what it means and what to do about it. */
export const PRACTICE: Record<PracticeKey, { name: string; todo: string }> = {
  cold: { name: 'Going cold', todo: 'Reach out.' },
  exposed: { name: 'They have leverage', todo: 'Get closer, or rely on them less.' },
  unused: { name: 'You have leverage', todo: 'Decide whether to use it.' },
  bridge: { name: 'Your only link', todo: 'Strengthen it.' },
};

export const REFUSALS = {
  cycle: "Can't place someone under a person who sits below them.",
  self: "Can't place someone under themselves.",
  root: 'You always stay at the top.',
  missing: 'That person no longer exists.',
};

export function ago(days: number) {
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days} days ago`;
  if (days < 730) return `${Math.round(days / 30)} months ago`;
  return `${Math.round(days / 365)} years ago`;
}
