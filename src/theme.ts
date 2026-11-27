// The one place for colors, type, spacing and motion. The canvas reads these directly,
// and main.tsx copies them into CSS variables for the panels.

export const theme = {
  color: {
    void: '#000000',
    panel: 'rgba(4, 6, 11, 0.82)',
    panelSolid: '#05070c',
    line: 'rgba(255, 255, 255, 0.14)',
    lineStrong: 'rgba(255, 255, 255, 0.3)',
    text: '#ffffff',
    textDim: 'rgba(255, 255, 255, 0.72)',
    textFaint: 'rgba(255, 255, 255, 0.48)',
    /** They hold more. */
    them: '#00e5ff',
    /** You hold more. Red is used for nothing else. */
    you: '#ff1a3c',
    even: '#ffffff',
    me: '#ffffff',
    /**
     * Sphere hues, in fixed order. Never red, never cyan. Checked with the dataviz
     * palette validator against #020306 and the power colors: color-blind and
     * normal-vision separation pass; lightness is brighter than the chart band on
     * purpose, for the neon look. Charts always name spheres in text as well.
     */
    spheres: ['#ffb23d', '#7f6bff', '#a3ff5c', '#f08cff', '#f4f0d0'],
    noSphere: '#8a93a8',
  },
  font: {
    ui: '"Tektur Variable", system-ui, sans-serif',
    mono: '"Kode Mono Variable", ui-monospace, monospace',
  },
  map: {
    treeGapX: 150,
    treeGapY: 170,
    radialStep: 200,
    ringRadius: { inner: 150, close: 280, active: 410, weak: 540 },
    nodeRadius: { me: 9.5, inner: 7.2, close: 6, active: 4.8, weak: 3.4 },
    glowRadius: { me: 62, inner: 38, close: 30, active: 23, weak: 16 },
    glowAlpha: { me: 0.9, inner: 0.85, close: 0.72, active: 0.58, weak: 0.42 },
    minZoom: 0.2,
    maxZoom: 3,
  },
  motion: {
    layoutMs: 760,
    editMs: 420,
    panelMs: 220,
  },
} as const;

export function sphereColor(index: number | undefined | null): string {
  if (index === undefined || index === null) return theme.color.noSphere;
  const list = theme.color.spheres;
  return list[((index % list.length) + list.length) % list.length];
}

/** Font pairings the user can switch between. The first is the default. */
export const FONT_SETS = [
  { id: 'tektur', name: 'Tektur', ui: '"Tektur Variable", system-ui, sans-serif', mono: '"Kode Mono Variable", ui-monospace, monospace' },
  { id: 'chakra', name: 'Chakra Petch', ui: '"Chakra Petch", system-ui, sans-serif', mono: '"JetBrains Mono Variable", ui-monospace, monospace' },
  { id: 'oxanium', name: 'Oxanium', ui: '"Oxanium Variable", system-ui, sans-serif', mono: '"Share Tech Mono", ui-monospace, monospace' },
  { id: 'saira', name: 'Saira', ui: '"Saira Variable", system-ui, sans-serif', mono: '"Martian Mono Variable", ui-monospace, monospace' },
] as const;
export type FontSetId = (typeof FONT_SETS)[number]['id'];

/** The fonts in use right now. The canvas reads these on every frame. */
export const fonts: { ui: string; mono: string } = { ui: theme.font.ui, mono: theme.font.mono };

const FONT_KEY = 'apostle.fonts';
export function currentFontSet(): FontSetId {
  const saved = localStorage.getItem(FONT_KEY);
  return (FONT_SETS.find((f) => f.id === saved)?.id ?? FONT_SETS[0].id) as FontSetId;
}
export function applyFontSet(id: FontSetId) {
  const set = FONT_SETS.find((f) => f.id === id) ?? FONT_SETS[0];
  fonts.ui = set.ui;
  fonts.mono = set.mono;
  document.documentElement.style.setProperty('--font-ui', set.ui);
  document.documentElement.style.setProperty('--font-mono', set.mono);
  localStorage.setItem(FONT_KEY, set.id);
}
