// Four plain chart types: pie, bar, histogram and line. SVG, neon on black.
// Values and labels stay in text colors; color marks identity only.

import { useEffect, useRef, useState } from 'react';
import type { Tip } from './ChartsView';

type OnTip = (tip: Tip | null) => void;

const tipAt = (e: React.PointerEvent, title: string, lines: string[]): Tip => ({ x: e.clientX, y: e.clientY, title, lines });

export interface Slice { label: string; value: number; color: string }

/** A donut pie with its legend beside it. */
export function Pie({ slices, center, onTip, size = 132 }: { slices: Slice[]; center: string; onTip: OnTip; size?: number }) {
  const total = slices.reduce((n, s) => n + s.value, 0);
  const r = 50;
  const inner = 32;
  let angle = -Math.PI / 2;
  const gap = total > 0 && slices.filter((s) => s.value > 0).length > 1 ? 0.03 : 0;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const sweep = (s.value / total) * Math.PI * 2;
      const a0 = angle + gap / 2;
      const a1 = angle + sweep - gap / 2;
      angle += sweep;
      if (sweep >= Math.PI * 2 - 0.001) {
        return { s, d: `M 0 ${-r} A ${r} ${r} 0 1 1 -0.01 ${-r} L -0.01 ${-inner} A ${inner} ${inner} 0 1 0 0 ${-inner} Z` };
      }
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (rad: number, a: number) => `${Math.cos(a) * rad} ${Math.sin(a) * rad}`;
      return { s, d: `M ${p(r, a0)} A ${r} ${r} 0 ${large} 1 ${p(r, a1)} L ${p(inner, a1)} A ${inner} ${inner} 0 ${large} 0 ${p(inner, a0)} Z` };
    });
  return (
    <div className="pie">
      <svg viewBox="-60 -60 120 120" width={size} height={size} role="img" aria-label={slices.map((s) => `${s.label} ${s.value}`).join(', ')}>
        {total === 0 && <circle r={(r + inner) / 2} fill="none" stroke="rgba(238,243,255,0.12)" strokeWidth={r - inner} />}
        {arcs.map(({ s, d }) => (
          <path
            key={s.label}
            d={d}
            fill={s.color}
            className="pie-slice"
            onPointerMove={(e) => onTip(tipAt(e, s.label, [`${s.value} of ${total}`, `${Math.round((s.value / total) * 100)}%`]))}
            onPointerLeave={() => onTip(null)}
          />
        ))}
        <text y={6} textAnchor="middle" className="pie-center">{center}</text>
      </svg>
      <ul className="pie-key">
        {slices.map((s) => (
          <li key={s.label} className={s.value ? '' : 'is-zero'}>
            <i style={{ background: s.color }} />
            <span>{s.label}</span>
            <b>{s.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface BarRow { id: string; label: string; you: number; them: number; dot?: string }

/** Horizontal bars, two per row: power you hold and power they hold. */
export function PowerBars({ rows, onTip, onClick, limit = 8 }: { rows: BarRow[]; onTip: OnTip; onClick?: (id: string) => void; limit?: number }) {
  const shown = rows.slice(0, limit);
  const max = Math.max(1, ...shown.map((r) => Math.max(r.you, r.them)));
  return (
    <div className="pbars">
      <div className="chart-key">
        <span><i className="key-you" /> You</span>
        <span><i className="key-them" /> Them</span>
      </div>
      {shown.map((r) => (
        <button
          key={r.id}
          className="pbar-row"
          onClick={() => onClick?.(r.id)}
          disabled={!onClick}
          onPointerMove={(e) => onTip(tipAt(e, r.label, [`You hold ${r.you}`, `They hold ${r.them}`]))}
          onPointerLeave={() => onTip(null)}
        >
          <span className="pbar-label">
            {r.dot && <span className="sphere-dot is-solid" style={{ ['--dot' as string]: r.dot }} />}
            {r.label}
          </span>
          <span className="pbar-bars">
            <span className="pbar-line"><i className="bar-fill fill-you" style={{ width: `${(r.you / max) * 100}%` }} /><b>{r.you}</b></span>
            <span className="pbar-line"><i className="bar-fill fill-them" style={{ width: `${(r.them / max) * 100}%` }} /><b>{r.them}</b></span>
          </span>
        </button>
      ))}
      {rows.length > limit && <p className="chart-note">+{rows.length - limit} more</p>}
    </div>
  );
}

/** Vertical columns with the count on top. */
export function Histogram({ bins, onTip, unit = 'people', tall }: { bins: { label: string; value: number }[]; onTip: OnTip; unit?: string; tall?: boolean }) {
  const max = Math.max(1, ...bins.map((b) => b.value));
  return (
    <div className={`hist ${tall ? 'hist-tall' : ''}`}>
      {bins.map((b) => (
        <div
          key={b.label}
          className="hist-col"
          onPointerMove={(e) => onTip(tipAt(e, b.label, [`${b.value} ${b.value === 1 ? unit.replace(/s$/, '') : unit}`]))}
          onPointerLeave={() => onTip(null)}
        >
          <span className="hist-val">{b.value}</span>
          <span className="hist-track">
            <i style={{ height: `${(b.value / max) * 100}%` }} />
          </span>
          <span className="hist-label">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

export interface Series { name: string; color: string; values: number[] }

/** Lines over the months, with a hover line that reads every series at that month. */
export function LineChart({ months, series, onTip, height = 150 }: { months: string[]; series: Series[]; onTip: OnTip; height?: number }) {
  // Draw at the real pixel width so text keeps its size at any width.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(420);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setW(Math.max(200, el.clientWidth)));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const H = height;
  const m = { l: 26, r: 10, t: 10, b: 22 };
  const max = Math.max(2, ...series.flatMap((s) => s.values));
  const top = Math.ceil(max / 2) * 2;
  const x = (i: number) => m.l + (i / Math.max(1, months.length - 1)) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - v / top) * (H - m.t - m.b);
  const label = (key: string) => new Date(Number(key.slice(0, 4)), Number(key.slice(5)) - 1, 1).toLocaleString('en', { month: 'short' });

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.max(0, Math.min(months.length - 1, Math.round(((px - m.l) / (W - m.l - m.r)) * (months.length - 1))));
    const d = new Date(Number(months[i].slice(0, 4)), Number(months[i].slice(5)) - 1, 1);
    onTip(tipAt(e, d.toLocaleString('en', { month: 'long', year: 'numeric' }), series.map((s) => `${s.name}: ${s.values[i]}`)));
  };

  return (
    <div className="line" ref={box}>
      {series.length > 1 && (
        <div className="chart-key">
          {series.map((s) => (
            <span key={s.name}><i className="key-line" style={{ background: s.color }} /> {s.name}</span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="line-svg" role="img" aria-label="Contacts logged per month">
        {[0, top / 2, top].map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className="grid-line" />
            <text x={m.l - 6} y={y(v) + 3.5} textAnchor="end" className="axis-text">{v}</text>
          </g>
        ))}
        {months.map((k, i) => (W > 520 || i % 2 === 0) && (
          <text key={k} x={x(i)} y={H - 6} textAnchor="middle" className="axis-text">{label(k)}</text>
        ))}
        {series.map((s) => (
          <polyline
            key={s.name}
            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            className="line-path"
          />
        ))}
        {series.map((s) =>
          s.values.map((v, i) => v > 0 && (
            <circle key={`${s.name}${i}`} cx={x(i)} cy={y(v)} r={2.5} fill={s.color} />
          )),
        )}
        <rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} fill="transparent" onPointerMove={onMove} onPointerLeave={() => onTip(null)} />
      </svg>
    </div>
  );
}

export function verdict(lead: number) {
  if (lead > 0) return { text: `You lead by ${lead}`, tone: 'you' as const };
  if (lead < 0) return { text: `They lead by ${-lead}`, tone: 'them' as const };
  return { text: 'Even', tone: 'even' as const };
}
