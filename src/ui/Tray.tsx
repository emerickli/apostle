import { forwardRef, useState } from 'react';
import type { Alliance, ID } from '../core/model';
import { descendantIds, trayRoots } from '../core/tree';

interface Props {
  alliance: Alliance;
  placed: Set<ID>;
  visible: Set<ID>;
  dropping: boolean;
  hot: boolean;
  onPointerDown: (id: ID, e: React.PointerEvent) => void;
}

export const Tray = forwardRef<HTMLDivElement, Props>(function Tray({ alliance, placed, visible, dropping, hot, onPointerDown }, ref) {
  const [query, setQuery] = useState('');
  const roots = trayRoots(alliance, placed).filter((p) => visible.has(p.id));
  const unplaced = alliance.people.filter((p) => !placed.has(p.id) && visible.has(p.id)).length;
  const q = query.trim().toLowerCase();
  const shown = q ? roots.filter((p) => p.name.toLowerCase().includes(q) || p.company.toLowerCase().includes(q)) : roots;

  return (
    <div ref={ref} className={`tray frame ${dropping ? 'is-dropping' : ''} ${hot ? 'is-hot' : ''}`} aria-label="Unplaced people">
      <div className="frame-in tray-in">
        <div className="tray-head">
          <span className="hud-label">Not on the map</span>
          <span className="tag">{unplaced}</span>
          {roots.length > 8 && (
            <input className="field tray-search" placeholder="Find" value={query} onChange={(e) => setQuery(e.target.value)} />
          )}
        </div>
        <div className="tray-items">
          {dropping && <span className="tray-drop">Drop here to take off the map</span>}
          {!dropping && roots.length === 0 && <span className="tray-empty">Everyone is placed. New imports land here.</span>}
          {!dropping &&
            shown.slice(0, 200).map((p) => {
              const under = descendantIds(alliance, p.id).size;
              return (
                <button
                  key={p.id}
                  className="chip"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onPointerDown(p.id, e);
                  }}
                  title="Drag onto someone on the map to place them. Click to open."
                >
                  {p.name || 'Unnamed'}
                  {under > 0 && <span className="chip-sub">+{under}</span>}
                </button>
              );
            })}
          {!dropping && shown.length > 200 && <span className="tray-empty">{shown.length - 200} more. Use Find.</span>}
        </div>
      </div>
    </div>
  );
});
