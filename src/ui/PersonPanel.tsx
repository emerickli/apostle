import { useEffect, useRef, useState } from 'react';
import {
  AVATARS, BANDS, POINT_KINDS, SOURCES, STANCES,
  type Alliance, type ID, type Person, type PointKind, type Source, type Stance,
} from '../core/model';
import type { Derived } from '../core/derive';
import { computedBand, daysSince, lastPointDate } from '../core/rules';
import { descendantIds } from '../core/tree';
import { thresholds } from '../core/thresholds';
import { useStore } from './store-context';
import { BAND_NAMES, POINT_NAMES, SOURCE_GROUPS, SOURCE_HINTS, SOURCE_NAMES, STANCE_NAMES, ago } from './words';
import { Avatar, DEFAULT_AVATAR } from './Avatar';

interface Props {
  person: Person;
  alliance: Alliance;
  derived: Derived;
  now: Date;
  onClose: () => void;
  onPlace: (id: ID, parentId: ID | null) => void;
  onSay: (message: string) => void;
  onDeleted: (message: string, before: Alliance, reselect?: ID) => void;
}

const TRAY = '__tray';
const NEW = '__new';
/** Contact log entries shown before Show all. */
const LOG_SHOWN = 3;
/** Closeness levels, weakest first, as the meter reads left to right. */
const STEPS = [...BANDS].reverse();

function Section({ label, aside, children }: { label: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="sec">
      <header className="sec-head">
        <h3 className="hud-label">{label}</h3>
        <span className="sec-rule" />
        {aside}
      </header>
      {children}
    </section>
  );
}

