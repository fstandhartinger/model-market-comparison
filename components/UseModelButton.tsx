'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  USE_MODEL_PARAM, USE_MODEL_PUBLIC, USE_MODEL_STORAGE_KEY, useModelEligible, useModelHref,
  type UseModelBenchmark, type UseModelTarget,
} from '../lib/use-model';

// Preview flag. The server snapshot is always "off" so the HTML every visitor and crawler gets never changes.

function readFlag(): boolean {
  if (USE_MODEL_PUBLIC) return true;
  try {
    const param = new URL(window.location.href).searchParams.get(USE_MODEL_PARAM);
    if (param === '0' || param === 'off') window.localStorage.removeItem(USE_MODEL_STORAGE_KEY);
    else if (param) window.localStorage.setItem(USE_MODEL_STORAGE_KEY, '1');
    return window.localStorage.getItem(USE_MODEL_STORAGE_KEY) === '1';
  } catch { return false; }
}
const subscribe = (cb: () => void) => { window.addEventListener('storage', cb); return () => window.removeEventListener('storage', cb); };
const usePreviewEnabled = () => useSyncExternalStore(subscribe, readFlag, () => false);

function track(target: UseModelTarget, model: string, benchmark: UseModelBenchmark) {
  const body = JSON.stringify({ name: 'use_model_click', page: benchmark === 'imagejevbench' ? 'image-jev-bench' : 'jev-models', model, target });
  try {
    if (!navigator.sendBeacon?.('/api/use-model-event', new Blob([body], { type: 'application/json' }))) {
      void fetch('/api/use-model-event', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true });
    }
  } catch { /* analytics never blocks navigation */ }
}

const OPTIONS: { target: Exclude<UseModelTarget, 'hub'>; title: string; text: string; icon: string }[] = [
  { target: 'dedicated', title: 'Dedicated hosting', text: 'Your own private endpoint, EU or global tier', icon: 'M4 6h16v5H4zM4 13h16v5H4zM7.5 8.5h.01M7.5 15.5h.01' },
  { target: 'api', title: 'Hosted API', text: 'Pay per use, or request it', icon: 'M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12' },
  { target: 'local', title: 'Run locally', text: 'Free installer with a hardware check', icon: 'M4 5h16v10H4zM9 19h6M12 15v4' },
  { target: 'hardware', title: 'Pre-installed hardware', text: 'A ready-to-run box, shipped to you', icon: 'M5 8l7-4 7 4v8l-7 4-7-4zM5 8l7 4 7-4M12 12v8' },
];

