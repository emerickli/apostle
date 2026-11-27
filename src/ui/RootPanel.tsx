import type { Alliance, ID } from '../core/model';
import { useStore } from './store-context';

interface Props {
  alliance: Alliance;
  placed: Set<ID>;
  onClose: () => void;
}

export function RootPanel({ alliance, placed, onClose }: Props) {
  const store = useStore();
  return (
    <aside className="person frame" aria-label="Your card">
      <div className="frame-in person-in">
        <div className="person-top">
          <span className="hud-label">You</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <input
          className="field field-name"
          value={alliance.me.name}
          placeholder="Your name"
          aria-label="Your name"
          onChange={(e) => store.renameMe(e.target.value)}
        />
        <p className="note">You're at the center of every view. Everyone else is placed relative to you.</p>
        <div className="stats">
          <div><span className="num num-lg">{placed.size}</span><span className="hud-label">On the map</span></div>
          <div><span className="num num-lg">{alliance.people.length - placed.size}</span><span className="hud-label">Not on the map</span></div>
          <div><span className="num num-lg">{alliance.spheres.length}</span><span className="hud-label">Spheres</span></div>
          <div><span className="num num-lg">{alliance.goals.length}</span><span className="hud-label">Goals</span></div>
        </div>
      </div>
    </aside>
  );
}
