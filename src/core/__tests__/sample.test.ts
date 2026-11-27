import { describe, expect, it } from 'vitest';
import { buildSample } from '../sample';
import { derive } from '../derive';
import { createStore, type StorageAdapter } from '../store';
import { readAlliance } from '../migrate';
import { parseConnections } from '../linkedin';

const now = new Date(2026, 10, 27);
const memory = (): StorageAdapter => ({ load: async () => null, save: async () => {} });

describe('sample alliance', () => {
  const a = buildSample(now);
  const d = derive(a, now);
  const name = (ids: string[]) => ids.map((id) => a.people.find((p) => p.id === id)!.name).sort();

  it('flags exactly the people the brief describes', () => {
    expect(name(d.practice.cold)).toEqual(['Laila Okonkwo']);
    expect(name(d.practice.exposed)).toEqual(['Jonah Peck']);
    expect(name(d.practice.unused)).toEqual(['Sofia Rahman']);
    expect(name(d.practice.bridge)).toEqual(['Chris Adelayo']);
  });

  it('puts Evan in the tray and everyone else on the map', () => {
    expect(d.placed.size).toBe(12);
    expect(name(a.people.filter((p) => !d.placed.has(p.id)).map((p) => p.id))).toEqual(['Evan Cho']);
  });

  it('survives a save file round trip', () => {
    const back = readAlliance(JSON.parse(JSON.stringify(a)), now);
    expect(back).toEqual(a);
  });
});

describe('tree moves', () => {
  it('refuses a cycle, moves branches to the tray, and lifts children on delete', () => {
    const store = createStore(memory(), () => now);
    store.loadSample();
    const s = store.getState();
    const id = (n: string) => s.people.find((p) => p.name === n)!.id;
    expect(store.movePerson(id('Mira Chen'), id('Jonah Peck'))).toEqual({ ok: false, reason: 'cycle' });
    store.movePerson(id('Naomi Berg'), null);
    let d = derive(store.getState(), now);
    expect(d.placed.has(id('Ruth Ibarra'))).toBe(false);
    store.movePerson(id('Naomi Berg'), id('Mira Chen'));
    store.deletePerson(id('Naomi Berg'));
    expect(store.getState().people.find((p) => p.name === 'Ruth Ibarra')!.parentId).toBe(id('Mira Chen'));
    expect(store.getState().crossTies.some((t) => t.a === id('Naomi Berg') || t.b === id('Naomi Berg'))).toBe(false);
  });
});

describe('LinkedIn import', () => {
  it('skips rows with no name and URLs already present', () => {
    const csv = 'Notes:\n"When exporting..."\n\nFirst Name,Last Name,URL,Email Address,Company,Position,Connected On\n' +
      'Ada,Byron,https://www.linkedin.com/in/ada,,,,26 Nov 2026\n,,https://www.linkedin.com/in/x,,,,\n' +
      'Ada,Again,https://www.linkedin.com/in/ada/,,,,01 Jan 2025\n';
    const store = createStore(memory(), () => now);
    const sum = store.importConnections(parseConnections(csv));
    expect(sum).toEqual({ added: 1, skippedNoName: 1, skippedDuplicate: 1 });
    const p = store.getState().people[0];
    expect(p).toMatchObject({ name: 'Ada Byron', connectedOn: '2026-11-26', parentId: null, sphereId: null });
  });
});

describe('sphere visibility', () => {
  it('hides a sphere and hangs its children from the nearest visible ancestor', async () => {
    const { viewAlliance } = await import('../view');
    const store = createStore(memory(), () => now);
    store.loadSample();
    const s = store.getState();
    const family = s.spheres.find((x) => x.name === 'Family')!.id;
    const career = s.spheres.find((x) => x.name === 'Career')!.id;
    const tom = s.people.find((p) => p.name === 'Tom Brennan')!.id;
    store.movePerson(tom, s.people.find((p) => p.name === 'Mira Chen')!.id);
    store.setSphereVisible(career, false);
    const d = derive(store.getState(), now);
    const view = viewAlliance(store.getState(), d.placed, d.visible);
    const ruth = view.people.find((p) => p.name === 'Ruth Ibarra');
    expect(view.people.some((p) => p.name === 'Naomi Berg')).toBe(false);
    expect(ruth).toBeUndefined();
    expect(view.people.find((p) => p.id === tom)!.parentId).toBe(s.me.id);
    const evan = view.people.find((p) => p.name === 'Evan Cho');
    expect(evan).toBeDefined();
    expect(d.practice.cold).toEqual([]);
    store.soloSphere(family);
    expect(derive(store.getState(), now).visible.size).toBe(2);
    store.showAllSpheres();
    expect(derive(store.getState(), now).visible.size).toBe(13);
  });

  it('opens an older save that still says circles', () => {
    const old = JSON.parse(JSON.stringify(buildSample(now)));
    old.circles = old.spheres; delete old.spheres;
    for (const p of old.people) { p.circleId = p.sphereId; delete p.sphereId; }
    delete old.hiddenSpheres;
    const back = readAlliance(old, now);
    expect(back.spheres).toHaveLength(5);
    expect(back.people.find((p) => p.name === 'Leo Varga')!.sphereId).toBe(back.spheres.find((x) => x.name === 'Family')!.id);
  });
});

describe('save format version 2', () => {
  it('adds a Family sphere once to older saves, and respects deleting it later', () => {
    const old = JSON.parse(JSON.stringify(buildSample(now)));
    old.version = 1;
    old.spheres = old.spheres.filter((s: { name: string }) => s.name !== 'Family');
    const up = readAlliance(old, now);
    expect(up.version).toBe(2);
    expect(up.spheres.filter((s) => s.name === 'Family')).toHaveLength(1);

    const removed = { ...up, spheres: up.spheres.filter((s) => s.name !== 'Family') };
    expect(readAlliance(JSON.parse(JSON.stringify(removed)), now).spheres.some((s) => s.name === 'Family')).toBe(false);
  });
});
