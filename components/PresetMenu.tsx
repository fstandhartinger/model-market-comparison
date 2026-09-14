"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { deletePreset, renamePreset, sanitizeStore, savePreset, STORE_KEY, type PresetKind, type PresetStore, type SavedPreset } from "../lib/presets.mjs";

const EVENT = "bh-presets";
const empty: PresetStore = { models: [], rows: [], filters: [] };

function read(): PresetStore {
  try { return sanitizeStore(JSON.parse(localStorage.getItem(STORE_KEY) ?? "null")); } catch { return empty; }
}

/** CR-4.2 / CR-5.3: saved presets live in this browser until accounts exist; every menu on the page
 *  sees the same store (same tab via an event, other tabs via `storage`). */
export function usePresetStore() {
  const [store, setStore] = useState<PresetStore>(empty);
  useEffect(() => {
    const sync = () => setStore(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const update = useCallback((kind: PresetKind, fn: (list: SavedPreset<never>[]) => SavedPreset<unknown>[]) => {
    const next = read();
    (next as unknown as Record<PresetKind, SavedPreset<unknown>[]>)[kind] = fn(next[kind] as SavedPreset<never>[]);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* storage full or blocked: keep in memory */ }
    setStore(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return {
    store,
    save: (kind: PresetKind, name: string, value: unknown) => update(kind, (l) => savePreset(l, name, value as never)),
    rename: (kind: PresetKind, id: string, name: string) => update(kind, (l) => renamePreset(l, id, name)),
    remove: (kind: PresetKind, id: string) => update(kind, (l) => deletePreset(l, id)),
  };
}

export interface OurPreset { id: string; name: string; hint?: string }

/** CR-4.2: one preset control for compared models, benchmark rows and filters — a button that names
 *  the active preset and opens "Ours" (built in) and "Yours" (saved: apply, rename, delete, save current). */
export function PresetMenu({ kind, label, ours, activeId, onOurs, onYours, current, align = "left", direction = "down", noun = label.toLowerCase(), fallback = "Custom" }: {
  kind: PresetKind; label: string; ours: OurPreset[]; activeId: string | null;
  onOurs: (id: string) => void; onYours: (p: SavedPreset<never>) => void; current: unknown; align?: "left" | "right"; direction?: "down" | "up";
  /** What "current" is called in the save field ("rows", "models", "filters"). */
  noun?: string;
  /** Button text when the current state matches no preset. */
  fallback?: string;
}) {
  const { store, save, rename, remove } = usePresetStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const yours = store[kind] as SavedPreset<never>[];
  const active = ours.find((p) => p.id === activeId)?.name ?? yours.find((p) => p.id === activeId)?.name ?? fallback;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);

  const item = (selected: boolean) => `flex min-h-11 w-full min-w-0 flex-col items-start justify-center rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent/10 ${selected ? "bg-accent/15 font-semibold" : ""}`;
  const submit = () => { const n = name.trim(); if (!n) return; save(kind, n, current); setName(""); setSaved(n); };

  return <div ref={box} className="bh-preset relative" data-preset-kind={kind}>
    <button type="button" className="bh-button !min-h-9 !py-1.5 text-sm" aria-expanded={open} aria-controls={panelId} onClick={() => { setOpen(!open); setSaved(null); }}>
      <span className="bh-muted">{label}:</span> <span className="max-w-[11rem] truncate font-semibold">{active}</span>
      <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    </button>
    {open && <div id={panelId} role="dialog" aria-label={`${label} presets`}
      // Phones: a bottom sheet pinned to the viewport, so a menu opened from mid-row never runs off-screen.
      className={`z-30 overflow-y-auto border border-line bg-panel p-2 shadow-xl max-sm:fixed max-sm:inset-x-2 max-sm:bottom-2 max-sm:max-h-[75vh] max-sm:rounded-2xl sm:absolute sm:max-h-[min(70vh,34rem)] sm:w-80 sm:rounded-xl ${direction === "up" ? "sm:bottom-full sm:mb-1" : "sm:top-full sm:mt-1"} ${align === "right" ? "sm:right-0" : "sm:left-0"}`}>
      <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Ours</p>
      <ul className="grid gap-0.5">
        {ours.map((p) => <li key={p.id}><button type="button" aria-pressed={activeId === p.id} className={item(activeId === p.id)} onClick={() => { onOurs(p.id); setOpen(false); }}>
          <span>{p.name}</span>{p.hint && <span className="bh-muted text-xs font-normal">{p.hint}</span>}
        </button></li>)}
      </ul>
      <p className="mt-2 border-t border-line/70 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Yours</p>
      {yours.length === 0 && <p className="bh-muted px-3 pb-1 text-xs">Nothing saved yet. Save the current {noun} below.</p>}
      <ul className="grid gap-0.5">
        {yours.map((p) => <li key={p.id} className="flex items-center gap-1">
          {editing === p.id
            ? <form className="flex min-w-0 flex-1 gap-1 px-1" onSubmit={(e) => { e.preventDefault(); rename(kind, p.id, draft); setEditing(null); setSaved(null); }}>
                <input autoFocus aria-label={`New name for ${p.name}`} className="bh-input min-w-0 flex-1 !py-1.5 text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} />
                <button type="submit" className="bh-button !min-h-9 !px-2 text-xs">Rename</button>
              </form>
            : <>
                <button type="button" aria-pressed={activeId === p.id} className={`${item(activeId === p.id)} flex-1`} onClick={() => { onYours(p); setOpen(false); }}><span className="max-w-full truncate">{p.name}</span></button>
                <button type="button" className="bh-preset-icon" aria-label={`Rename ${p.name}`} onClick={() => { setEditing(p.id); setDraft(p.name); }}>
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14"><path d="M2 10.5V12h1.5l6.8-6.8-1.5-1.5L2 10.5zM9.6 2.9l1.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
                </button>
                <button type="button" className="bh-preset-icon" aria-label={`Delete ${p.name}`} onClick={() => remove(kind, p.id)}>×</button>
              </>}
        </li>)}
      </ul>
      <form className="mt-2 flex gap-1 border-t border-line/70 px-1 pt-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input aria-label={`Name for the current ${noun}`} placeholder={`Save current ${noun} as…`} className="bh-input min-w-0 flex-1 !py-1.5 text-sm" value={name} maxLength={60} onChange={(e) => { setName(e.target.value); setSaved(null); }} />
        <button type="submit" className="bh-button !min-h-9 !px-3 text-sm" disabled={!name.trim()}>Save</button>
      </form>
      <p className="bh-muted px-2 pt-1.5 text-[11px]" role="status">{saved ? `Saved “${saved}” in this browser.` : "Saved presets stay in this browser."}</p>
    </div>}
  </div>;
}
