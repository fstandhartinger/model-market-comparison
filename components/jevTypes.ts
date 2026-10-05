import { JEV_ARCH_CLASSES, jevArchFor, type JevArchRow } from '../lib/jevbench-architecture.mjs';

export const jevRowArch = (row: JevArchRow, benchmark = 'jevbench') => row.arch ?? jevArchFor(benchmark, row).arch;
const canonical = (cls: string) => JEV_ARCH_CLASSES.some((c) => c.id === cls) ? cls : jevArchFor('jevbench', { class: cls }).arch;
export const JEV_TYPE_VAR: Record<string, string> = Object.fromEntries(JEV_ARCH_CLASSES.map((c) => [c.id, c.cssVar]));
export const JEV_TYPE_LABEL: Record<string, string> = Object.fromEntries(JEV_ARCH_CLASSES.map((c) => [c.id, c.label]));
export const jevTypeVarName = (cls: string) => JEV_TYPE_VAR[canonical(cls)];
export const jevLegendTypes = (classes: readonly string[]) => {
  const present = new Set(classes.map(canonical));
  return JEV_ARCH_CLASSES.filter((c) => present.has(c.id)).map((c) => c.id);
};
