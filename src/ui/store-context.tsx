import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { Store } from '../core/store';

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ store, children }: { store: Store; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreProvider is missing');
  return store;
}

export function useAlliance() {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getState);
}
