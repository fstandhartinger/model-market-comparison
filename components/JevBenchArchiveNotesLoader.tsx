'use client';
import { useState } from 'react';
import { fetchJevArchiveData, useJevArchiveData } from './JevBenchArchiveData';
export function JevBenchArchiveNotesLoader({ version, count }: { version: string; count: number }) {
  const data = useJevArchiveData(version);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  async function load() {
    if (loading) return;
    setLoading(true); setError(false);
    try { await fetchJevArchiveData(version); } catch { setError(true); }
    finally { setLoading(false); }
  }
  const notes = data?.props.artifact.measurement_notes as string[] | undefined;
  if (notes) return <>{notes.map((note, index) => <p className="mt-2" key={index}>{note}</p>)}</>;
  return <div className="bh-panel mt-3 p-4 text-sm" data-bh-jev-archive-notes>
    <p>{count} original measurement notes are available in the full board JSON. Loading the full board also loads every note here.</p>
    {loading && <p role="status" className="mt-2">Loading release notes…</p>}
    {error && <p role="alert" className="mt-2">The release notes could not be loaded. Try again or open the JSON.</p>}
    <button className="mt-3 rounded border border-line px-3 py-2 text-accent disabled:opacity-50" type="button" disabled={loading} onClick={load}>{error ? 'Retry release notes' : 'Load release notes'}</button>{' · '}
    <a className="text-accent underline" href={`/api/jevbench/${version}/board`}>Full board JSON</a>
  </div>;
}
