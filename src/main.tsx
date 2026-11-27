import '@fontsource-variable/saira/wdth.css';
import '@fontsource-variable/martian-mono/wdth.css';
import '@fontsource-variable/tektur/wdth.css';
import '@fontsource-variable/kode-mono/index.css';
import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import '@fontsource-variable/oxanium/index.css';
import '@fontsource/share-tech-mono/index.css';
import './styles.css';
import { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createStore } from './core/store';
import { browserStorage } from './platform/browser';
import { applyFontSet, currentFontSet, theme } from './theme';
import { StoreProvider } from './ui/store-context';
import { App, type Where } from './ui/App';

// Copy theme tokens into CSS variables so panels and canvas share one source.
const root = document.documentElement.style;
for (const [key, value] of Object.entries(theme.color)) {
  if (typeof value === 'string') root.setProperty(`--${key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}`, value);
}
applyFontSet(currentFontSet());
root.setProperty('--panel-ms', `${theme.motion.panelMs}ms`);

// Your map is saved. The sample lives in memory only, so trying it never touches your map.
const mine = createStore(browserStorage);
const sample = createStore({ load: async () => null, save: async () => {} });
window.addEventListener('beforeunload', () => mine.flush());
window.addEventListener('pagehide', () => mine.flush());

function Root() {
  const [where, setWhere] = useState<Where>(() => ({
    map: 'mine',
    screen: mine.getState().people.length ? 'map' : 'home',
  }));
  const go = useCallback((next: Where) => {
    // Each visit to the sample starts it fresh.
    if (next.map === 'sample') setWhere((cur) => { if (cur.map !== 'sample') sample.loadSample(); return next; });
    else setWhere(next);
  }, []);
  return (
    <StoreProvider store={where.map === 'sample' ? sample : mine}>
      <App where={where} go={go} mine={mine} />
    </StoreProvider>
  );
}

Promise.all([mine.ready, sample.ready]).then(() => {
  createRoot(document.getElementById('root')!).render(<Root />);
});
