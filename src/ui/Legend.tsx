import { useState } from 'react';

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function Legend({ onZoomIn, onZoomOut, onFit }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="legend-wrap">
      {open && (
        <div className="legend frame">
          <dl className="frame-in legend-in" aria-label="Key">
            <div><dt><i className="swatch swatch-them" /></dt><dd>They hold more power</dd></div>
            <div><dt><i className="swatch swatch-you" /></dt><dd>You hold more power</dd></div>
            <div><dt><i className="swatch swatch-even" /></dt><dd>Even</dd></div>
            <div><dt><i className="swatch swatch-hot" /></dt><dd>Thick line: gap of 6 or more</dd></div>
            <div><dt><i className="swatch swatch-cross" /></dt><dd>They know each other</dd></div>
            <div><dt><i className="swatch-star" /></dt><dd>Bigger, brighter dot: closer</dd></div>
          </dl>
        </div>
      )}
      <div className="zoom">
        <button className={`hud-btn hud-btn-sm ${open ? 'is-on' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open}>Key</button>
        <button className="hud-btn hud-btn-sm" onClick={onZoomOut} aria-label="Zoom out">−</button>
        <button className="hud-btn hud-btn-sm" onClick={onFit}>Fit</button>
        <button className="hud-btn hud-btn-sm" onClick={onZoomIn} aria-label="Zoom in">+</button>
      </div>
    </div>
  );
}
