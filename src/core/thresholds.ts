// Every tunable number for closeness, power and the practice list lives here.

export const thresholds = {
  closeness: {
    pointValue: 1,
    mutualMultiplier: 1.5,
    /** Recency multipliers by age in days. The first matching row wins. */
    recency: [
      { maxDays: 90, factor: 1 },
      { maxDays: 365, factor: 0.5 },
      { maxDays: Infinity, factor: 0.25 },
    ],
    cap: 10,
    /** Lowest score for each band. Anything under `active` is weak. */
    bands: { inner: 7, close: 4.5, active: 2 },
  },
  power: {
    maxPerSource: 3,
    /** A lead this large either way makes a hot link. */
    hotGap: 6,
  },
  practice: {
    coldDays: 90,
    unusedLead: 4,
  },
} as const;
