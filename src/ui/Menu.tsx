import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  label: ReactNode;
  title?: string;
  align?: 'left' | 'right';
  className?: string;
  children: (close: () => void) => ReactNode;
}

export function Menu({ label, title, align = 'right', className = '', children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`menu ${className}`} ref={ref}>
      <button className={`hud-btn ${open ? 'is-on' : ''}`} aria-expanded={open} title={title} onClick={() => setOpen((o) => !o)}>
        {label}
        <span className="caret" aria-hidden />
      </button>
      {open && (
        <div className={`menu-pop frame align-${align}`}>
          <div className="frame-in">{children(() => setOpen(false))}</div>
        </div>
      )}
    </div>
  );
}
