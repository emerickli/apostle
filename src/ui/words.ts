// Interface wording in one place. Keep it plain.

import type { Band, Gender, Layout, PointKind, Source, Stance } from '../core/model';
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
  money: 'Money',
  opportunity: 'Opportunities',
  information: 'Information',
  expertise: 'Expertise',
  authority: 'Authority',
  standing: 'Standing',
  influence: 'Influence',
  debt: 'Debt',
  dependence: 'Reliance',
  alternatives: 'Alternatives',
  bond: 'Loyalty',
};

/** What each source means, for whoever holds it. */
export const SOURCE_HINTS: Record<Source, string> = {
  access: 'Can open doors and reach people',
  money: 'Controls funding, pay or spending',
  opportunity: 'Can offer jobs, deals or roles',
  information: 'Knows things the other needs',
  expertise: 'Has skills that are hard to replace',
  authority: 'Has formal say, like a boss or a board',
  standing: 'Reputation and status others respect',
  influence: 'Can sway what others think',
  debt: 'Is owed a favor',
  dependence: 'The other relies on them day to day',
  alternatives: 'Has other options if this tie ends',
  bond: 'The other feels loyal or attached to them',
};

export const SOURCE_GROUPS: { name: string; sources: Source[] }[] = [
  { name: 'Resources', sources: ['access', 'money', 'opportunity'] },
  { name: 'Know-how', sources: ['information', 'expertise'] },
  { name: 'Position', sources: ['authority', 'standing', 'influence'] },
  { name: 'Ties', sources: ['debt', 'dependence', 'alternatives', 'bond'] },
];

export const GENDER_NAMES: Record<Gender, string> = {
  female: 'Female',
  male: 'Male',
  other: 'Other/NA',
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
