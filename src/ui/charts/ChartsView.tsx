// The Charts view: pick one chart, then see it per sphere or for everyone.

import { useState } from 'react';
import { BANDS, type Alliance, type ID } from '../../core/model';
import type { Derived } from '../../core/derive';
import { chartStats, type PersonStat, type SphereStat } from '../../core/stats';
import { sphereColor, theme } from '../../theme';
import { BAND_NAMES } from '../words';
import { Histogram, LineChart, Pie, PowerBars, verdict, type Slice } from './SimpleCharts';

export interface Tip { x: number; y: number; title: string; lines: string[] }

type Kind = 'hand' | 'power' | 'close' | 'contacts' | 'table';
type Scope = 'each' | 'all';
const KINDS: [Kind, string][] = [
  ['hand', 'Upper hand'],
  ['power', 'Power'],
  ['close', 'Closeness'],
  ['contacts', 'Contacts'],
  ['table', 'Table'],
];

function useSaved<T extends string>(key: string, fallback: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => (localStorage.getItem(key) as T) || fallback);
  return [v, (next: T) => { setV(next); localStorage.setItem(key, next); }];
}

interface Props {
  alliance: Alliance;
  derived: Derived;
  now: Date;
  selectedId: ID | null;
  onSelect: (id: ID) => void;
}

const upperHand = (people: PersonStat[]): Slice[] => [
  { label: 'You lead', value: people.filter((p) => p.lead > 0).length, color: theme.color.you },
  { label: 'Even', value: people.filter((p) => p.lead === 0).length, color: 'rgba(238, 243, 255, 0.55)' },
  { label: 'They lead', value: people.filter((p) => p.lead < 0).length, color: theme.color.them },
];
const closeness = (people: PersonStat[]) => BANDS.map((b) => ({ label: BAND_NAMES[b], value: people.filter((p) => p.band === b).length }));
const byPower = (people: PersonStat[]) =>
  [...people].sort((a, b) => b.them + b.you - (a.them + a.you)).map((p) => ({ id: p.id, label: p.name, you: p.you, them: p.them }));

export function ChartsView({ alliance, derived, now, selectedId, onSelect }: Props) {
  const [kind, setKind] = useSaved<Kind>('apostle.chart', 'hand');
  const [scope, setScope] = useSaved<Scope>('apostle.chartScope', 'each');
  const [tip, setTip] = useState<Tip | null>(null);
  const { people, spheres, months } = chartStats(alliance, derived, now);
  const colorOf = (s: SphereStat) => (s.color !== null ? sphereColor(s.color) : theme.color.noSphere);
  const sphereOf = new Map(spheres.map((s) => [s.id, s]));

  const one = (s: SphereStat) => {
    if (kind === 'hand') return <Pie slices={upperHand(s.people)} center={String(s.people.length)} onTip={setTip} size={120} />;
    if (kind === 'power') return <PowerBars rows={byPower(s.people)} onTip={setTip} onClick={onSelect} limit={6} />;
    if (kind === 'close') return <Histogram bins={closeness(s.people)} onTip={setTip} />;
    return <LineChart months={months} series={[{ name: s.name, color: colorOf(s), values: s.contacts }]} onTip={setTip} height={140} />;
  };

  const all = () => {
    if (kind === 'hand') return <Pie slices={upperHand(people)} center={String(people.length)} onTip={setTip} size={220} />;
    if (kind === 'power') return <PowerBars rows={spheres.map((s) => ({ id: s.id, label: s.name, you: s.you, them: s.them }))} onTip={setTip} limit={20} />;
    if (kind === 'close') return <Histogram bins={closeness(people)} onTip={setTip} tall />;
    return <LineChart months={months} series={spheres.map((s) => ({ name: s.name, color: colorOf(s), values: s.contacts }))} onTip={setTip} height={280} />;
  };

  return (
    <main className="charts" onPointerLeave={() => setTip(null)}>
      <div className="charts-head">
        <div className="seg-toggle" role="tablist" aria-label="Chart">
          {KINDS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? 'is-on' : ''} onClick={() => { setTip(null); setKind(k); }}>
              {label}
            </button>
          ))}
        </div>
        {kind !== 'table' && (
          <div className="seg-toggle" role="tablist" aria-label="Scope">
            {([['each', 'By sphere'], ['all', 'All']] as const).map(([s, label]) => (
              <button key={s} role="tab" aria-selected={scope === s} className={scope === s ? 'is-on' : ''} onClick={() => { setTip(null); setScope(s); }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {people.length === 0 && <p className="charts-empty">Turn on a sphere above.</p>}

      {people.length > 0 && kind !== 'table' && scope === 'each' && (
        <div className={`cards cards-${kind}`}>
          {spheres.map((s) => (
            <section key={s.id} className="chart-card frame" style={{ ['--dot' as string]: colorOf(s) }}>
              <div className="frame-in card-in">
                <header className="card-head">
                  <span className="sphere-bar" />
                  <h2 className="card-title">{s.name}</h2>
                  <span className="card-count">{s.people.length}</span>
                </header>
                {one(s)}
              </div>
            </section>
          ))}
        </div>
      )}

      {people.length > 0 && kind !== 'table' && scope === 'all' && (
        <section className={`chart-card frame chart-big chart-big-${kind}`}>
          <div className="frame-in card-in">{all()}</div>
        </section>
      )}

      {people.length > 0 && kind === 'table' && (
        <section className="chart-card frame">
          <div className="frame-in card-in">
            <table className="ptable">
              <thead>
                <tr>
                  <th>Name</th><th>Sphere</th><th>Closeness</th><th className="r">You</th><th className="r">Them</th><th>Power</th>
                </tr>
              </thead>
              <tbody>
                {[...people].sort((a, b) => a.lead - b.lead).map((p) => {
                  const v = verdict(p.lead);
                  return (
                    <tr key={p.id} className={p.id === selectedId ? 'is-on' : ''} onClick={() => onSelect(p.id)}>
                      <td>{p.name}</td>
                      <td className="dim">{sphereOf.get(p.sphere)?.name ?? 'No sphere'}</td>
                      <td>{BAND_NAMES[p.band]}</td>
                      <td className="r num-cell">{p.you}</td>
                      <td className="r num-cell">{p.them}</td>
                      <td><span className="verdict"><i className={`verdict-mark mark-${v.tone}`} />{v.text}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tip && (
        <div className="chart-tip" style={{ left: tip.x, top: tip.y }} role="tooltip">
          <b>{tip.title}</b>
          {tip.lines.map((l) => <span key={l}>{l}</span>)}
        </div>
      )}
    </main>
  );
}
