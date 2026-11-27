import { useEffect, useRef } from 'react';

export interface ConfirmSpec {
  title: string;
  body: string;
  action: string;
  onConfirm: () => void;
}

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => done.current(), 4200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="toast" role="status">
      {text}
    </div>
  );
}

export function ConfirmDialog({ spec, onClose }: { spec: ConfirmSpec; onClose: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog frame" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title">
        <div className="frame-in">
          <h2 id="dlg-title" className="hud-label hud-label-lg">{spec.title}</h2>
          <p className="dialog-body">{spec.body}</p>
          <div className="dialog-actions">
            <button className="hud-btn" onClick={onClose}>Cancel</button>
            <button
              ref={ref}
              className="hud-btn hud-btn-primary"
              onClick={() => {
                spec.onConfirm();
                onClose();
              }}
            >
              {spec.action}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
