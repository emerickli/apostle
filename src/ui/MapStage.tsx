import { useEffect, useRef, type MutableRefObject } from 'react';
import { MapView, type Insets, type MapCallbacks, type Scene } from '../map/MapView';
import { theme } from '../theme';

interface Props {
  scene: Scene;
  fitToken: number;
  insets: Insets;
  callbacks: MapCallbacks;
  viewRef: MutableRefObject<MapView | null>;
}

export function MapStage({ scene, fitToken, insets, callbacks, viewRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;
  const lastLayout = useRef<string | null>(null);
  const lastFit = useRef<number | null>(null);
  const lastSelected = useRef<string | null>(null);

  useEffect(() => {
    const view = new MapView(canvasRef.current!, {
      onSelect: (id) => cbRef.current.onSelect(id),
      onDropOnNode: (a, b) => cbRef.current.onDropOnNode(a, b),
      onDropToTray: (id) => cbRef.current.onDropToTray(id),
      isOverTray: (x, y) => cbRef.current.isOverTray(x, y),
      canDrop: (a, b) => cbRef.current.canDrop(a, b),
      onDragChange: (id, over) => cbRef.current.onDragChange(id, over),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [viewRef]);

  useEffect(() => {
    viewRef.current?.setInsets(insets);
  }, [viewRef, insets.left, insets.right, insets.top, insets.bottom]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const layoutChanged = lastLayout.current !== null && lastLayout.current !== scene.layout.layout;
    const fit = layoutChanged || lastFit.current !== fitToken;
    lastLayout.current = scene.layout.layout;
    lastFit.current = fitToken;
    view.setScene(scene, { animateMs: layoutChanged ? theme.motion.layoutMs : theme.motion.editMs, fit });
    // Keep the selected person in view when they are picked or when their place changes.
    const sel = scene.selectedId;
    const pos = sel ? scene.layout.pos.get(sel) : undefined;
    const key = sel && pos ? `${sel}@${Math.round(pos.x)},${Math.round(pos.y)}` : null;
    if (key && key !== lastSelected.current && !fit) view.reveal(sel!);
    lastSelected.current = key;
  }, [viewRef, scene, fitToken]);

  return (
    <canvas
      ref={canvasRef}
      className="map-canvas"
      role="img"
      aria-label="Map of your alliance. Use the person panel and the lists to work with it from the keyboard."
    />
  );
}
