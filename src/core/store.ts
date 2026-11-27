// The data module. The interface reads and changes the network only through this store.
// No DOM here: storage comes in through an adapter, so a desktop app can swap it.

import {
  FILE_FORMAT, FILE_VERSION, NO_SPHERE, emptyPower,
  type Alliance, type Band, type ID, type Layout, type Person, type Point, type Source, type Stance,
} from './model';
import { newId } from './id';
import { readAlliance } from './migrate';
import { buildSample } from './sample';
import { canMove, type MoveCheck } from './tree';
import { normalizeProfileUrl, type ImportedConnection } from './linkedin';
import { toDateString } from './rules';

export interface StorageAdapter {
  load(): Promise<unknown | null>;
  save(alliance: Alliance): Promise<void>;
}

export type PersonPatch = Partial<
  Pick<Person, 'name' | 'company' | 'title' | 'url' | 'connectedOn' | 'sphereId' | 'closenessOverride' | 'holdYou' | 'holdThem'>
>;

export interface ImportSummary {
  added: number;
  skippedNoName: number;
  skippedDuplicate: number;
}

export function emptyAlliance(now = new Date()): Alliance {
  const stamp = now.toISOString();
  return {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    me: { id: newId(), name: 'You', updatedAt: stamp },
    people: [],
    // Every new map starts with the common spheres. They can be renamed or deleted.
    spheres: [
      { id: newId(), name: 'Family', color: 0, updatedAt: stamp },
      { id: newId(), name: 'Workplace', color: 2, updatedAt: stamp },
      { id: newId(), name: 'Career', color: 1, updatedAt: stamp },
      { id: newId(), name: 'Friends', color: 3, updatedAt: stamp },
    ],
    goals: [],
    activeGoalId: null,
    crossTies: [],
    layout: 'tree',
    showCrossTies: false,
    hiddenSpheres: [],
    updatedAt: stamp,
  };
}

