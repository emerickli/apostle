import { MOTTO } from './words';

interface Props {
  /** True when there is already a map to go back to. */
  hasPeople: boolean;
  onContinue: () => void;
  onAdd: () => void;
  onImport: () => void;
  onSample: () => void;
  onOpen: () => void;
}

export function EmptyScreen({ hasPeople, onContinue, onAdd, onImport, onSample, onOpen }: Props) {
  return (
    <main className="empty">
      <h1 className="wordmark wordmark-lg">Apostle</h1>
      <p className="motto">{MOTTO}</p>
      <div className="empty-actions">
        {hasPeople && <button className="hud-btn hud-btn-primary" onClick={onContinue}>Open map</button>}
        <button className={`hud-btn ${hasPeople ? '' : 'hud-btn-primary'}`} onClick={onAdd}>Add a person</button>
        <button className="hud-btn" onClick={onImport}>Import LinkedIn</button>
        {!hasPeople && <button className="hud-btn" onClick={onSample}>Try a sample</button>}
      </div>
      <p className="empty-foot">
        Stays on this computer. <button className="link-btn" onClick={onOpen}>Open a saved file</button>
      </p>
    </main>
  );
}
