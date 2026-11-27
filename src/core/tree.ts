// Parent and child structure: who is placed, who sits under whom, and which moves are allowed.

import type { Alliance, ID, Person } from './model';

export function childrenOf(alliance: Alliance): Map<ID, Person[]> {
  const map = new Map<ID, Person[]>();
  for (const p of alliance.people) {
    if (!p.parentId) continue;
    const list = map.get(p.parentId);
    if (list) list.push(p);
    else map.set(p.parentId, [p]);
  }
  return map;
}

/** People whose chain of parents reaches you. */
export function placedIds(alliance: Alliance): Set<ID> {
  const kids = childrenOf(alliance);
  const placed = new Set<ID>();
  const stack = [alliance.me.id];
  while (stack.length) {
    const id = stack.pop()!;
    for (const child of kids.get(id) ?? []) {
      if (placed.has(child.id)) continue;
      placed.add(child.id);
      stack.push(child.id);
    }
  }
  return placed;
}

export function descendantIds(alliance: Alliance, id: ID): Set<ID> {
  const kids = childrenOf(alliance);
  const out = new Set<ID>();
  const stack = [id];
  while (stack.length) {
    const next = stack.pop()!;
    for (const child of kids.get(next) ?? []) {
      if (out.has(child.id)) continue;
      out.add(child.id);
      stack.push(child.id);
    }
  }
  return out;
}

export type MoveCheck = { ok: true } | { ok: false; reason: 'self' | 'cycle' | 'root' | 'missing' };

/** Whether `id` may be placed under `parentId`. null sends them to the tray. */
export function canMove(alliance: Alliance, id: ID, parentId: ID | null): MoveCheck {
  if (id === alliance.me.id) return { ok: false, reason: 'root' };
  if (!alliance.people.some((p) => p.id === id)) return { ok: false, reason: 'missing' };
  if (parentId === null || parentId === alliance.me.id) return { ok: true };
  if (parentId === id) return { ok: false, reason: 'self' };
  if (!alliance.people.some((p) => p.id === parentId)) return { ok: false, reason: 'missing' };
  if (descendantIds(alliance, id).has(parentId)) return { ok: false, reason: 'cycle' };
  return { ok: true };
}

/** Top people of each unplaced group, the ones the tray shows. */
export function trayRoots(alliance: Alliance, placed: Set<ID>): Person[] {
  const ids = new Set(alliance.people.map((p) => p.id));
  return alliance.people.filter(
    (p) => !placed.has(p.id) && (!p.parentId || (!ids.has(p.parentId) && p.parentId !== alliance.me.id)),
  );
}
