// CR-291.1: German number, price and label helpers for the German JevBench landing page.
export const DE = 'de-DE';

export function oneDe(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toLocaleString(DE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function usdPerThousandDe(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'nicht veröffentlicht';
  const digits = value < 0.01 ? 4 : 3;
  return `${value.toLocaleString(DE, { minimumFractionDigits: digits, maximumFractionDigits: digits })} $ pro 1.000 Entscheidungen`;
}

export function costBasisLabelDe(kind: string | null | undefined): string {
  if (kind === 'measured') return 'gemessen';
  if (kind === 'estimate') return 'geschätzt';
  if (kind === 'announced') return 'selbst angegebener Listenpreis';
  return 'nicht veröffentlicht';
}

export function monthDe(iso: string): string {
  return new Date(iso).toLocaleDateString(DE, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export const TABLE_HEAD_DE = ['Rang', 'Modell', 'Capability', 'Intelligenz', 'Kalibrierung', 'Kosten pro 1.000 Entscheidungen', 'Latenz (p50)', 'Offene Gewichte'];
