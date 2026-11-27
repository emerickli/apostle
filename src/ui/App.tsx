import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ID, Layout } from '../core/model';
import { LAYOUTS } from '../core/model';
import { derive } from '../core/derive';
import { canMove, descendantIds } from '../core/tree';
import { sphereKey, viewAlliance } from '../core/view';
import { readAlliance, AllianceFileError } from '../core/migrate';
import { parseConnections } from '../core/linkedin';
import { toDateString, type PracticeKey } from '../core/rules';
import { computeLayout, layoutKey } from '../map/layout';
import type { MapView, Scene, SceneNode, SceneEdge } from '../map/MapView';
import { sphereColor, theme } from '../theme';
import { downloadText, pickTextFile } from '../platform/browser';
import { useAlliance, useStore } from './store-context';
import { MapStage } from './MapStage';
import { EmptyScreen } from './EmptyScreen';
import { TopBar } from './TopBar';
import { PracticePanel } from './PracticePanel';
import { PersonPanel } from './PersonPanel';
import { RootPanel } from './RootPanel';
import { Tray } from './Tray';
import { Legend } from './Legend';
import { ChartsView } from './charts/ChartsView';
import { SpheresScreen } from './SpheresScreen';
import { ConfirmDialog, Toast, type ConfirmSpec } from './Overlays';
import { REFUSALS } from './words';

export type Highlight = { kind: 'practice'; key: PracticeKey };

/** Line brightness by closeness. */
const LINE_STRENGTH = { inner: 1, close: 0.8, active: 0.6, weak: 0.4 } as const;

