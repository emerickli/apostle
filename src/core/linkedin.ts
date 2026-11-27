// Reads a LinkedIn "Connections.csv" export. A simple first version: Cursor hardens it.
// The export starts with a few note lines, then a header row with "First Name".

import type { DateString } from './model';

export interface ImportedConnection {
  name: string;
  url: string;
  connectedOn: DateString | null;
  company: string;
  title: string;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** "26 Nov 2026" or "2026-11-26" to YYYY-MM-DD. */
export function parseLinkedInDate(s: string): DateString | null {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function normalizeProfileUrl(url: string): string {
  return url.trim().replace(/^http:/, 'https:').replace(/\/+$/, '').toLowerCase();
}

export function parseConnections(text: string): ImportedConnection[] {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  const headerAt = rows.findIndex((r) => r.some((c) => c.trim().toLowerCase() === 'first name'));
  if (headerAt < 0) throw new Error('No "First Name" column found. Is this the LinkedIn Connections file?');
  const header = rows[headerAt].map((c) => c.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const first = col('first name');
  const last = col('last name');
  const url = col('url');
  const company = col('company');
  const position = col('position');
  const connected = col('connected on');

  const out: ImportedConnection[] = [];
  for (const r of rows.slice(headerAt + 1)) {
    const get = (i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');
    if (r.every((c) => !c.trim())) continue;
    // Rows with no name are kept here so the store can count them as skipped.
    const name = [get(first), get(last)].filter(Boolean).join(' ');
    out.push({
      name,
      url: get(url),
      connectedOn: parseLinkedInDate(get(connected)),
      company: get(company),
      title: get(position),
    });
  }
  return out;
}
