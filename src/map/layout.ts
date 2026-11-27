// Where each point sits, for each of the four drawings. Pure math, no canvas.
// A different renderer (3D, native) can reuse this unchanged.

import type { Alliance, Band, ID, Layout, Person } from '../core/model';
import { childrenOf } from '../core/tree';
import { theme } from '../theme';

export interface Vec { x: number; y: number }
export interface Edge { from: ID; to: ID; kind: 'parent' | 'spoke' | 'cross' }
export interface LayoutResult {
  layout: Layout;
  pos: Map<ID, Vec>;
  edges: Edge[];
  /** Ring guides for the rings drawing. */
  rings: { band: Band; r: number }[];
}

const BAND_RANK: Record<Band, number> = { inner: 0, close: 1, active: 2, weak: 3 };

interface Input {
  alliance: Alliance;
  placed: Set<ID>;
  bandOf: (id: ID) => Band;
  showCrossTies: boolean;
}

function sortedChildren(kids: Map<ID, Person[]>, id: ID, bandOf: (id: ID) => Band): Person[] {
  return [...(kids.get(id) ?? [])].sort(
    (a, b) => BAND_RANK[bandOf(a.id)] - BAND_RANK[bandOf(b.id)] || a.name.localeCompare(b.name),
  );
}

/** Leaf slots under each node, plus each node's depth and slot start. */
function measureTree(input: Input) {
  const { alliance, bandOf } = input;
  const kids = childrenOf(alliance);
  const width = new Map<ID, number>();
  const start = new Map<ID, number>();
  const depth = new Map<ID, number>();

  const measure = (id: ID): number => {
    const children = sortedChildren(kids, id, bandOf);
    const w = children.length ? children.reduce((s, c) => s + measure(c.id), 0) : 1;
    width.set(id, w);
    return w;
  };
  const assign = (id: ID, left: number, d: number) => {
    start.set(id, left);
    depth.set(id, d);
    let cursor = left;
    for (const c of sortedChildren(kids, id, bandOf)) {
      assign(c.id, cursor, d + 1);
      cursor += width.get(c.id)!;
    }
  };
  const total = measure(alliance.me.id);
  assign(alliance.me.id, 0, 0);
  return { width, start, depth, total, kids };
}

function parentEdges(input: Input): Edge[] {
  return input.alliance.people
    .filter((p) => input.placed.has(p.id) && p.parentId)
    .map((p) => ({ from: p.parentId!, to: p.id, kind: 'parent' as const }));
}

function crossEdges(input: Input): Edge[] {
  return input.alliance.crossTies
    .filter((t) => input.placed.has(t.a) && input.placed.has(t.b))
    .map((t) => ({ from: t.a, to: t.b, kind: 'cross' as const }));
}

function tree(input: Input): Map<ID, Vec> {
  const { width, start, depth, total } = measureTree(input);
  const pos = new Map<ID, Vec>();
  const { treeGapX, treeGapY } = theme.map;
  for (const [id, left] of start) {
    const center = left + width.get(id)! / 2 - total / 2;
    pos.set(id, { x: center * treeGapX, y: depth.get(id)! * treeGapY });
  }
  return pos;
}

function radial(input: Input): Map<ID, Vec> {
  const { width, start, depth, total } = measureTree(input);
  const pos = new Map<ID, Vec>();
  for (const [id, left] of start) {
    const d = depth.get(id)!;
    if (d === 0) { pos.set(id, { x: 0, y: 0 }); continue; }
    const angle = ((left + width.get(id)! / 2) / total) * Math.PI * 2 - Math.PI / 2;
    const r = d * theme.map.radialStep;
    pos.set(id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  return pos;
}

function rings(input: Input): Map<ID, Vec> {
  const { alliance, placed, bandOf } = input;
  const pos = new Map<ID, Vec>([[alliance.me.id, { x: 0, y: 0 }]]);
  const sphereOrder = new Map(alliance.spheres.map((c, i) => [c.id, i]));
  const byBand = new Map<Band, Person[]>();
  for (const p of alliance.people) {
    if (!placed.has(p.id)) continue;
    const b = bandOf(p.id);
    byBand.set(b, [...(byBand.get(b) ?? []), p]);
  }
  for (const [b, people] of byBand) {
    people.sort(
      (x, y) =>
        (sphereOrder.get(x.sphereId ?? '') ?? 99) - (sphereOrder.get(y.sphereId ?? '') ?? 99) || x.name.localeCompare(y.name),
    );
    const r = theme.map.ringRadius[b];
    const offset = BAND_RANK[b] * 0.61 - Math.PI / 2;
    people.forEach((p, i) => {
      const a = offset + (i / people.length) * Math.PI * 2;
      pos.set(p.id, { x: Math.cos(a) * r, y: Math.sin(a) * r });
    });
  }
  return pos;
}

export function computeLayout(input: Input): LayoutResult {
  const layout = input.alliance.layout;
  const cross = crossEdges(input);
  if (layout === 'rings') {
    const pos = rings(input);
    const spokes = input.alliance.people
      .filter((p) => input.placed.has(p.id))
      .map((p) => ({ from: input.alliance.me.id, to: p.id, kind: 'spoke' as const }));
    const ringsList = (Object.entries(theme.map.ringRadius) as [Band, number][]).map(([band, r]) => ({ band, r }));
    return { layout, pos, edges: [...spokes, ...(input.showCrossTies ? cross : [])], rings: ringsList };
  }
  const parents = parentEdges(input);
  if (layout === 'charts') {
    // Charts draw no map; only the starfield shows behind them.
    return { layout, pos: new Map(), edges: [], rings: [] };
  }
  const pos = layout === 'radial' ? radial(input) : tree(input);
  return { layout, pos, edges: [...parents, ...(input.showCrossTies ? cross : [])], rings: [] };
}

/** A string that changes only when something affecting positions changes. */
export function layoutKey(input: Input): string {
  const a = input.alliance;
  return [
    a.layout, input.showCrossTies ? 1 : 0, a.me.id,
    a.people.filter((p) => input.placed.has(p.id)).map((p) => `${p.id}>${p.parentId}:${input.bandOf(p.id)}:${p.sphereId}:${p.name}`).join('|'),
    a.crossTies.map((t) => `${t.a}-${t.b}`).join('|'),
    a.spheres.map((c) => c.id).join('|'), a.hiddenSpheres.join('|'),
  ].join('#');
}