function Icon({ d, size = 14 }: { d: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={d} /></svg>;
}
const PLAY = 'M7 4.8v14.4a.8.8 0 001.2.7l11.2-7.2a.8.8 0 000-1.4L8.2 4.1A.8.8 0 007 4.8z';

function DmMark({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="7.5" fill="#0B0C0E" /><g transform="translate(-0.25 0)"><path d="M8 6.5H15.5A9.5 9.5 0 0 1 24.405 12.69L8 18.66Z" fill="#F5F6F3" /><path d="M8 21.427L24.97 15.25A9.5 9.5 0 0 1 15.5 25.5H8Z" fill="#12B886" /></g></svg>;
}

type Pos = { left: number; top: number; up: boolean };
const POP_W = 296;

function UseModelPopover({ pos, name, modelKey, benchmark, onEnter, onLeave, onNavigate }: {
  pos: Pos; name: string; modelKey: string; benchmark: UseModelBenchmark; onEnter: () => void; onLeave: () => void; onNavigate: (t: UseModelTarget) => void;
}) {
  const style: CSSProperties = { left: pos.left, top: pos.up ? undefined : pos.top, bottom: pos.up ? window.innerHeight - pos.top : undefined, width: POP_W };
  return createPortal(
    <div role="group" aria-label={`Ways to use ${name}`} className="bh-use-model-pop" style={style} data-bh-use-model-pop={modelKey} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <p className="bh-use-model-pop-head"><DmMark /><span><small>Use this model</small><b>{name}</b></span></p>
      <ul>
        {OPTIONS.map((o) => <li key={o.target}>
          <a href={useModelHref(modelKey, benchmark, o.target)} target="_blank" rel="noopener" onClick={() => onNavigate(o.target)} data-bh-use-model-option={o.target}>
            <span className="bh-use-model-pop-icon"><Icon d={o.icon} size={16} /></span>
            <span><b>{o.title}</b><small>{o.text}</small></span>
          </a>
        </li>)}
      </ul>
      <a className="bh-use-model-pop-all" href={useModelHref(modelKey, benchmark)} target="_blank" rel="noopener" onClick={() => onNavigate('hub')}>All options on Decision Models →</a>
    </div>,
    document.body,
  );
}

export function UseModelButton({ modelKey, name, benchmark = 'jevbench', className = '', label = 'Use' }: {
  modelKey: string; name: string; benchmark?: UseModelBenchmark; className?: string; label?: string;
}) {
  const enabled = usePreviewEnabled();
  const anchor = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hubHref = useModelHref(modelKey, benchmark);

  const open = useCallback(() => {
    clearTimeout(timer.current);
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    const up = rect.bottom + 280 > window.innerHeight && rect.top > 290;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - POP_W - 8));
    setPos({ left, top: up ? rect.top - 6 : rect.bottom + 6, up });
  }, []);
  const close = useCallback(() => { clearTimeout(timer.current); setPos(null); }, []);
  const later = useCallback((fn: () => void, ms: number) => { clearTimeout(timer.current); timer.current = setTimeout(fn, ms); }, []);
  const mouseless = () => later(close, 150);
  const mouse = (fn: () => void, ms: number) => (e: React.PointerEvent) => { if (e.pointerType === 'mouse') later(fn, ms); };

  useEffect(() => {
    if (!pos) return;
    document.documentElement.setAttribute('data-bh-use-model-open', '');
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const away = () => close();
    window.addEventListener('keydown', esc); window.addEventListener('scroll', away, true); window.addEventListener('resize', away);
    return () => { document.documentElement.removeAttribute('data-bh-use-model-open'); window.removeEventListener('keydown', esc); window.removeEventListener('scroll', away, true); window.removeEventListener('resize', away); };
  }, [pos, close]);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (!enabled) return null;
  const onNavigate = (t: UseModelTarget) => { track(t, modelKey, benchmark); close(); };

  return <span ref={anchor} className={`bh-use-model ${className}`} data-bh-use-model={modelKey}
    onPointerEnter={mouse(open, 160)} onPointerLeave={mouse(close, 220)} onFocus={(e) => { if (e.target.matches(':focus-visible')) open(); }} onBlur={mouseless}>
    <a href={hubHref} target="_blank" rel="noopener" className="bh-use-model-btn" onClick={() => onNavigate('hub')} data-bh-use-model-link
      aria-label={`Use ${name} on Decision Models: hosting, API, local install, hardware`} title={`Use ${name}: host it, call it, or run it locally`}>
      <Icon d={PLAY} size={11} /><span>{label}</span>
    </a>
    {pos && <UseModelPopover pos={pos} name={name} modelKey={modelKey} benchmark={benchmark} onEnter={() => clearTimeout(timer.current)} onLeave={() => later(close, 220)} onNavigate={onNavigate} />}
  </span>;
}

/** Row-level entry: renders the button for open-weights rows the hub knows, nothing for everything else. */
export function UseModelEntry({ row, name, benchmark = 'jevbench', ...rest }: {
  row: { key: string; api_flag?: boolean; listing?: string }; name: string; benchmark?: UseModelBenchmark; className?: string; label?: string;
}) {
  return useModelEligible(row, benchmark) ? <UseModelButton modelKey={row.key} name={name} benchmark={benchmark} {...rest} /> : null;
}
