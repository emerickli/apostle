import { useState } from 'react';
import { LAYOUTS, NO_SPHERE, type Alliance, type ID } from '../core/model';
import { sphereKey } from '../core/view';
import { useStore } from './store-context';
import { Menu } from './Menu';
import { LAYOUT_NAMES } from './words';
import { FONT_SETS, applyFontSet, currentFontSet, sphereColor, theme, type FontSetId } from '../theme';

interface Props {
  alliance: Alliance;
  onAdd: () => void;
  onHome: () => void;
  onManage: () => void;
  files: { download: () => void; open: () => void; importConnections: () => void; clear: () => void };
}

function NewItem({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <form
      className="new-item"
      onSubmit={(e) => {
        e.preventDefault();
        const name = value.trim();
        if (!name) return;
        onAdd(name);
        setValue('');
      }}
    >
      <input className="field" value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} />
      <button className="hud-btn hud-btn-sm" type="submit" disabled={!value.trim()}>Add</button>
    </form>
  );
}

/** Toggles for which spheres are on the map. All on is the full map. */
function SphereBar({ alliance, onManage }: { alliance: Alliance; onManage: () => void }) {
  const store = useStore();
  const counts = new Map<ID, number>();
  for (const p of alliance.people) {
    const k = sphereKey(alliance, p);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const hidden = new Set(alliance.hiddenSpheres);
  const chips = [
    ...alliance.spheres.map((s) => ({ id: s.id, name: s.name, color: sphereColor(s.color) })),
    ...(counts.get(NO_SPHERE) ? [{ id: NO_SPHERE, name: 'No sphere', color: theme.color.noSphere }] : []),
  ];
  const allOn = chips.every((c) => !hidden.has(c.id));

  return (
    <div className="spherebar" role="group" aria-label="Spheres shown on the map">
      <button className={`sphere-chip sphere-all ${allOn ? 'is-on' : ''}`} aria-pressed={allOn} onClick={() => store.showAllSpheres()}>
        All
      </button>
      {chips.map((c) => {
        const on = !hidden.has(c.id);
        return (
          <button
            key={c.id}
            className={`sphere-chip ${on ? 'is-on' : ''}`}
            style={{ ['--dot' as string]: c.color }}
            aria-pressed={on}
            title={on ? `Hide ${c.name}` : `Show ${c.name}`}
            onClick={() => store.setSphereVisible(c.id, !on)}
            onDoubleClick={() => store.soloSphere(c.id)}
          >
            <span className="sphere-dot" />
            {c.name}
            <span className="sphere-count">{counts.get(c.id) ?? 0}</span>
          </button>
        );
      })}
      <button className="hud-btn hud-btn-sm sphere-manage" onClick={onManage}>Manage</button>
    </div>
  );
}

export function TopBar({ alliance, onAdd, onHome, onManage, files }: Props) {
  const [fontSet, setFontSet] = useState<FontSetId>(currentFontSet());
  const store = useStore();
  const activeGoal = alliance.goals.find((g) => g.id === alliance.activeGoalId);
  const charts = alliance.layout === 'charts';

  return (
    <>
      <header className="topbar">
        <button className="brand" onClick={onHome} title="Home">
          <span className="wordmark">Apostle</span>
        </button>

        <nav className="tabs" aria-label="View">
          {LAYOUTS.map((l, i) => (
            <button
              key={l}
              className={`tab ${alliance.layout === l ? 'is-on' : ''}`}
              aria-pressed={alliance.layout === l}
              title={`Press ${i + 1}`}
              onClick={() => store.setLayout(l)}
            >
              <span className="tab-key">{i + 1}</span>
              {LAYOUT_NAMES[l]}
            </button>
          ))}
        </nav>

        <div className="controls">
          <button
            className={`toggle ${alliance.showCrossTies ? 'is-on' : ''}`}
            role="switch"
            aria-checked={alliance.showCrossTies}
            disabled={charts}
            title="Show lines between people who know each other"
            onClick={() => store.setShowCrossTies(!alliance.showCrossTies)}
          >
            <span className="toggle-track"><span className="toggle-dot" /></span>
            Who knows who
          </button>

          <Menu label={<>Goal: <b className="menu-value">{activeGoal?.name ?? 'None'}</b></>}>
            {(close) => (
              <div className="pop-list">
                <p className="pop-head">Focus on a goal</p>
                <p className="pop-note">Sets the goal counts and who is going cold.</p>
                <button className={`pop-row ${!activeGoal ? 'is-on' : ''}`} onClick={() => { store.setActiveGoal(null); close(); }}>
                  <span className="radio" /> No goal
                </button>
                {alliance.goals.map((g) => (
                  <div key={g.id} className={`pop-row ${g.id === alliance.activeGoalId ? 'is-on' : ''}`}>
                    <button
                      className="radio-btn"
                      aria-pressed={g.id === alliance.activeGoalId}
                      aria-label={`Focus on ${g.name}`}
                      onClick={() => { store.setActiveGoal(g.id); close(); }}
                    >
                      <span className="radio" />
                    </button>
                    <input
                      className="field field-inline"
                      value={g.name}
                      aria-label="Goal name"
                      onChange={(e) => store.renameGoal(g.id, e.target.value)}
                    />
                    <button className="icon-btn" aria-label={`Delete goal ${g.name}`} onClick={() => store.deleteGoal(g.id)}>×</button>
                  </div>
                ))}
                <NewItem placeholder="New goal" onAdd={(name) => store.addGoal(name)} />
              </div>
            )}
          </Menu>

          <Menu label={<span style={{ textTransform: 'none' }}>Aa</span>} title="Font">
            {(close) => (
              <div className="pop-list pop-actions">
                {FONT_SETS.map((f) => (
                  <button
                    key={f.id}
                    className={`pop-row font-row ${fontSet === f.id ? 'is-on' : ''}`}
                    style={{ fontFamily: f.ui }}
                    onClick={() => { applyFontSet(f.id); setFontSet(f.id); close(); }}
                  >
                    <span className="radio" />
                    <span className="font-name">{f.name}</span>
                    <span className="font-sample" style={{ fontFamily: f.mono }}>0123</span>
                  </button>
                ))}
              </div>
            )}
          </Menu>

          <button className="hud-btn hud-btn-primary" onClick={onAdd}>Add person</button>

          <Menu label="File">
            {(close) => (
              <div className="pop-list pop-actions">
                <button className="pop-row" onClick={() => { close(); files.download(); }}>Save to file</button>
                <button className="pop-row" onClick={() => { close(); files.open(); }}>Open file</button>
                <button className="pop-row" onClick={() => { close(); files.importConnections(); }}>Import LinkedIn connections</button>
                <div className="pop-rule" />
                <button className="pop-row pop-row-quiet" onClick={() => { close(); files.clear(); }}>Start over</button>
              </div>
            )}
          </Menu>
        </div>
      </header>
      <SphereBar alliance={alliance} onManage={onManage} />
    </>
  );
}