function PowerMeter({ person }: { person: Person }) {
  const store = useStore();
  // Rows show only for sources in use, plus any added while this card is open.
  const [added, setAdded] = useState<Source[]>([]);
  const [picking, setPicking] = useState(false);
  const you = SOURCES.reduce((n, s) => n + person.powerYou[s], 0);
  const them = SOURCES.reduce((n, s) => n + person.powerThem[s], 0);
  const lead = you - them;
  const hot = Math.abs(lead) >= thresholds.power.hotGap;
  const shown = SOURCES.filter((s) => person.powerYou[s] || person.powerThem[s] || added.includes(s));
  const set = (side: 'you' | 'them', s: Source, current: number, i: number) =>
    store.setPower(person.id, side, s, current === i ? i - 1 : i);
  const remove = (s: Source) => {
    store.setPower(person.id, 'you', s, 0);
    store.setPower(person.id, 'them', s, 0);
    setAdded((a) => a.filter((x) => x !== s));
  };

  return (
    <div className={`pm ${hot ? 'is-hot' : ''}`}>
      {shown.length > 0 && <>
      <div className="pm-head">
        <div className="pm-total pm-you">
          <span className="tag tag-you">{you}</span>
          <span className="hud-label">You hold</span>
        </div>
        <div className="pm-total pm-them">
          <span className="hud-label">They hold</span>
          <span className="tag tag-them">{them}</span>
        </div>
      </div>
      <div className="pm-balance" aria-hidden>
        <span
          className={`pm-bar ${lead > 0 ? 'is-you' : lead < 0 ? 'is-them' : 'is-even'}`}
          style={{ ['--lead' as string]: `${Math.min(1, Math.abs(lead) / 18) * 50}%` }}
        />
      </div>
      </>}
      {shown.map((s) => (
        <div className="pm-row" key={s}>
          <div className="pm-side pm-side-you">
            {[3, 2, 1].map((i) => (
              <button
                key={i}
                className={`seg seg-you ${person.powerYou[s] >= i ? 'is-on' : ''}`}
                aria-label={`${SOURCE_NAMES[s]}, power you hold, set to ${person.powerYou[s] === i ? i - 1 : i}`}
                onClick={() => set('you', s, person.powerYou[s], i)}
              />
            ))}
          </div>
          <span className="pm-label" title={SOURCE_HINTS[s]}>
            {SOURCE_NAMES[s]}
            <button className="pm-remove" aria-label={`Remove ${SOURCE_NAMES[s]}`} onClick={() => remove(s)}>×</button>
          </span>
          <div className="pm-side pm-side-them">
            {[1, 2, 3].map((i) => (
              <button
                key={i}
                className={`seg seg-them ${person.powerThem[s] >= i ? 'is-on' : ''}`}
                aria-label={`${SOURCE_NAMES[s]}, power they hold, set to ${person.powerThem[s] === i ? i - 1 : i}`}
                onClick={() => set('them', s, person.powerThem[s], i)}
              />
            ))}
          </div>
        </div>
      ))}
      {shown.length === 0 && <p className="note">No power logged yet.</p>}
      {shown.length > 0 && (
        <p className="pm-status">
          {lead > 0 ? `You lead by ${lead}.` : lead < 0 ? `They lead by ${-lead}.` : 'Even.'}
          {hot && ' Big gap.'}
        </p>
      )}
      <button className="hud-btn hud-btn-sm pm-add" aria-expanded={picking} onClick={() => setPicking(!picking)}>
        {picking ? 'Done' : 'Add a source'}
      </button>
      {picking && (
        <div className="pm-pick">
          {SOURCE_GROUPS.map((g) => (
            <div key={g.name} className="pm-group">
              <span className="pm-group-name">{g.name}</span>
              {g.sources.map((s) => {
                const on = shown.includes(s);
                return (
                  <button
                    key={s}
                    className={`pm-option ${on ? 'is-on' : ''}`}
                    disabled={on}
                    onClick={() => { setAdded((a) => [...a, s]); setPicking(false); }}
                  >
                    <b>{SOURCE_NAMES[s]}</b>
                    <span>{SOURCE_HINTS[s]}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PersonPanel({ person, alliance, derived, now, onClose, onPlace, onSay, onDeleted }: Props) {
  const store = useStore();
  const nameRef = useRef<HTMLInputElement>(null);
  const [newSphere, setNewSphere] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [allPoints, setAllPoints] = useState(false);

  useEffect(() => {
    if (!person.name) nameRef.current?.focus();
    // Only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  const id = person.id;
  const band = derived.bands.get(id) ?? 'weak';
  const auto = computedBand(person, now);
  const last = lastPointDate(person);
  const placed = derived.placed.has(id);
  const below = descendantIds(alliance, id);
  const parentOptions = alliance.people
    .filter((p) => p.id !== id && !below.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const parentValue = person.parentId ?? TRAY;
  const ties = alliance.crossTies.filter((t) => t.a === id || t.b === id);
  const tiedIds = new Set(ties.map((t) => (t.a === id ? t.b : t.a)));
  const names = new Map(alliance.people.map((p) => [p.id, p.name || 'Unnamed']));

  const remove = () => {
    if (!armed) { setArmed(true); return; }
    const kids = alliance.people.filter((p) => p.parentId === id).length;
    const before = store.getState();
    store.deletePerson(id);
    onDeleted(`${person.name || 'Unnamed'} deleted.${kids ? ` ${kids === 1 ? 'The person' : `The ${kids} people`} under them moved up a level.` : ''}`, before, id);
    onClose();
  };

  return (
    <aside className="person frame" aria-label={`${person.name || 'Unnamed'}`}>
      <div className="frame-in person-in">
        <div className="person-top">
          {!placed && <span className="tag tag-alert">Not on the map</span>}
          <button className="icon-btn push" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="person-id">
          <div className="person-id-side">
            <input
              ref={nameRef}
              className="field field-name"
              value={person.name}
              placeholder="Name"
              aria-label="Name"
              onChange={(e) => store.updatePerson(id, { name: e.target.value })}
            />
            {person.photo ? (
              <button className="link-btn quiet-link" onClick={() => store.updatePerson(id, { photo: null })}>Remove photo</button>
            ) : (
              <div className="avatar-pick" role="radiogroup" aria-label="Picture">
                {AVATARS.map((n) => (
                  <button
                    key={n}
                    role="radio"
                    aria-checked={person.avatar === n}
                    aria-label={`Picture ${n}`}
                    className={person.avatar === n ? 'is-on' : ''}
                    onClick={() => store.updatePerson(id, { avatar: n })}
                  >
                    <img src={DEFAULT_AVATAR[n]} alt="" draggable={false} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <Avatar person={person} onError={onSay} />
        </div>
        <div className="grid-2">
          <label className="lbl">
            <span>Title</span>
            <input className="field" value={person.title} onChange={(e) => store.updatePerson(id, { title: e.target.value })} />
          </label>
          <label className="lbl">
            <span>Company</span>
            <input className="field" value={person.company} onChange={(e) => store.updatePerson(id, { company: e.target.value })} />
          </label>
        </div>

        <Section label="Place">
          <div className="grid-2">
            <label className="lbl">
              <span>Placed under</span>
              <select
                className="field"
                value={parentValue}
                onChange={(e) => onPlace(id, e.target.value === TRAY ? null : e.target.value)}
              >
                <option value={alliance.me.id}>{alliance.me.name || 'You'}</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || 'Unnamed'}</option>
                ))}
                <option value={TRAY}>Not on the map</option>
              </select>
            </label>
            <label className="lbl">
              <span>Sphere</span>
              {newSphere === null ? (
                <select
                  className="field"
                  value={person.sphereId ?? ''}
                  onChange={(e) => {
                    if (e.target.value === NEW) setNewSphere('');
                    else store.updatePerson(id, { sphereId: e.target.value || null });
                  }}
                >
                  <option value="">None</option>
                  {alliance.spheres.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value={NEW}>New sphere…</option>
                </select>
              ) : (
                <form
                  className="inline-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = newSphere.trim();
                    if (name) store.updatePerson(id, { sphereId: store.addSphere(name) });
                    setNewSphere(null);
                  }}
                >
                  <input
                    className="field"
                    autoFocus
                    placeholder="Sphere name"
                    value={newSphere}
                    onChange={(e) => setNewSphere(e.target.value)}
                    onBlur={(e) => e.currentTarget.form?.requestSubmit()}
                  />
                </form>
              )}
            </label>
          </div>
        </Section>

        <Section label="Closeness">
          <div className="cl">
            {/* The level is the truth; the map uses it. Click a step to set it. */}
            <div className={`cl-steps ${person.closenessOverride ? 'is-set' : 'is-auto'}`} role="radiogroup" aria-label="Closeness">
              {STEPS.map((b, i) => (
                <button
                  key={b}
                  role="radio"
                  aria-checked={band === b}
                  className={`cl-step ${i <= STEPS.indexOf(band) ? 'is-filled' : ''} ${band === b ? 'is-current' : ''}`}
                  onClick={() => store.setOverride(id, b)}
                >
                  <i />
                  <span>{BAND_NAMES[b]}</span>
                </button>
              ))}
            </div>
            {!person.closenessOverride && <p className="note">Automatic, from your contact log. Click a level to set it yourself.</p>}
            {person.closenessOverride && person.closenessOverride !== auto && (
              <p className="note">
                Your log suggests {BAND_NAMES[auto]}.{' '}
                <button className="link-btn" onClick={() => store.setOverride(id, null)}>Use log</button>
              </p>
            )}
            {last && <p className="note">Last contact {ago(daysSince(last, now))}.</p>}
          </div>
        </Section>

        <Section label="Power">
          <PowerMeter person={person} />
        </Section>

        <Section
          label="Contact log"
          aside={<button className="hud-btn hud-btn-sm" onClick={() => store.addPoint(id)}>Add</button>}
        >
          {person.points.length === 0 && <p className="note">Nothing logged yet. Recent and mutual contact counts more.</p>}
          <ul className="points">
            {[...person.points]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .slice(0, allPoints ? undefined : LOG_SHOWN)
              .map((pt) => (
                <li key={pt.id} className="point">
                  <div className="point-row">
                    <select
                      className="field"
                      value={pt.kind}
                      aria-label="Kind"
                      onChange={(e) => store.updatePoint(id, pt.id, { kind: e.target.value as PointKind })}
                    >
                      {POINT_KINDS.map((k) => (
                        <option key={k} value={k}>{POINT_NAMES[k]}</option>
                      ))}
                    </select>
                    <input
                      className="field"
                      type="date"
                      aria-label="Date"
                      value={pt.date}
                      onChange={(e) => e.target.value && store.updatePoint(id, pt.id, { date: e.target.value })}
                    />
                    <button
                      className={`pill ${pt.mutual ? 'is-on' : ''}`}
                      aria-pressed={pt.mutual}
                      onClick={() => store.updatePoint(id, pt.id, { mutual: !pt.mutual })}
                    >
                      Mutual
                    </button>
                    <button className="icon-btn" aria-label="Remove point" onClick={() => store.removePoint(id, pt.id)}>×</button>
                  </div>
                  <input
                    className="field field-note"
                    placeholder="Note"
                    value={pt.note}
                    onChange={(e) => store.updatePoint(id, pt.id, { note: e.target.value })}
                  />
                </li>
              ))}
          </ul>
          {person.points.length > LOG_SHOWN && (
            <button className="link-btn quiet-link log-more" onClick={() => setAllPoints(!allPoints)}>
              {allPoints ? 'Show fewer' : `Show all ${person.points.length}`}
            </button>
          )}
        </Section>

        <Section label="Leverage" aside={<span className="hud-label hud-label-dim">Private</span>}>
          <label className="lbl">
            <span>What you can use</span>
            <textarea
              className="field hold hold-you"
              rows={2}
              value={person.holdYou}
              onChange={(e) => store.updatePerson(id, { holdYou: e.target.value })}
            />
          </label>
          <label className="lbl">
            <span>What they can use</span>
            <textarea
              className="field hold hold-them"
              rows={2}
              value={person.holdThem}
              onChange={(e) => store.updatePerson(id, { holdThem: e.target.value })}
            />
          </label>
        </Section>

        <Section label="Goals">
          {alliance.goals.length === 0 && <p className="note">No goals yet. Add one from Goal at the top.</p>}
          {alliance.goals.map((g) => (
            <label key={g.id} className="lbl lbl-row">
              <span>{g.name}</span>
              <select
                className="field"
                value={person.stances[g.id] ?? ''}
                onChange={(e) => store.setStance(id, g.id, (e.target.value || null) as Stance | null)}
              >
                <option value="">Not involved</option>
                {STANCES.map((s) => (
                  <option key={s} value={s}>{STANCE_NAMES[s]}</option>
                ))}
              </select>
            </label>
          ))}
        </Section>

        <Section label="Knows">
          <div className="chips">
            {ties.map((t) => {
              const other = t.a === id ? t.b : t.a;
              return (
                <span key={t.id} className="chip chip-static">
                  {names.get(other)}
                  <button className="icon-btn" aria-label={`Remove cross-tie with ${names.get(other)}`} onClick={() => store.removeCrossTie(t.id)}>×</button>
                </span>
              );
            })}
            <select
              className="field field-add"
              value=""
              aria-label="Add a cross-tie"
              onChange={(e) => e.target.value && store.addCrossTie(id, e.target.value)}
            >
              <option value="">Add someone they know</option>
              {alliance.people
                .filter((p) => p.id !== id && !tiedIds.has(p.id))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name || 'Unnamed'}</option>
                ))}
            </select>
          </div>
        </Section>

        <Section label="Details">
          <div className="grid-2">
            <label className="lbl">
              <span>
                Profile URL
                {person.url && /^https?:\/\//.test(person.url) && (
                  <a className="lbl-link" href={person.url} target="_blank" rel="noreferrer noopener">Open</a>
                )}
              </span>
              <input className="field" value={person.url} inputMode="url" onChange={(e) => store.updatePerson(id, { url: e.target.value })} />
            </label>
            <label className="lbl">
              <span>Connected</span>
              <input
                className="field"
                type="date"
                value={person.connectedOn ?? ''}
                onChange={(e) => store.updatePerson(id, { connectedOn: e.target.value || null })}
              />
            </label>
          </div>
        </Section>

        <div className="danger">
          <button className={`hud-btn ${armed ? 'is-armed' : ''}`} onClick={remove}>
            {armed ? 'Click again to delete' : 'Delete person'}
          </button>
        </div>
      </div>
    </aside>
  );
}
