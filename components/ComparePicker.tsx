"use client";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CompareFamily } from '../lib/benchmark-view.mjs';
import { orgColor } from '../lib/format';
import { AaCredit } from './AaCredit';

const TOP_N = 8, MAX_MATCHES = 60;

/** Matched characters in bold (first occurrence of the whole query). */
function Highlight({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return <>{text.slice(0, at)}<b className="font-bold text-accent">{text.slice(at, at + query.length)}</b>{text.slice(at + query.length)}</>;
}

/** CR-36.1 / F-95: the Compare "Add a model" picker — a listbox under the input (a full-width sheet on phones),
 *  one option per model (CR-36.2), keyboard ↑ ↓ Enter Esc with aria-activedescendant. */
export function ComparePicker({ families, picks, onPick, max = 4, topHeading = 'Top by AA Intelligence Index', footer, autoFocus = false, onClose }: {
  families: CompareFamily[]; picks: string[]; onPick: (id: string) => void; max?: number;
  /** F-106: the Simple view reuses this picker over its own list and score. */
  topHeading?: string; footer?: React.ReactNode; autoFocus?: boolean; onClose?: () => void;
}) {
  const [query, setQuery] = useState(''), [open, setOpen] = useState(false), [active, setActive] = useState(0);
  const [phone, setPhone] = useState(false), [sheetTop, setSheetTop] = useState(0);
  const listId = useId(), inputRef = useRef<HTMLInputElement>(null), sheetInputRef = useRef<HTMLInputElement>(null);
  const full = picks.length >= max;
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767.98px)'), on = () => setPhone(mq.matches);
    on(); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, []);
  const pickedFamilies = useMemo(() => new Set(picks), [picks]);
  const needle = query.trim().toLowerCase();
  const { heading, options, more } = useMemo(() => {
    const pool = families.filter((f) => !pickedFamilies.has(f.id) && !f.variants.some((v) => pickedFamilies.has(v)));
    if (!needle) return { heading: topHeading, options: pool.filter((f) => f.current && f.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name)).slice(0, TOP_N), more: 0 };
    const tokens = needle.split(/\s+/);
    const hits = pool.filter((f) => { const hay = `${f.name} ${f.org}`.toLowerCase(); return tokens.every((t) => hay.includes(t)); })
      .sort((a, b) => a.name.localeCompare(b.name) || a.org.localeCompare(b.org));
    return { heading: 'Matches', options: hits.slice(0, MAX_MATCHES), more: Math.max(0, hits.length - MAX_MATCHES) };
  }, [families, pickedFamilies, needle, topHeading]);
  useEffect(() => { setActive(0); }, [needle, open]);
  useEffect(() => {
    if (!open || !phone) return;
    setSheetTop(Math.max(0, document.querySelector('header')?.getBoundingClientRect().bottom ?? 0));
    sheetInputRef.current?.focus();
  }, [open, phone]);
  useEffect(() => { if (autoFocus) { inputRef.current?.focus(); setOpen(true); } }, [autoFocus]);
  useEffect(() => { document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [active, listId]);

  const choose = (f: CompareFamily | undefined) => {
    if (!f || full) return;
    onPick(f.id); setQuery(''); setOpen(false);
    if (!phone) inputRef.current?.focus();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) setOpen(true); else setActive((i) => Math.min(options.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (open) choose(options[active]); }
    else if (e.key === 'Escape') { if (open) { e.preventDefault(); setOpen(false); } else onClose?.(); }
  };
  const inputProps = (ref: React.RefObject<HTMLInputElement | null>) => ({
    ref, role: 'combobox', 'aria-expanded': open, 'aria-controls': listId, 'aria-autocomplete': 'list' as const,
    'aria-activedescendant': open && options[active] ? `${listId}-opt-${active}` : undefined,
    value: query, disabled: full, placeholder: full ? `${max} models selected` : 'Add a model…', autoComplete: 'off',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => { setQuery(e.target.value); setOpen(true); },
    onKeyDown: onKey,
  });

  const list = <div className="bh-picker-list" onMouseDown={(e) => e.preventDefault()}>
    <p className="bh-picker-heading" aria-hidden="true">{heading}</p>
    <ul id={listId} role="listbox" aria-label={heading}>
      {options.map((f, i) => {
        const month = f.released?.slice(0, 7);
        return <Fragment key={f.id}><li id={`${listId}-opt-${i}`} role="option" aria-selected={i === active} data-picker-option className="bh-picker-option"
          onMouseEnter={() => setActive(i)} onClick={() => choose(f)}>
          <span className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: orgColor(f.org) }} />
            <span className="min-w-0 flex-1 truncate font-medium" data-option-name={f.name}><Highlight text={f.name} query={query.trim()} /></span>
            <span className="tabular shrink-0 text-sm font-semibold">{f.score == null ? <span className="bh-muted font-normal">—</span> : f.score.toFixed(1)}</span>
          </span>
          <span className="bh-muted block truncate pl-4 text-xs">{[f.org, month && `released ${month}`, f.variants.length > 1 && `best of ${f.variants.length} variants`, !f.current && 'retired'].filter(Boolean).join(' · ')}</span>
        </li></Fragment>;
      })}
    </ul>
    {!options.length && <p className="bh-muted px-3 py-3 text-sm" role="status">No model matches “{query.trim()}”.</p>}
    {more > 0 && <p className="bh-muted px-3 py-2 text-xs">{more} more — keep typing to narrow the list.</p>}
    {/* CR-63.17: no score footer under an empty result. */}{options.length > 0 && <p className="bh-muted border-t border-line px-3 py-1.5 text-[11px]">{footer ?? <>Score: AA Intelligence Index of the strongest variant · <AaCredit /></>}</p>}
  </div>;

  return <form className="relative flex min-w-[min(100%,16rem)] flex-1 items-center gap-2 sm:max-w-sm" onSubmit={(e) => { e.preventDefault(); if (open) choose(options[active]); else setOpen(true); }}>
    <label className="sr-only" htmlFor={`${listId}-input`}>Add a model</label>
    <input id={`${listId}-input`} {...inputProps(inputRef)} className="bh-input min-w-0 flex-1" onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onBlur={() => { if (!phone) setOpen(false); }} data-compare-add />
    <button type="submit" className="bh-button shrink-0 px-3" disabled={full}>Add</button>
    {open && !full && !phone && <div className="bh-picker-pop">{list}</div>}
    {open && !full && phone && <div className="bh-picker-sheet" style={{ top: sheetTop }} role="dialog" aria-modal="true" aria-label="Add a model">
      <div className="flex items-center gap-2 border-b border-line p-3">
        <input {...inputProps(sheetInputRef)} aria-label="Search models" className="bh-input min-w-0 flex-1" />
        <button type="button" className="bh-button shrink-0 px-3" onClick={() => { setOpen(false); onClose?.(); }}>Close</button>
      </div>
      {list}
    </div>}
  </form>;
}
