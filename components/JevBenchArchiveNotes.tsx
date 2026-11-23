import { JevBenchArchiveNotesLoader } from './JevBenchArchiveNotesLoader';
/** Server-only boundary: cumulative note text never crosses Flight as a client prop. */
export function JevBenchArchiveNotes({ version, notes }: { version: string; notes: string[] }) {
  return <JevBenchArchiveNotesLoader version={version} count={notes.length} />;
}
