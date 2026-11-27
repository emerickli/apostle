import { PRACTICE_KEYS, daysSince, lastPointDate, type PracticeKey } from '../core/rules';
import type { Alliance, ID } from '../core/model';
import type { Derived } from '../core/derive';
import { PRACTICE, STANCE_NAMES, ago } from './words';
import type { Highlight } from './App';

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  alliance: Alliance;
  derived: Derived;
  now: Date;
  highlight: Highlight | null;
  setHighlight: (h: Highlight | null) => void;
  onSelect: (id: ID) => void;
}

export function PracticePanel({ open, setOpen, alliance, derived, now, highlight, setHighlight, onSelect }: Props) {
  const { practice, standing } = derived;
  const total = PRACTICE_KEYS.reduce((n, k) => n + practice[k].length, 0);
  const byId = new Map(alliance.people.map((p) => [p.id, p]));
  const goal = alliance.goals.find((g) => g.id === alliance.activeGoalId);
  const pw = standing.power;
  const pwTotal = Math.max(1, pw.you + pw.even + pw.them);

  const reason = (key: PracticeKey, id: ID): string => {
    const p = byId.get(id)!;
    const bal = derived.balances.get(id)!;
    if (key === 'cold') {
      const last = lastPointDate(p);
      return last ? `Last contact ${ago(daysSince(last, now))}` : 'No contact logged';
    }
    if (key === 'exposed') return `They hold ${bal.them}, you hold ${bal.you}`;
    if (key === 'unused') return `You hold ${bal.you}, they hold ${bal.them}`;
    return `Only person in ${alliance.spheres.find((s) => s.id === p.sphereId)?.name ?? 'their sphere'}`;
  };

  return (
    <aside className={`practice frame ${open ? 'is-open' : ''}`} aria-label="Where you stand">
      <div className="frame-in">
        <button className="practice-head" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="hud-label hud-label-lg">Where you stand</span>
          <span className={`chev ${open ? 'is-open' : ''}`} aria-hidden />
        </button>
        {open && (
          <div className="practice-body">
            <section className="stand">
              {standing.goal && goal && (
                <div className="stand-row">
                  <h3 className="hud-label">On {goal.name}</h3>
                  <div className="stand-cells">
                    {(['with', 'uncommitted', 'against'] as const).map((s) => (
                      <div key={s} className={`stand-cell stance-${s}`}>
                        <span className="num num-lg">{standing.goal![s]}</span>
                        <span className="stand-cap">{STANCE_NAMES[s]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="stand-row">
                <h3 className="hud-label">Power</h3>
                <div className="power-split" aria-hidden>
                  <span className="ps-you" style={{ flexGrow: pw.you / pwTotal }} />
                  <span className="ps-even" style={{ flexGrow: pw.even / pwTotal }} />
                  <span className="ps-them" style={{ flexGrow: pw.them / pwTotal }} />
                </div>
                <div className="stand-cells">
                  <div className="stand-cell"><span className="num num-lg num-you">{pw.you}</span><span className="stand-cap">You lead</span></div>
                  <div className="stand-cell"><span className="num num-lg">{pw.even}</span><span className="stand-cap">Even</span></div>
                  <div className="stand-cell"><span className="num num-lg num-them">{pw.them}</span><span className="stand-cap">They lead</span></div>
                </div>
              </div>
            </section>

            <h3 className="hud-label attention-head">
              Needs attention {total > 0 && <span className="tag tag-alert">{total}</span>}
            </h3>
            {total === 0 && <p className="practice-hint">Nothing right now.</p>}
            {PRACTICE_KEYS.map((key) => {
              const ids = practice[key];
              if (key === 'cold' && !goal) return null;
              if (!ids.length) return null;
              const on = highlight?.key === key;
              const copy = PRACTICE[key];
              return (
                <section key={key} className={`practice-group ${on ? 'is-on' : ''}`}>
                  <button
                    className="practice-row"
                    aria-pressed={on}
                    title={on ? 'Stop highlighting' : 'Highlight on the map'}
                    onClick={() => setHighlight(on ? null : { kind: 'practice', key })}
                  >
                    <span className="practice-name">{copy.name}</span>
                    <span className="num">{ids.length}</span>
                    <span className="practice-todo">{copy.todo}</span>
                  </button>
                  <ul className="practice-people">
                    {ids.map((id) => (
                      <li key={id}>
                        <button className="person-row" onClick={() => onSelect(id)}>
                          <span className="person-row-name">{byId.get(id)?.name || 'Unnamed'}</span>
                          <span className="person-row-why">{reason(key, id)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            {!goal && <p className="practice-hint">Pick a goal at the top to see who is going cold on it.</p>}
          </div>
        )}
      </div>
    </aside>
  );
}
