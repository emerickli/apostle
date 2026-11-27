// Browser versions of storage and file access. A desktop shell replaces this file.

import type { StorageAdapter } from '../core/store';
import type { Alliance } from '../core/model';

const KEY = 'apostle.alliance';

export const browserStorage: StorageAdapter = {
  async load() {
    const text = localStorage.getItem(KEY);
    return text ? JSON.parse(text) : null;
  },
  async save(alliance: Alliance) {
    localStorage.setItem(KEY, JSON.stringify(alliance));
  },
};

export function downloadText(filename: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickTextFile(accept: string): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? { name: file.name, text: await file.text() } : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
