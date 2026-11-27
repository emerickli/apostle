import { MOTTO } from './words';

interface Props {
  onOpenMap: () => void;
  onSample: () => void;
  onImport: () => void;
  onOpenFile: () => void;
}

export function EmptyScreen({ onOpenMap, onSample, onImport, onOpenFile }: Props) {
  return (
    <main className="empty">
      <h1 className="wordmark wordmark-lg">Apostle</h1>
      <p className="motto">{MOTTO}</p>
      <div className="empty-actions">
        <button className="hud-btn hud-btn-primary" onClick={onOpenMap}>Open map</button>
        <button className="hud-btn" onClick={onSample}>Sample map</button>
        <button className="hud-btn" onClick={onImport}>Import LinkedIn</button>
      </div>
      <p className="empty-foot">
        Stays on this computer. <button className="link-btn" onClick={onOpenFile}>Open a saved file</button>
      </p>
    </main>
  );
}
