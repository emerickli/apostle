// Draws the map on a canvas and turns pointer input into map events.
// It knows nothing about the store: the app hands it a Scene and listens to callbacks.

import type { Band, ID } from '../core/model';
import type { Tone } from '../core/rules';
import { fonts, theme } from '../theme';
import type { LayoutResult, Vec } from './layout';

export interface SceneNode {
  id: ID;
  label: string;
  color: string;
  band: Band | 'me';
  /** Sphere id, or the no-sphere key. */
  sphere: ID;
  /** 1 is full strength, lower values dim the node. */
  alpha: number;
  emphasis: boolean;
}
export interface SceneEdge {
  from: ID;
  to: ID;
  kind: 'parent' | 'spoke' | 'cross';
  tone: Tone;
  hot: boolean;
  alpha: number;
}
export interface Scene {
  layout: LayoutResult;
  nodes: Map<ID, SceneNode>;
  edges: SceneEdge[];
  meId: ID;
  selectedId: ID | null;
}
export interface MapCallbacks {
  onSelect(id: ID | null): void;
  onDropOnNode(dragId: ID, targetId: ID): void;
  onDropToTray(dragId: ID): void;
  isOverTray(clientX: number, clientY: number): boolean;
  canDrop(dragId: ID, targetId: ID): boolean;
  onDragChange(dragId: ID | null, overTray: boolean): void;
}
export interface Insets { left: number; right: number; top: number; bottom: number }

interface Star { x: number; y: number; r: number; a: number; tw: number; ph: number; tint: string }
interface StarLayer { depth: number; stars: Star[] }

