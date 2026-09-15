"use client";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ComboItem { key: string; label: string; sub?: string }

const MAX_ROWS = 300, MAX_CHIPS = 6;

/** F-94 / CR-25.5 / CR-36.3: one compact, searchable multi-select for the Options panel (Models, Providers, Labs).
 *  The panel shows only a trigger with the count; the list lives in a popover rendered into <body>, so the panel's
 *  own scroll area can never clip it — as wide as the trigger (min 280 px), at most 320 px tall with the list
 *  scrolling inside. Below `md` it is a bottom sheet. Selection semantics stay with the caller: `isChecked` /
 *  `toggle` / `all` / `only` (the "None" link unchecks everything visually until the first pick, which then
 *  selects just that item — an empty selection means "all" for these filters, so "none" is never stored). */
export function MultiCombobox({ label, items, summary, active, isChecked, toggle, all, only, footer }: {
  label: string;
  items: ComboItem[];
  summary: string;
  active: boolean;
  isChecked: (key: string) => boolean;
  toggle: (key: string) => void;
  all: () => void;
  only: (key: string) => void;
  footer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [noneDraft, setNoneDraft] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const [sheet, setSheet] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const checked = (k: string) => !noneDraft && isChecked(k);
  const close = (refocus = true) => { setOpen(false); setQ(""); setNoneDraft(false); if (refocus) trigger.current?.focus(); };
  const openList = () => {
    // Selected first, then alphabetical — fixed while open, so rows do not jump under the pointer.
    const byName = [...items].sort((a, b) => a.label.localeCompare(b.label));
    setOrder([...byName.filter((i) => isChecked(i.key)), ...byName.filter((i) => !isChecked(i.key))].map((i) => i.key));
    setSheet(!window.matchMedia("(min-width: 768px)").matches);
    setOpen(true);
  };

  const place = () => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(Math.max(r.width, 280), innerWidth - 16);
    const left = Math.max(8, Math.min(r.left, innerWidth - width - 8));
    const below = innerHeight - r.bottom - 12, above = r.top - 12;
    if (below >= 220 || below >= above) setPos({ left, width, top: r.bottom + 4, maxHeight: Math.min(320, below) });
    else setPos({ left, width, bottom: innerHeight - r.top + 4, maxHeight: Math.min(320, above) });
  };
  useLayoutEffect(() => { if (open && !sheet) place(); }, [open, sheet]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (pop.current?.contains(t) || trigger.current?.contains(t)) return;
      close(false);
    };
    const onMove = () => { if (!sheet) place(); };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, sheet]); // eslint-disable-line react-hooks/exhaustive-deps

  const byKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);
  const needle = q.trim().toLowerCase();
  const shown = order.map((k) => byKey.get(k)).filter((i): i is ComboItem => !!i && (!needle || `${i.label} ${i.sub ?? ""}`.toLowerCase().includes(needle)));
  const picked = noneDraft ? [] : items.filter((i) => isChecked(i.key));
  const restricted = noneDraft || picked.length < items.length;

  const pick = (k: string) => {
    if (noneDraft) { only(k); setNoneDraft(false); } else toggle(k);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const opts = [...(pop.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
    if (!opts.length) return;
    e.preventDefault();
    const at = opts.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") opts[Math.min(at + 1, opts.length - 1)].focus();
    else if (at <= 0) input.current?.focus();
    else opts[at - 1].focus();
  };

  const body = (
    <div ref={pop} data-bh-combobox="" onKeyDown={onKeyDown}
      className={sheet
        ? "fixed inset-x-0 bottom-0 z-[70] flex max-h-[70vh] flex-col rounded-t-2xl border-t border-line bg-panel shadow-2xl"
        : "fixed z-[70] flex flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-2xl"}
      style={sheet ? undefined : pos ? { left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight } : { visibility: "hidden" }}>
      <div className="shrink-0 space-y-1.5 border-b border-line/70 p-2">
        <div className="flex items-center gap-2">
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()}…`} aria-label={`Search ${label.toLowerCase()}`}
            aria-controls={listId} className="min-h-9 min-w-0 flex-1 rounded-md border border-line bg-ink px-2 text-sm" />
          <button type="button" onClick={() => { all(); setNoneDraft(false); }} className="px-1 text-xs text-accent hover:underline">All</button>
          <span className="text-xs text-gray-600" aria-hidden="true">·</span>
          <button type="button" onClick={() => setNoneDraft(true)} className="px-1 text-xs text-accent hover:underline">None</button>
          {sheet && <button type="button" onClick={() => close()} aria-label={`Close ${label}`} className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-400 hover:text-gray-200">✕</button>}
        </div>
        {restricted && (
          <div className="flex flex-wrap items-center gap-1 text-[11px]">
            {noneDraft ? <span className="text-gray-500">Pick at least one.</span> : <>
              {picked.slice(0, MAX_CHIPS).map((i) => (
                <button key={i.key} type="button" onClick={() => toggle(i.key)} aria-label={`Remove ${i.label}`}
                  className="inline-flex max-w-[12rem] items-center gap-1 rounded-full border border-accent/50 bg-accent/10 px-2 py-0.5 text-accent">
                  <span className="truncate">{i.label}</span><span aria-hidden="true">×</span>
                </button>
              ))}
              {picked.length > MAX_CHIPS && <span className="text-gray-500">+{picked.length - MAX_CHIPS} more</span>}
            </>}
          </div>
        )}
      </div>
      <div id={listId} role="listbox" aria-multiselectable="true" aria-label={label} className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
        {shown.slice(0, MAX_ROWS).map((i) => {
          const on = checked(i.key);
          return (
            <button key={i.key} type="button" role="option" aria-selected={on} onClick={() => pick(i.key)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent/10 focus:bg-accent/10 focus:outline-none">
              <span aria-hidden="true" className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${on ? "border-accent bg-accent text-ink" : "border-line"}`}>{on ? "✓" : ""}</span>
              <span className="min-w-0 flex-1 truncate text-gray-200">{i.label}</span>
              {i.sub && <span className="shrink-0 text-xs text-gray-500">{i.sub}</span>}
            </button>
          );
        })}
        {!shown.length && <p className="px-3 py-2 text-xs text-gray-500">No match.</p>}
        {shown.length > MAX_ROWS && <p className="px-3 py-2 text-xs text-gray-500">{shown.length - MAX_ROWS} more — refine the search.</p>}
      </div>
      {footer && <div className="shrink-0 border-t border-line/70 px-3 py-2 text-xs">{footer}</div>}
    </div>
  );

  return (
    <>
      <button ref={trigger} type="button" aria-haspopup="listbox" aria-expanded={open} data-bh-combobox-trigger={label}
        onClick={() => (open ? close() : openList())}
        className={`inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-sm ${active ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-gray-300"}`}>
        <span className="truncate">{label}: {summary}</span><span aria-hidden="true">▾</span>
      </button>
      {open && createPortal(<>
        {sheet && <div data-bh-combobox="" className="fixed inset-0 z-[65] bg-black/40" aria-hidden="true" />}
        {body}
      </>, document.body)}
    </>
  );
}