function useNarrow() {
  const query = '(max-width: 760px)';
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

export function App() {
  const store = useStore();
  const alliance = useAlliance();
  const now = useMemo(() => new Date(), []);
  const derived = useMemo(() => derive(alliance, now), [alliance, now]);
  const narrow = useNarrow();

  const [selectedId, setSelectedId] = useState<ID | null>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [practiceOpen, setPracticeOpen] = useState(() => !window.matchMedia('(max-width: 760px)').matches);
  const [mapDrag, setMapDrag] = useState<{ id: ID; overTray: boolean } | null>(null);
  const [trayDrag, setTrayDrag] = useState<{ id: ID; x: number; y: number; valid: boolean } | null>(null);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [fitToken, setFitToken] = useState(0);
  const [spheresOpen, setSpheresOpen] = useState(false);
  const [home, setHome] = useState(false);
  const viewRef = useRef<MapView | null>(null);
  const trayRef = useRef<HTMLDivElement>(null);

  const empty = alliance.people.length === 0;
  // The home screen shows when there is nobody yet, or when the wordmark is clicked.
  const showHome = empty || home;
  const say = useCallback((text: string) => setToast((t) => ({ text, n: (t?.n ?? 0) + 1 })), []);
  const nameOf = useCallback(
    (id: ID) => {
      const s = store.getState();
      if (id === s.me.id) return s.me.name || 'You';
      return s.people.find((p) => p.id === id)?.name || 'Unnamed';
    },
    [store],
  );

  // Refit whenever the map appears or empties.
  useEffect(() => setFitToken((n) => n + 1), [showHome]);

  // Drop a selection or highlight that no longer points at anything.
  useEffect(() => {
    if (selectedId && selectedId !== alliance.me.id && !alliance.people.some((p) => p.id === selectedId)) setSelectedId(null);
  }, [alliance, selectedId, highlight]);

  const highlightIds = useMemo(() => {
    if (!highlight) return null;
    return new Set(derived.practice[highlight.key]);
  }, [highlight, derived]);

  // Positions only recompute when something that moves points changes.
  // Hidden spheres drop out of the drawing; their people's children hang from the nearest visible ancestor.
  const shownAlliance = useMemo(() => viewAlliance(alliance, derived.placed, derived.visible), [alliance, derived]);
  const layoutInput = {
    alliance: shownAlliance,
    placed: derived.placed,
    bandOf: (id: ID) => derived.bands.get(id) ?? 'weak',
    showCrossTies: alliance.showCrossTies,
  };
  const key = layoutKey(layoutInput);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mapLayout = useMemo(() => computeLayout(layoutInput), [key]);
  // On the home screen only your own point shows.
  const layoutResult = useMemo(
    () => (showHome ? { layout: 'tree' as const, pos: new Map([[alliance.me.id, { x: 0, y: 0 }]]), edges: [], rings: [] } : mapLayout),
    [showHome, mapLayout, alliance.me.id],
  );

  const scene = useMemo<Scene>(() => {
    const goal = alliance.activeGoalId;
    const byId = new Map(alliance.people.map((p) => [p.id, p]));
    const spheres = new Map(alliance.spheres.map((c) => [c.id, c]));
    const alphaOf = (id: ID) => {
      if (id === alliance.me.id || id === selectedId) return 1;
      if (highlightIds) return highlightIds.has(id) ? 1 : 0.14;
      if (goal) return byId.get(id)?.stances[goal] ? 1 : 0.34;
      return 1;
    };
    const nodes = new Map<ID, SceneNode>();
    nodes.set(alliance.me.id, {
      id: alliance.me.id, label: alliance.me.name || 'You', color: theme.color.me, band: 'me', sphere: '', alpha: 1, emphasis: false,
    });
    for (const id of layoutResult.pos.keys()) {
      const p = byId.get(id);
      if (!p) continue;
      const sphere = p.sphereId ? spheres.get(p.sphereId) : undefined;
      nodes.set(id, {
        id,
        label: p.name || 'Unnamed',
        color: sphere ? sphereColor(sphere.color) : theme.color.noSphere,
        band: derived.bands.get(id) ?? 'weak',
        sphere: sphereKey(alliance, p),
        alpha: alphaOf(id),
        emphasis: !!highlightIds?.has(id),
      });
    }
    const edges: SceneEdge[] = layoutResult.edges.map((e) => {
      const bal = derived.balances.get(e.to);
      const cross = e.kind === 'cross';
      return {
        ...e,
        tone: cross ? 'even' : (bal?.tone ?? 'even'),
        hot: !cross && !!bal?.hot,
        strength: LINE_STRENGTH[derived.bands.get(e.to) ?? 'weak'],
        gap: Math.min(1, Math.abs(bal?.lead ?? 0) / 12),
        alpha: cross ? Math.min(alphaOf(e.from), alphaOf(e.to)) : alphaOf(e.to),
      };
    });
    return { layout: layoutResult, nodes, edges, meId: alliance.me.id, selectedId };
  }, [alliance, derived, layoutResult, highlightIds, selectedId]);

  const place = useCallback(
    (id: ID, parentId: ID | null) => {
      const before = store.getState();
      const branch = descendantIds(before, id).size;
      const result = store.movePerson(id, parentId);
      if (!result.ok) { say(REFUSALS[result.reason]); return; }
      if (parentId === null) {
        say(branch ? `${nameOf(id)} and ${branch} under them taken off the map.` : `${nameOf(id)} taken off the map.`);
      } else {
        say(`${nameOf(id)} placed under ${nameOf(parentId)}.`);
      }
    },
    [store, say, nameOf],
  );

  const mapCallbacks = {
    onSelect: (id: ID | null) => {
      if (showHome) return;
      setSelectedId(id);
      if (!id) setHighlight(null);
    },
    onDropOnNode: (dragId: ID, targetId: ID) => place(dragId, targetId),
    onDropToTray: (dragId: ID) => place(dragId, null),
    isOverTray: (x: number, y: number) => {
      const r = trayRef.current?.getBoundingClientRect();
      return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    },
    canDrop: (dragId: ID, targetId: ID) => canMove(store.getState(), dragId, targetId).ok,
    onDragChange: (id: ID | null, overTray: boolean) =>
      setMapDrag((cur) => (id === null ? null : cur && cur.id === id && cur.overTray === overTray ? cur : { id, overTray })),
  };

  const startTrayDrag = (id: ID, e: React.PointerEvent) => {
    const start = { x: e.clientX, y: e.clientY };
    let active = false;
    const move = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 5) active = true;
      if (!active) return;
      const target = viewRef.current?.hitTest(ev.clientX, ev.clientY) ?? null;
      const valid = !!target && canMove(store.getState(), id, target).ok;
      viewRef.current?.setExternalTarget(target, valid);
      setTrayDrag({ id, x: ev.clientX, y: ev.clientY, valid });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      viewRef.current?.setExternalTarget(null, false);
      setTrayDrag(null);
      if (!active) { setSelectedId(id); return; }
      if (ev.type === 'pointercancel') return;
      const target = viewRef.current?.hitTest(ev.clientX, ev.clientY);
      if (target) place(id, target);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const setLayout = useCallback((layout: Layout) => store.setLayout(layout), [store]);

  const addPerson = () => {
    setHome(false);
    const id = store.addPerson();
    setSelectedId(id);
    setHighlight(null);
  };

  const files = {
    download: () => {
      const name = `apostle-alliance-${toDateString(new Date())}.json`;
      downloadText(name, JSON.stringify(store.getState(), null, 2));
      say(`Saved ${name}. Keep this file safe.`);
    },
    open: async () => {
      const file = await pickTextFile('.json,application/json');
      if (!file) return;
      try {
        const next = readAlliance(JSON.parse(file.text));
        const go = () => {
          store.replace(next);
          setSelectedId(null);
          setHighlight(null);
          setFitToken((n) => n + 1);
          say(`Opened ${file.name}. ${next.people.length} people.`);
        };
        const count = store.getState().people.length;
        if (count === 0) go();
        else
          setConfirm({
            title: 'Replace your map?',
            body: `Opening ${file.name} replaces the ${count} people on your map. Save to file first if you want to keep them.`,
            action: 'Open file',
            onConfirm: go,
          });
      } catch (err) {
        say(err instanceof AllianceFileError ? err.message : 'That file could not be read as an alliance.');
      }
    },
    importConnections: async () => {
      const file = await pickTextFile('.csv,text/csv');
      if (!file) return;
      try {
        const s = store.importConnections(parseConnections(file.text));
        const skipped = [
          s.skippedDuplicate ? `${s.skippedDuplicate} already here` : '',
          s.skippedNoName ? `${s.skippedNoName} with no name` : '',
        ].filter(Boolean).join(' and ');
        say(`Added ${s.added} ${s.added === 1 ? 'person' : 'people'}. They're in the bottom bar, ready to place.${skipped ? ` Skipped ${skipped}.` : ''}`);
        setFitToken((n) => n + 1);
      } catch (err) {
        say(err instanceof Error ? err.message : 'That file could not be read.');
      }
    },
    clear: () =>
      setConfirm({
        title: 'Start over?',
        body: 'This removes every person, sphere and goal from this computer. Files you saved are not affected.',
        action: 'Start over',
        onConfirm: () => {
          store.clear();
          setSelectedId(null);
          setHighlight(null);
        },
      }),
  };

  // Keyboard: 1 to 4 switch drawings, F fits, plus and minus zoom, Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (showHome || spheresOpen) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) setLayout(LAYOUTS[n - 1]);
      else if (e.key === 'f') viewRef.current?.fit();
      else if (e.key === '=' || e.key === '+') viewRef.current?.zoomBy(1.25);
      else if (e.key === '-') viewRef.current?.zoomBy(0.8);
      else if (e.key === 'Escape') { setSelectedId(null); setHighlight(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showHome, spheresOpen, setLayout]);

  const panelOpen = !!selectedId && !showHome;
  const charts = alliance.layout === 'charts';
  const insets = showHome
    ? { left: 0, right: 0, top: 0, bottom: Math.round(window.innerHeight * 0.45) }
    : narrow
      ? { left: 0, right: 0, top: 110, bottom: panelOpen ? Math.round(window.innerHeight * 0.6) : 120 }
      : { left: practiceOpen ? 300 : 0, right: panelOpen ? 420 : 0, top: 110, bottom: 120 };

  const selectedPerson = alliance.people.find((p) => p.id === selectedId) ?? null;
  const dragging = !!mapDrag || !!trayDrag;

  return (
    <div className={`app ${showHome ? 'is-empty' : 'is-live'} ${panelOpen ? 'has-panel' : ''}`}>
      <MapStage scene={scene} fitToken={fitToken} insets={insets} callbacks={mapCallbacks} viewRef={viewRef} />

      {showHome ? (
        <EmptyScreen
          hasPeople={!empty}
          onContinue={() => setHome(false)}
          onAdd={addPerson}
          onImport={() => { setHome(false); void files.importConnections(); }}
          onSample={() => store.loadSample()}
          onOpen={() => { setHome(false); void files.open(); }}
        />
      ) : (
        <>
          <TopBar
            alliance={alliance}
            onAdd={addPerson}
            files={files}
            onHome={() => { setSelectedId(null); setHighlight(null); setHome(true); }}
            onManage={() => setSpheresOpen(true)}
          />
          {charts && (
            <ChartsView alliance={alliance} derived={derived} now={now} selectedId={selectedId} onSelect={setSelectedId} />
          )}
          {!charts && <PracticePanel
            open={practiceOpen}
            setOpen={setPracticeOpen}
            alliance={alliance}
            derived={derived}
            now={now}
            highlight={highlight}
            setHighlight={setHighlight}
            onSelect={setSelectedId}
          />}
          {!charts && <Tray
            ref={trayRef}
            alliance={alliance}
            placed={derived.placed}
            visible={derived.visible}
            dropping={!!mapDrag}
            hot={!!mapDrag?.overTray}
            onPointerDown={startTrayDrag}
          />}
          {!charts && <Legend
            onZoomIn={() => viewRef.current?.zoomBy(1.25)}
            onZoomOut={() => viewRef.current?.zoomBy(0.8)}
            onFit={() => viewRef.current?.fit()}
          />}
          {selectedId === alliance.me.id && (
            <RootPanel alliance={alliance} placed={derived.placed} onClose={() => setSelectedId(null)} />
          )}
          {selectedPerson && (
            <PersonPanel
              key={selectedPerson.id}
              person={selectedPerson}
              alliance={alliance}
              derived={derived}
              now={now}
              onClose={() => setSelectedId(null)}
              onPlace={place}
              onDeleted={say}
            />
          )}
        </>
      )}

      {spheresOpen && !showHome && (
        <SpheresScreen
          alliance={alliance}
          derived={derived}
          onClose={() => setSpheresOpen(false)}
          onOpenPerson={(id) => { setSpheresOpen(false); setSelectedId(id); }}
        />
      )}
      {trayDrag && (
        <div className={`drag-ghost ${trayDrag.valid ? 'is-valid' : ''}`} style={{ left: trayDrag.x, top: trayDrag.y }}>
          {nameOf(trayDrag.id)}
        </div>
      )}
      {dragging && <div className="drag-hint">Drop on someone to place under them{mapDrag ? ', or on the bottom bar to take off the map' : ''}</div>}
      {toast && <Toast key={toast.n} text={toast.text} onDone={() => setToast(null)} />}
      {confirm && <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
}
