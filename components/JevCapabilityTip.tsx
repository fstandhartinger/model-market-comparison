'use client';

// F-200 (pass 36): the Capability row's ⓘ keeps its CR-169 glyph and placement, holds the definition list
// twice — once in the CSS hover/focus panel for pointer devices, once in InfoTip's modal pattern for touch —
// so the panel never covers the next rows on a phone. The 300-character native title on the row is gone.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function JevCapabilityTip({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const lastPointerType = useRef('');
  useEffect(() => { if (open) dialog.current?.showModal(); }, [open]);
  // A tap synthesized click carries no pointerType, so the pointerdown records it: a touch tap on a
  // phone-width row opens the modal (the floating panel is pointer-width only, see globals.css), while a
  // mouse click does nothing — pointer devices already get the hover/focus panel from the row's group-hover.
  return <>
    <button type="button" className="bh-jev-info relative ml-1 inline-flex h-4 min-h-0 w-4 shrink-0 items-center justify-center rounded text-accent before:absolute before:-inset-3 before:content-[''] focus:outline focus:outline-2"
      aria-label={label}
      onPointerDown={(event) => { lastPointerType.current = event.pointerType; }}
      onClick={(event) => {
        event.stopPropagation();
        if (lastPointerType.current === 'touch' && window.innerWidth < 640) setOpen(true);
        lastPointerType.current = '';
      }}>ⓘ</button>
    {open && createPortal(
      <dialog ref={dialog} role="dialog" aria-modal="true" onClose={() => setOpen(false)}
        onClick={(event) => {
          // A tap on the backdrop lands on the <dialog> itself, outside its box.
          const box = dialog.current?.getBoundingClientRect();
          if (event.target === dialog.current && box && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.current?.close();
        }}
        onKeyDown={(event) => event.stopPropagation()}
        aria-label={title}
        className="m-auto w-[min(26rem,92vw)] rounded-xl border border-line bg-[#161b22] p-4 text-left text-sm font-normal normal-case tracking-normal text-gray-200 shadow-xl backdrop:bg-black/70">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="font-semibold text-gray-100">{title}</h2>
          <button autoFocus type="button" aria-label="Close" onClick={() => dialog.current?.close()}
            className="-mt-1 rounded px-2 py-0.5 text-lg leading-none text-gray-400 hover:text-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">✕</button>
        </div>
        <div className="text-xs leading-relaxed text-gray-300">{children}</div>
      </dialog>, document.body)}
  </>;
}
