// A screen for sorting people into spheres. One column per sphere, plus Unassigned.
// Drag a person between columns, or use the menu on their card.

import { useEffect, useState } from 'react';
import { NO_SPHERE, type Alliance, type ID } from '../core/model';
import type { Derived } from '../core/derive';
import { sphereKey } from '../core/view';
import { sphereColor, theme } from '../theme';
import { useStore } from './store-context';
import { BAND_NAMES } from './words';

interface Props {
  alliance: Alliance;
  derived: Derived;
  onClose: () => void;
  onOpenPerson: (id: ID) => void;
}

export function SpheresScreen({ alliance, derived, onClose, onOpenPerson }: Props) {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [drag, setDrag] = useState<{ id: ID; x: number; y: number; over: ID | null } | null>(null);
  const [armed, setArmed] = useState<ID | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target as HTMLElement).closest('input, select')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const hidden = new Set(alliance.hiddenSpheres);
  const columns = [
    { id: NO_SPHERE, name: 'Unassigned', color: theme.color.noSphere, editable: false },
    ...alliance.spheres.map((s) => ({ id: s.id, name: s.name, color: sphereColor(s.color), editable: true })),
  ];
  const people = [...alliance.people].sort((a, b) => a.name.localeCompare(b.name));
  const nameOf = (id: ID) => alliance.people.find((p) => p.id === id)?.name || 'Unnamed';

  const assign = (id: ID, sphere: ID) => store.updatePerson(id, { sphereId: sphere === NO_SPHERE ? null : sphere });

  const startDrag = (id: ID, e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('select, button')) return;
    const start = { x: e.clientX, y: e.clientY };
    let active = false;
    const columnAt = (x: number, y: number) =>
      (document.elementFromPoint(x, y)?.closest('[data-sphere]') as HTMLElement | null)?.dataset.sphere ?? null;
    const move = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 5) active = true;
      if (active) setDrag({ id, x: ev.clientX, y: ev.clientY, over: columnAt(ev.clientX, ev.clientY) });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDrag(null);
      if (!active) return;
      const target = columnAt(ev.clientX, ev.clientY);
      if (target) assign(id, target);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="spheres-screen" role="dialog" aria-modal="true" aria-labelledby="spheres-title">
      <header className="ss-head">
        <div>
          <h1 id="spheres-title" className="ss-title">Spheres</h1>
          <p className="ss-sub">Group people by the part of your life they belong to. Drag someone to another column to move them.</p>
        </div>
        <span className="push" />
        <input className="field ss-find" placeholder="Find a person" value={query} onChange={(e) => setQuery(e.target.value)} />
        <form
          className="ss-new"
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim()) store.addSphere(newName.trim());
            setNewName('');
          }}
        >
          <input className="field" placeholder="New sphere" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="hud-btn hud-btn-sm" type="submit" disabled={!newName.trim()}>Add</button>
        </form>
        <button className="hud-btn hud-btn-primary" onClick={onClose}>Done</button>
      </header>

      <div className="ss-cols">
        {columns.map((col) => {
          const members = people.filter((p) => sphereKey(alliance, p) === col.id);
          const shown = q ? members.filter((p) => `${p.name} ${p.company} ${p.title}`.toLowerCase().includes(q)) : members;
          const visible = !hidden.has(col.id);
          return (
            <section
              key={col.id}
              data-sphere={col.id}
              className={`ss-col frame ${drag?.over === col.id ? 'is-over' : ''}`}
              style={{ ['--dot' as string]: col.color }}
            >
              <div className="frame-in ss-col-in">
                <header className="ss-col-head">
                  <span className="sphere-dot is-solid" />
                  {col.editable ? (
                    <input
                      className="field field-inline ss-col-name"
                      value={col.name}
                      aria-label="Sphere name"
                      onChange={(e) => store.renameSphere(col.id, e.target.value)}
                    />
                  ) : (
                    <span className="ss-col-name ss-col-name-fixed">{col.name}</span>
                  )}
                  <span className="num">{members.length}</span>
                </header>
                <div className="ss-col-tools">
                  <button
                    className={`pill ${visible ? 'is-on' : ''}`}
                    aria-pressed={visible}
                    onClick={() => store.setSphereVisible(col.id, !visible)}
                    title="Whether this sphere shows on the map and in charts"
                  >
                    {visible ? 'Shown' : 'Hidden'}
                  </button>
                  {col.editable && (
                    <button
                      className={`pill ${armed === col.id ? 'is-on' : ''}`}
                      onClick={() => {
                        if (armed === col.id) { store.deleteSphere(col.id); setArmed(null); }
                        else setArmed(col.id);
                      }}
                      onBlur={() => setArmed(null)}
                    >
                      {armed === col.id ? 'Click to confirm' : 'Delete'}
                    </button>
                  )}
                </div>
                <ul className="ss-list">
                  {shown.map((p) => (
                    <li
                      key={p.id}
                      className={`ss-card ${drag?.id === p.id ? 'is-dragging' : ''}`}
                      onPointerDown={(e) => startDrag(p.id, e)}
                    >
                      <div className="ss-card-top">
                        <button className="ss-card-name" onClick={() => onOpenPerson(p.id)} title="Open their card">
                          {p.name || 'Unnamed'}
                        </button>
                        <span className={`tone tone-${derived.balances.get(p.id)?.tone}`} title="Who holds more power" />
                      </div>
                      <div className="ss-card-sub">
                        {[p.title, p.company].filter(Boolean).join(', ') || ' '}
                      </div>
                      <div className="ss-card-foot">
                        <span className="tag">{BAND_NAMES[derived.bands.get(p.id) ?? 'weak']}</span>
                        <select
                          className="field ss-move"
                          aria-label={`Move ${p.name} to`}
                          value={col.id}
                          onChange={(e) => assign(p.id, e.target.value)}
                        >
                          {columns.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </li>
                  ))}
                  {shown.length === 0 && <li className="ss-empty">{q ? 'No match' : 'Drop people here'}</li>}
                </ul>
              </div>
            </section>
          );
        })}
      </div>

      {drag && (
        <div className="drag-ghost is-valid" style={{ left: drag.x, top: drag.y }}>{nameOf(drag.id)}</div>
      )}
    </div>
  );
}
