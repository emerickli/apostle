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
import { createRoot } from 'react-dom/client';
import { createStore } from './core/store';
import { browserStorage } from './platform/browser';
import { applyFontSet, currentFontSet, theme } from './theme';
import { StoreProvider } from './ui/store-context';
import { App } from './ui/App';

// Copy theme tokens into CSS variables so panels and canvas share one source.
const root = document.documentElement.style;
for (const [key, value] of Object.entries(theme.color)) {
  if (typeof value === 'string') root.setProperty(`--${key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}`, value);
}
applyFontSet(currentFontSet());
root.setProperty('--panel-ms', `${theme.motion.panelMs}ms`);

const store = createStore(browserStorage);
window.addEventListener('beforeunload', () => store.flush());
window.addEventListener('pagehide', () => store.flush());

store.ready.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StoreProvider store={store}>
      <App />
    </StoreProvider>,
  );
});
