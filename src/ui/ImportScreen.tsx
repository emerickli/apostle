// Import LinkedIn: one drop zone, one button, and where to find the file.

import { useEffect, useState } from 'react';
import { pickTextFile } from '../platform/browser';

interface Props {
  onFile: (file: { name: string; text: string }) => void;
  onBack: () => void;
}

export function ImportScreen({ onFile, onBack }: Props) {
  const [over, setOver] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const choose = async () => {
    const file = await pickTextFile('.csv,text/csv');
    if (file) onFile(file);
  };

  const drop = async (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile({ name: file.name, text: await file.text() });
  };

  return (
    <main
      className="import"
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setOver(false); }}
      onDrop={drop}
    >
      <h1 className="import-title">Import LinkedIn</h1>
      <div className={`drop-zone ${over ? 'is-over' : ''}`}>
        <p className="drop-main">Drop Connections.csv here</p>
        <button className="hud-btn hud-btn-primary" onClick={choose}>Choose file</button>
      </div>
      <p className="import-help">
        On LinkedIn, go to Settings, Data privacy, Get a copy of your data, and pick Connections.
        LinkedIn emails you a link. Open the download and use Connections.csv.
      </p>
      <p className="import-help">Everyone lands in the bottom bar, ready to place. The file stays on this computer.</p>
      <button className="link-btn import-back" onClick={onBack}>Back</button>
    </main>
  );
}