const TILE = 1800;
const TONE_COLOR: Record<Tone, string> = { them: theme.color.them, you: theme.color.you, even: theme.color.even };
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MapView {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private raf = 0;
  private scene: Scene | null = null;
  private shown = new Map<ID, Vec>();
  private from = new Map<ID, Vec>();
  private animStart = 0;
  private animMs = 0;
  private cam = { x: 0, y: 0, k: 1 };
  private camFrom = { x: 0, y: 0, k: 1 };
  private camTo: { x: number; y: number; k: number } | null = null;
  private camStart = 0;
  private camMs = 0;
  private insets: Insets = { left: 0, right: 0, top: 0, bottom: 0 };
  private layers: StarLayer[] = [];
  private glowCache = new Map<string, HTMLCanvasElement>();
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  private hoverId: ID | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private gesture:
    | { kind: 'none' }
    | { kind: 'pan'; sx: number; sy: number; moved: boolean }
    | { kind: 'node'; id: ID; sx: number; sy: number; dragging: boolean; world: Vec; target: ID | null; overTray: boolean }
    | { kind: 'pinch'; dist: number; k: number } = { kind: 'none' };
  private external: { target: ID | null; valid: boolean } = { target: null, valid: false };
  private resizeObs: ResizeObserver;

  constructor(private canvas: HTMLCanvasElement, private cb: MapCallbacks) {
    this.ctx = canvas.getContext('2d')!;
    this.makeStars();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas);
    this.resize();
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onCancel);
    canvas.addEventListener('pointerleave', this.onLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onCancel);
    this.canvas.removeEventListener('pointerleave', this.onLeave);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }

  // Public API

  setInsets(insets: Insets) { this.insets = insets; }

  setScene(scene: Scene, opts: { animateMs: number; fit: boolean }) {
    const first = !this.scene;
    const ms = this.reduced.matches || first ? 0 : opts.animateMs;
    const target = scene.layout.pos;
    const now = performance.now();
    // Read current positions against the old scene before swapping it out.
    const next = new Map<ID, Vec>();
    for (const [id, p] of target) {
      const cur = this.currentPos(id, now);
      if (cur) next.set(id, cur);
      else {
        // New points rise out of their parent.
        const parent = scene.edges.find((e) => e.to === id && e.kind !== 'cross')?.from;
        const born = (parent && this.currentPos(parent, now)) || p;
        next.set(id, { ...born });
      }
    }
    this.scene = scene;
    this.from = next;
    this.shown = new Map(next);
    this.animStart = now;
    this.animMs = ms;
    if (ms === 0) this.shown = new Map([...target].map(([id, p]) => [id, { ...p }]));
    if (opts.fit || first) this.fit(!first);
  }

  fit(animate = true) {
    if (!this.scene) return;
    const pts = [...this.scene.layout.pos.values()];
    if (!pts.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const pad = 90;
    const availW = Math.max(200, this.w - this.insets.left - this.insets.right - pad * 2);
    const availH = Math.max(200, this.h - this.insets.top - this.insets.bottom - pad * 2);
    const k = clamp(Math.min(availW / Math.max(1, maxX - minX), availH / Math.max(1, maxY - minY), 1.25), theme.map.minZoom, theme.map.maxZoom);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const screenCx = (this.insets.left + this.w - this.insets.right) / 2;
    const screenCy = (this.insets.top + this.h - this.insets.bottom) / 2;
    const to = { k, x: cx - (screenCx - this.w / 2) / k, y: cy - (screenCy - this.h / 2) / k };
    this.animateCamera(to, animate ? theme.motion.layoutMs : 0);
  }

  /** Pan just enough to bring a point into the area not covered by panels. */
  reveal(id: ID) {
    const p = this.scene?.layout.pos.get(id);
    if (!p) return;
    const target = { x: (p.x - this.cam.x) * this.cam.k + this.w / 2, y: (p.y - this.cam.y) * this.cam.k + this.h / 2 };
    const m = 70;
    const left = this.insets.left + m, right = this.w - this.insets.right - m;
    const top = this.insets.top + m, bottom = this.h - this.insets.bottom - m;
    if (right <= left || bottom <= top) return;
    let dx = 0, dy = 0;
    if (target.x < left) dx = target.x - left; else if (target.x > right) dx = target.x - right;
    if (target.y < top) dy = target.y - top; else if (target.y > bottom) dy = target.y - bottom;
    if (dx || dy) this.animateCamera({ k: this.cam.k, x: this.cam.x + dx / this.cam.k, y: this.cam.y + dy / this.cam.k }, theme.motion.editMs);
  }

  zoomBy(factor: number) {
    const k = clamp(this.cam.k * factor, theme.map.minZoom, theme.map.maxZoom);
    this.animateCamera({ ...this.cam, k }, 260);
  }

  /** The node under a viewport point, for drops coming from outside the canvas. */
  hitTest(clientX: number, clientY: number, exclude?: ID): ID | null {
    const r = this.canvas.getBoundingClientRect();
    return this.nodeAt(clientX - r.left, clientY - r.top, exclude);
  }

  setExternalTarget(target: ID | null, valid: boolean) { this.external = { target, valid }; }

  // Geometry

  private currentPos(id: ID, now: number): Vec | null {
    const to = this.scene?.layout.pos.get(id);
    const shown = this.shown.get(id);
    if (!shown) return null;
    if (!to || this.animMs === 0) return shown;
    const t = easeInOut(clamp((now - this.animStart) / this.animMs, 0, 1));
    const f = this.from.get(id) ?? to;
    return { x: f.x + (to.x - f.x) * t, y: f.y + (to.y - f.y) * t };
  }

  private toScreen(p: Vec): Vec {
    return { x: (p.x - this.cam.x) * this.cam.k + this.w / 2, y: (p.y - this.cam.y) * this.cam.k + this.h / 2 };
  }

  private toWorld(sx: number, sy: number): Vec {
    return { x: (sx - this.w / 2) / this.cam.k + this.cam.x, y: (sy - this.h / 2) / this.cam.k + this.cam.y };
  }

  private nodeSize(band: Band | 'me') {
    const s = clamp(Math.sqrt(this.cam.k), 0.55, 1.5);
    return { r: theme.map.nodeRadius[band] * s, glow: theme.map.glowRadius[band] * s };
  }

  private nodeAt(sx: number, sy: number, exclude?: ID): ID | null {
    if (!this.scene) return null;
    let best: ID | null = null;
    let bestD = Infinity;
    for (const [id, p] of this.shown) {
      if (id === exclude) continue;
      const node = this.scene.nodes.get(id);
      if (!node) continue;
      const s = this.toScreen(p);
      const d = Math.hypot(s.x - sx, s.y - sy);
      const reach = Math.max(14, this.nodeSize(node.band).r + 9);
      if (d < reach && d < bestD) { best = id; bestD = d; }
    }
    return best;
  }

  private animateCamera(to: { x: number; y: number; k: number }, ms: number) {
    if (this.reduced.matches || ms === 0) { this.cam = { ...to }; this.camTo = null; return; }
    this.camFrom = { ...this.cam };
    this.camTo = to;
    this.camStart = performance.now();
    this.camMs = ms;
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
  }

  private makeStars() {
    const rand = mulberry(7);
    const tints = ['#ffffff', '#dfe8ff', '#cfe0ff', '#e8dcff', '#d8fbff'];
    const specs = [
      { depth: 0.04, count: 260, r: [0.35, 0.8], a: [0.1, 0.45] },
      { depth: 0.1, count: 110, r: [0.5, 1.1], a: [0.15, 0.6] },
      { depth: 0.2, count: 34, r: [0.8, 1.5], a: [0.25, 0.75] },
    ];
    this.layers = specs.map((s) => ({
      depth: s.depth,
      stars: Array.from({ length: s.count }, () => ({
        x: rand() * TILE,
        y: rand() * TILE,
        r: s.r[0] + rand() * (s.r[1] - s.r[0]),
        a: s.a[0] + rand() * (s.a[1] - s.a[0]),
        tw: rand() < 0.08 ? 0.3 + rand() * 0.6 : 0,
        ph: rand() * Math.PI * 2,
        tint: tints[Math.floor(rand() * tints.length)],
      })),
    }));
  }

  private glow(color: string): HTMLCanvasElement {
    let c = this.glowCache.get(color);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, color);
    grad.addColorStop(0.18, color + '88');
    grad.addColorStop(0.45, color + '22');
    grad.addColorStop(1, color + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    this.glowCache.set(color, c);
    return c;
  }

  // Input

  private local(e: PointerEvent | WheelEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.gesture = { kind: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), k: this.cam.k };
      return;
    }
    const id = this.nodeAt(p.x, p.y);
    if (id) {
      const world = this.shown.get(id)!;
      this.gesture = { kind: 'node', id, sx: p.x, sy: p.y, dragging: false, world: { ...world }, target: null, overTray: false };
    } else {
      this.gesture = { kind: 'pan', sx: p.x, sy: p.y, moved: false };
    }
  };

  private onMove = (e: PointerEvent) => {
    const p = this.local(e);
    const last = this.pointers.get(e.pointerId);
    if (last) this.pointers.set(e.pointerId, p);
    const g = this.gesture;

    if (g.kind === 'pinch' && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      this.zoomAt(clamp(g.k * (d / g.dist), theme.map.minZoom, theme.map.maxZoom), (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    if (g.kind === 'pan' && last) {
      if (Math.hypot(p.x - g.sx, p.y - g.sy) > 3) g.moved = true;
      this.camTo = null;
      this.cam.x -= (p.x - last.x) / this.cam.k;
      this.cam.y -= (p.y - last.y) / this.cam.k;
      return;
    }
    if (g.kind === 'node' && last) {
      if (!g.dragging && Math.hypot(p.x - g.sx, p.y - g.sy) > 5 && g.id !== this.scene?.meId) {
        g.dragging = true;
      }
      if (g.dragging) {
        const w = this.toWorld(p.x, p.y);
        this.shown.set(g.id, w);
        this.from.set(g.id, w);
        g.target = this.nodeAt(p.x, p.y, g.id);
        g.overTray = !g.target && this.cb.isOverTray(e.clientX, e.clientY);
        this.cb.onDragChange(g.id, g.overTray);
      }
      return;
    }
    if (g.kind === 'none') {
      this.hoverId = this.nodeAt(p.x, p.y);
      this.canvas.style.cursor = this.hoverId ? 'pointer' : 'grab';
    }
  };

  private onUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    const g = this.gesture;
    this.gesture = { kind: 'none' };
    if (g.kind === 'pinch') return;
    if (g.kind === 'pan' && !g.moved) this.cb.onSelect(null);
    if (g.kind === 'node') {
      if (!g.dragging) { this.cb.onSelect(g.id); return; }
      this.cb.onDragChange(null, false);
      this.snapBack(g.id);
      if (g.target) this.cb.onDropOnNode(g.id, g.target);
      else if (g.overTray) this.cb.onDropToTray(g.id);
    }
  };

  private onCancel = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    const g = this.gesture;
    if (g.kind === 'node' && g.dragging) { this.snapBack(g.id); this.cb.onDragChange(null, false); }
    this.gesture = { kind: 'none' };
  };

  private onLeave = () => { if (this.gesture.kind === 'none') this.hoverId = null; };

  private snapBack(id: ID) {
    const cur = this.shown.get(id);
    if (!cur || !this.scene) return;
    // Animate only this point back to its place.
    const now = performance.now();
    const fromAll = new Map<ID, Vec>();
    for (const key of this.scene.layout.pos.keys()) fromAll.set(key, this.currentPos(key, now) ?? this.scene.layout.pos.get(key)!);
    fromAll.set(id, cur);
    this.from = fromAll;
    this.shown = new Map(fromAll);
    this.animStart = now;
    this.animMs = this.reduced.matches ? 0 : theme.motion.editMs;
    if (this.animMs === 0) this.shown = new Map(this.scene.layout.pos);
  }

  private zoomAt(k: number, sx: number, sy: number) {
    const before = this.toWorld(sx, sy);
    this.camTo = null;
    this.cam.k = k;
    const after = this.toWorld(sx, sy);
    this.cam.x += before.x - after.x;
    this.cam.y += before.y - after.y;
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const p = this.local(e);
    const trackpadScroll = !e.ctrlKey && (e.deltaX !== 0 || !Number.isInteger(e.deltaY)) && e.deltaMode === 0;
    if (trackpadScroll) {
      this.camTo = null;
      this.cam.x += e.deltaX / this.cam.k;
      this.cam.y += e.deltaY / this.cam.k;
      return;
    }
    const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0018));
    this.zoomAt(clamp(this.cam.k * factor, theme.map.minZoom, theme.map.maxZoom), p.x, p.y);
  };

  // Drawing

  private frame = (t: number) => {
    this.raf = requestAnimationFrame(this.frame);
    if (document.hidden) return;
    this.step(t);
    this.draw(t);
  };

  private step(now: number) {
    if (this.camTo) {
      const u = easeInOut(clamp((now - this.camStart) / this.camMs, 0, 1));
      const f = this.camFrom;
      const to = this.camTo;
      this.cam = { x: f.x + (to.x - f.x) * u, y: f.y + (to.y - f.y) * u, k: f.k + (to.k - f.k) * u };
      if (u >= 1) this.camTo = null;
    }
    if (!this.scene) return;
    const g = this.gesture;
    for (const id of this.scene.layout.pos.keys()) {
      if (g.kind === 'node' && g.dragging && g.id === id) continue;
      const p = this.currentPos(id, now);
      if (p) this.shown.set(id, p);
    }
  }

  private draw(t: number) {
    const ctx = this.ctx;
    const still = this.reduced.matches;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = theme.color.void;
    ctx.fillRect(0, 0, this.w, this.h);
    this.drawSpace(t, still);
    const scene = this.scene;
    if (!scene) return;

    const meScreen = this.shown.get(scene.meId);

    if (scene.layout.rings.length && meScreen) this.drawRadar(this.toScreen(meScreen), scene);

    // Edges
    ctx.lineCap = 'round';
    for (const e of scene.edges) {
      const a = this.shown.get(e.from);
      const b = this.shown.get(e.to);
      if (!a || !b) continue;
      this.drawEdge(e, this.toScreen(a), this.toScreen(b), scene.layout.layout === 'tree' && e.kind === 'parent');
    }

    // Glows, added together like light
    ctx.globalCompositeOperation = 'lighter';
    for (const [id, p] of this.shown) {
      const n = scene.nodes.get(id);
      if (!n) continue;
      const s = this.toScreen(p);
      const { glow } = this.nodeSize(n.band);
      const pulse = 1;
      const size = glow * 2 * pulse * (n.emphasis ? 1.35 : 1);
      if (s.x < -size || s.y < -size || s.x > this.w + size || s.y > this.h + size) continue;
      ctx.globalAlpha = theme.map.glowAlpha[n.band] * n.alpha;
      ctx.drawImage(this.glow(n.color), s.x - size / 2, s.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Cores
    for (const [id, p] of this.shown) {
      const n = scene.nodes.get(id);
      if (!n) continue;
      const s = this.toScreen(p);
      const { r } = this.nodeSize(n.band);
      ctx.globalAlpha = n.alpha;
      ctx.beginPath();
      ctx.fillStyle = n.color;
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
      if (n.band !== 'weak') {
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = n.alpha * (n.band === 'me' ? 1 : 0.85);
        ctx.arc(s.x, s.y, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (n.band === 'inner' || n.band === 'close') {
        ctx.beginPath();
        ctx.strokeStyle = n.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = n.alpha * (n.band === 'inner' ? 0.75 : 0.5);
        ctx.arc(s.x, s.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (n.band === 'me') this.drawOrbit(s);
    }
    ctx.globalAlpha = 1;

    this.drawLabels(scene);
    this.drawMarkers(scene, t);
  }

  private letter(px: number) {
    (this.ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
  }

  /** A small boxed label, like the readouts on a HUD. */
  private tag(text: string, x: number, y: number, color: string, alpha: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `600 10px ${fonts.ui}`;
    this.letter(2);
    const w = ctx.measureText(text).width + 12;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#000';
    ctx.fillRect(x - w / 2, y - 9, w, 18);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 1, y + 0.5);
    ctx.restore();
  }

  /** Closeness rings: a thin line each, with its level and count. */
  private drawRadar(c: Vec, scene: Scene) {
    const ctx = this.ctx;
    const rings = [...scene.layout.rings].sort((a, b) => b.r - a.r);
    const counts: Record<string, number> = {};
    for (const n of scene.nodes.values()) counts[n.band] = (counts[n.band] ?? 0) + 1;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    for (const ring of rings) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, ring.r * this.cam.k, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // Put each ring's label where it covers no point or name, preferring the top.
    ctx.save();
    ctx.font = `500 12px ${fonts.ui}`;
    const boxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
    for (const [id, n] of scene.nodes) {
      const p = this.shown.get(id);
      if (!p || n.band === 'me') continue;
      const s = this.toScreen(p);
      const w = ctx.measureText(n.label).width;
      boxes.push({ x0: s.x - 8, y0: s.y - 10, x1: s.x + 16 + w, y1: s.y + 10 });
    }
    ctx.font = `600 10px ${fonts.ui}`;
    this.letter(2);
    for (const ring of rings) {
      const text = `${ring.band.toUpperCase()}  ${counts[ring.band] ?? 0}`;
      const half = (ctx.measureText(text).width + 12) / 2;
      const r = ring.r * this.cam.k;
      let best = { x: c.x, y: c.y - r };
      let bestScore = Infinity;
      for (let i = 0; i < 72; i++) {
        const a = -Math.PI / 2 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 36);
        const x = c.x + Math.cos(a) * r;
        const y = c.y + Math.sin(a) * r;
        let overlap = 0;
        for (const b of boxes) {
          const ox = Math.min(x + half, b.x1) - Math.max(x - half, b.x0);
          const oy = Math.min(y + 9, b.y1) - Math.max(y - 9, b.y0);
          if (ox > 0 && oy > 0) overlap += ox * oy;
        }
        const score = overlap * 10 + Math.ceil(i / 2);
        if (score < bestScore) { bestScore = score; best = { x, y }; }
        if (overlap === 0) break;
      }
      this.tag(text, best.x, best.y, 'rgba(225, 235, 255, 0.85)', 1);
    }
    ctx.restore();
  }

  private drawSpace(t: number, still: boolean) {
    const ctx = this.ctx;
    for (const layer of this.layers) {
      const ox = (((-this.cam.x * this.cam.k * layer.depth) % TILE) + TILE) % TILE;
      const oy = (((-this.cam.y * this.cam.k * layer.depth) % TILE) + TILE) % TILE;
      for (const s of layer.stars) {
        const tw = s.tw && !still ? 0.55 + 0.45 * Math.sin(t / 1000 * s.tw + s.ph) : 1;
        ctx.globalAlpha = s.a * tw;
        ctx.fillStyle = s.tint;
        for (let x = s.x + ox - TILE; x < this.w; x += TILE) {
          if (x < -2) continue;
          for (let y = s.y + oy - TILE; y < this.h; y += TILE) {
            if (y < -2) continue;
            ctx.beginPath();
            ctx.arc(x, y, s.r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  private tracePath(a: Vec, b: Vec, curved: boolean) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    if (curved) {
      const my = (a.y + b.y) / 2;
      ctx.bezierCurveTo(a.x, my, b.x, my, b.x, b.y);
    } else ctx.lineTo(b.x, b.y);
  }

  private drawEdge(e: SceneEdge, a: Vec, b: Vec, curved: boolean) {
    const ctx = this.ctx;
    if (e.kind === 'cross') {
      ctx.save();
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = theme.color.even;
      ctx.globalAlpha = 0.24 * e.alpha;
      ctx.lineWidth = 1;
      this.tracePath(a, b, false);
      ctx.stroke();
      ctx.restore();
      return;
    }
    const color = TONE_COLOR[e.tone];
    const spoke = e.kind === 'spoke';
    const base = e.tone === 'even' ? 0.32 : 0.8;
    if (e.hot) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.16 * e.alpha;
      ctx.lineWidth = 8;
      this.tracePath(a, b, curved);
      ctx.stroke();
      ctx.globalAlpha = e.alpha;
      ctx.lineWidth = 2.2;
      this.tracePath(a, b, curved);
      ctx.stroke();
    } else {
      ctx.strokeStyle = color;
      ctx.globalAlpha = base * (spoke ? 0.7 : 1) * e.alpha;
      ctx.lineWidth = 1;
      this.tracePath(a, b, curved);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawOrbit(s: Vec) {
    const ctx = this.ctx;
    const r = 20 * clamp(Math.sqrt(this.cam.k), 0.6, 1.4);
    const rot = 0;
    ctx.save();
    ctx.strokeStyle = 'rgba(235, 242, 255, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a0 = rot + (i * Math.PI) / 2 + 0.25;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, a0, a0 + 0.9);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawLabels(scene: Scene) {
    const ctx = this.ctx;
    const k = this.cam.k;
    const below = scene.layout.layout === 'tree';
    const showAll = k >= 0.5;
    ctx.save();
    ctx.textBaseline = below ? 'top' : 'middle';
    for (const [id, p] of this.shown) {
      const n = scene.nodes.get(id);
      if (!n) continue;
      const isMe = n.band === 'me';
      const important = isMe || id === scene.selectedId || id === this.hoverId || n.emphasis;
      if (!showAll && !important) continue;
      const s = this.toScreen(p);
      if (s.x < -200 || s.x > this.w + 200 || s.y < -40 || s.y > this.h + 40) continue;
      const { r } = this.nodeSize(n.band);
      const size = isMe ? 11 : 12;
      ctx.font = isMe ? `700 ${size}px ${fonts.ui}` : `600 ${size}px ${fonts.ui}`;
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = isMe ? '3px' : '0.3px';
      const text = isMe ? n.label.toUpperCase() : n.label;
      ctx.globalAlpha = (important ? 1 : 0.86) * Math.max(n.alpha, important ? 0.65 : 0.45);
      ctx.fillStyle = theme.color.text;
      if (isMe) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(text, s.x, s.y - 26 * clamp(Math.sqrt(k), 0.6, 1.4));
        ctx.textBaseline = below ? 'top' : 'middle';
      } else if (below) {
        ctx.textAlign = 'center';
        ctx.fillText(text, s.x, s.y + r + (id === scene.selectedId ? 34 : 9));
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(text, s.x + r + (id === scene.selectedId ? 36 : 9), s.y);
      }
    }
    ctx.restore();
  }

  private drawMarkers(scene: Scene, t: number) {
    const ctx = this.ctx;
    const bracket = (id: ID, color: string, alpha: number, dashed = false) => {
      const p = this.shown.get(id);
      const n = scene.nodes.get(id);
      if (!p || !n) return;
      const s = this.toScreen(p);
      const half = Math.max(13, this.nodeSize(n.band).r + 10);
      const arm = 5;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.2;
      if (dashed) ctx.setLineDash([2, 3]);
      for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        ctx.beginPath();
        ctx.moveTo(s.x + dx * half, s.y + dy * (half - arm));
        ctx.lineTo(s.x + dx * half, s.y + dy * half);
        ctx.lineTo(s.x + dx * (half - arm), s.y + dy * half);
        ctx.stroke();
      }
      ctx.restore();
    };
    const ring = (id: ID, valid: boolean) => {
      const p = this.shown.get(id);
      if (!p) return;
      const s = this.toScreen(p);
      ctx.save();
      ctx.strokeStyle = valid ? theme.color.even : 'rgba(150, 160, 180, 0.6)';
      ctx.globalAlpha = valid ? 0.6 + 0.3 * Math.sin(t / 160) : 0.7;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 22, 0, Math.PI * 2);
      ctx.stroke();
      if (!valid) {
        ctx.beginPath();
        ctx.moveTo(s.x - 9, s.y - 9); ctx.lineTo(s.x + 9, s.y + 9);
        ctx.moveTo(s.x + 9, s.y - 9); ctx.lineTo(s.x - 9, s.y + 9);
        ctx.stroke();
      }
      ctx.restore();
    };

    if (scene.selectedId) {
      bracket(scene.selectedId, theme.color.even, 1);
    }
    for (const [id, n] of scene.nodes) if (n.emphasis && id !== scene.selectedId) bracket(id, theme.color.even, 0.45, true);
    const g = this.gesture;
    if (g.kind === 'node' && g.dragging && g.target) ring(g.target, this.cb.canDrop(g.id, g.target));
    if (this.external.target) ring(this.external.target, this.external.valid);
  }
}