export function createStore(storage: StorageAdapter, clock: () => Date = () => new Date()) {
  let state = emptyAlliance(clock());
  const listeners = new Set<() => void>();
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const stamp = () => clock().toISOString();

  function emit() {
    for (const fn of listeners) fn();
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void storage.save(state);
    }, 250);
  }

  function set(next: Alliance) {
    state = { ...next, updatedAt: stamp() };
    emit();
    scheduleSave();
  }

  function mapPerson(id: ID, fn: (p: Person) => Person) {
    set({ ...state, people: state.people.map((p) => (p.id === id ? { ...fn(p), updatedAt: stamp() } : p)) });
  }

  const ready = (async () => {
    try {
      const saved = await storage.load();
      if (saved) {
        state = readAlliance(saved, clock());
        emit();
      }
    } catch (err) {
      console.warn('Apostle: could not read the saved alliance. Starting empty.', err);
    }
  })();

  return {
    ready,
    getState: () => state,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Write now instead of waiting for the debounce, e.g. before the window closes. */
    flush() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
        void storage.save(state);
      }
    },

    // Whole alliance
    replace(next: Alliance) { set(next); },
    loadSample() { set(buildSample(clock())); },
    clear() { set({ ...emptyAlliance(clock()), me: state.me, layout: state.layout }); },

    // You
    renameMe(name: string) { set({ ...state, me: { ...state.me, name, updatedAt: stamp() } }); },

    // People
    addPerson(init: Partial<Person> = {}): ID {
      const person: Person = {
        id: newId(), name: '', company: '', title: '', url: '', connectedOn: null, sphereId: null,
        parentId: state.me.id, points: [], closenessOverride: null, powerYou: emptyPower(), powerThem: emptyPower(),
        holdYou: '', holdThem: '', stances: {}, updatedAt: stamp(), ...init,
      };
      set({ ...state, people: [...state.people, person] });
      return person.id;
    },
    updatePerson(id: ID, patch: PersonPatch) { mapPerson(id, (p) => ({ ...p, ...patch })); },
    setOverride(id: ID, band: Band | null) { mapPerson(id, (p) => ({ ...p, closenessOverride: band })); },
    setPower(id: ID, side: 'you' | 'them', source: Source, value: number) {
      const v = Math.max(0, Math.min(3, Math.round(value)));
      mapPerson(id, (p) =>
        side === 'you' ? { ...p, powerYou: { ...p.powerYou, [source]: v } } : { ...p, powerThem: { ...p.powerThem, [source]: v } },
      );
    },
    /** People directly under the deleted person move up to its parent. */
    deletePerson(id: ID) {
      const target = state.people.find((p) => p.id === id);
      if (!target) return;
      set({
        ...state,
        people: state.people
          .filter((p) => p.id !== id)
          .map((p) => (p.parentId === id ? { ...p, parentId: target.parentId, updatedAt: stamp() } : p)),
        crossTies: state.crossTies.filter((t) => t.a !== id && t.b !== id),
      });
    },
    /** Place under someone, under you (`me.id`), or in the tray (null). Their branch comes with them. */
    movePerson(id: ID, parentId: ID | null): MoveCheck {
      const check = canMove(state, id, parentId);
      if (check.ok) mapPerson(id, (p) => ({ ...p, parentId }));
      return check;
    },

    // Connection points
    addPoint(personId: ID, init: Partial<Point> = {}): ID {
      const point: Point = { id: newId(), kind: 'time', date: toDateString(clock()), note: '', mutual: false, ...init };
      mapPerson(personId, (p) => ({ ...p, points: [point, ...p.points] }));
      return point.id;
    },
    updatePoint(personId: ID, pointId: ID, patch: Partial<Omit<Point, 'id'>>) {
      mapPerson(personId, (p) => ({ ...p, points: p.points.map((pt) => (pt.id === pointId ? { ...pt, ...patch } : pt)) }));
    },
    removePoint(personId: ID, pointId: ID) {
      mapPerson(personId, (p) => ({ ...p, points: p.points.filter((pt) => pt.id !== pointId) }));
    },

    // Spheres
    addSphere(name: string): ID {
      const used = new Set(state.spheres.map((c) => c.color));
      let color = 0;
      while (used.has(color)) color++;
      const sphere = { id: newId(), name, color, updatedAt: stamp() };
      set({ ...state, spheres: [...state.spheres, sphere] });
      return sphere.id;
    },
    renameSphere(id: ID, name: string) {
      set({ ...state, spheres: state.spheres.map((c) => (c.id === id ? { ...c, name, updatedAt: stamp() } : c)) });
    },
    deleteSphere(id: ID) {
      set({
        ...state,
        spheres: state.spheres.filter((c) => c.id !== id),
        hiddenSpheres: state.hiddenSpheres.filter((h) => h !== id),
        people: state.people.map((p) => (p.sphereId === id ? { ...p, sphereId: null, updatedAt: stamp() } : p)),
      });
    },

    // Goals and stance
    addGoal(name: string): ID {
      const goal = { id: newId(), name, updatedAt: stamp() };
      set({ ...state, goals: [...state.goals, goal], activeGoalId: goal.id });
      return goal.id;
    },
    renameGoal(id: ID, name: string) {
      set({ ...state, goals: state.goals.map((g) => (g.id === id ? { ...g, name, updatedAt: stamp() } : g)) });
    },
    deleteGoal(id: ID) {
      set({
        ...state,
        goals: state.goals.filter((g) => g.id !== id),
        activeGoalId: state.activeGoalId === id ? null : state.activeGoalId,
        people: state.people.map((p) => {
          if (!(id in p.stances)) return p;
          const { [id]: _removed, ...rest } = p.stances;
          return { ...p, stances: rest, updatedAt: stamp() };
        }),
      });
    },
    setActiveGoal(id: ID | null) { set({ ...state, activeGoalId: id }); },
    /** null takes the person off the goal. */
    setStance(personId: ID, goalId: ID, stance: Stance | null) {
      mapPerson(personId, (p) => {
        const { [goalId]: _old, ...rest } = p.stances;
        return { ...p, stances: stance ? { ...rest, [goalId]: stance } : rest };
      });
    },

    // Cross-ties
    addCrossTie(a: ID, b: ID) {
      if (a === b) return;
      if (state.crossTies.some((t) => (t.a === a && t.b === b) || (t.a === b && t.b === a))) return;
      set({ ...state, crossTies: [...state.crossTies, { id: newId(), a, b, updatedAt: stamp() }] });
    },
    removeCrossTie(id: ID) { set({ ...state, crossTies: state.crossTies.filter((t) => t.id !== id) }); },

    // View settings that travel with the file
    setLayout(layout: Layout) { set({ ...state, layout }); },
    setShowCrossTies(show: boolean) { set({ ...state, showCrossTies: show }); },
    /** Show or hide one sphere (or NO_SPHERE). */
    setSphereVisible(id: ID, visible: boolean) {
      const hidden = state.hiddenSpheres.filter((h) => h !== id);
      set({ ...state, hiddenSpheres: visible ? hidden : [...hidden, id] });
    },
    showAllSpheres() { set({ ...state, hiddenSpheres: [] }); },
    /** Show only this sphere. */
    soloSphere(id: ID) {
      const all = [...state.spheres.map((s) => s.id), NO_SPHERE];
      set({ ...state, hiddenSpheres: all.filter((x) => x !== id) });
    },

    /** Adds people to the tray. Never invents power, closeness, a parent or a sphere. */
    importConnections(rows: ImportedConnection[]): ImportSummary {
      const known = new Set(state.people.map((p) => p.url && normalizeProfileUrl(p.url)).filter(Boolean));
      const summary: ImportSummary = { added: 0, skippedNoName: 0, skippedDuplicate: 0 };
      const added: Person[] = [];
      for (const row of rows) {
        if (!row.name.trim()) { summary.skippedNoName++; continue; }
        const key = row.url ? normalizeProfileUrl(row.url) : '';
        if (key && known.has(key)) { summary.skippedDuplicate++; continue; }
        if (key) known.add(key);
        added.push({
          id: newId(), name: row.name.trim(), company: row.company, title: row.title, url: row.url,
          connectedOn: row.connectedOn, sphereId: null, parentId: null, points: [], closenessOverride: null,
          powerYou: emptyPower(), powerThem: emptyPower(), holdYou: '', holdThem: '', stances: {}, updatedAt: stamp(),
        });
      }
      summary.added = added.length;
      if (added.length) set({ ...state, people: [...state.people, ...added] });
      return summary;
    },
  };
}

export type Store = ReturnType<typeof createStore>;
