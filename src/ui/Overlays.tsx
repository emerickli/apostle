import { useEffect, useRef } from 'react';

export interface ConfirmSpec {
  title: string;
  body: string;
  action: string;
  onConfirm: () => void;
}

/** A message that fades on its own. With `undo`, it stays longer and offers an Undo button. */
export function Toast({ text, undo, onDone }: { text: string; undo?: () => void; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  const ms = undo ? 8000 : 4200;
  useEffect(() => {
    const t = setTimeout(() => done.current(), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return (
    <div className={`toast ${undo ? 'has-undo' : ''}`} role="status" style={{ animationDuration: `${ms}ms` }}>
      <span>{text}</span>
      {undo && (
        <button className="toast-undo" onClick={() => { undo(); done.current(); }}>Undo</button>
      )}
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
