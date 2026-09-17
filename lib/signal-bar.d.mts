export type SignalBarDomain = { min: number; max: number; span: number; zero: number };
export type SignalBarGeometry = { sign: 'pos' | 'neg' | 'zero'; width: number; from: number; fraction: number };
/** F-112: the catalog-wide signed domain (always includes zero) and zero's position inside it. */
export function signalBarDomain(scores: readonly (number | null | undefined)[]): SignalBarDomain;
/** F-112: one score's bar inside that domain, as fractions of the track. */
export function signalBarGeometry(score: number | null | undefined, domain: SignalBarDomain): SignalBarGeometry;
