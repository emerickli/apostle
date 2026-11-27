// Which people the screen shows, given the spheres the user turned off.

import { NO_SPHERE, type Alliance, type ID, type Person } from './model';

export function sphereKey(alliance: Alliance, p: Person): ID {
  return p.sphereId && alliance.spheres.some((s) => s.id === p.sphereId) ? p.sphereId : NO_SPHERE;
}

export function visibleIds(alliance: Alliance): Set<ID> {
  const hidden = new Set(alliance.hiddenSpheres);
  return new Set(alliance.people.filter((p) => !hidden.has(sphereKey(alliance, p))).map((p) => p.id));
}

/**
 * The alliance as drawn: hidden people removed, and anyone whose parent is hidden
 * drawn under their nearest visible ancestor (or you). The saved alliance is unchanged.
 */
export function viewAlliance(alliance: Alliance, placed: Set<ID>, visible: Set<ID>): Alliance {
  if (visible.size === alliance.people.length) return alliance;
  const byId = new Map(alliance.people.map((p) => [p.id, p]));
  const people = alliance.people
    .filter((p) => visible.has(p.id))
    .map((p) => {
      if (!placed.has(p.id)) return p;
      let parent = p.parentId;
      while (parent && parent !== alliance.me.id && !visible.has(parent)) parent = byId.get(parent)?.parentId ?? alliance.me.id;
      return parent === p.parentId ? p : { ...p, parentId: parent ?? alliance.me.id };
    });
  return { ...alliance, people, crossTies: alliance.crossTies.filter((t) => visible.has(t.a) && visible.has(t.b)) };
}
