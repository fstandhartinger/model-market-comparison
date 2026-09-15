"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** R1.8: an (i) affordance that is a hover tooltip on pointer devices and a small
 *  closeable modal on touch/small screens.
 *
 *  Which one appears is decided by the input device, not by a width breakpoint: a
 *  hover tooltip is unreachable without a pointer, and a modal is the wrong weight
 *  for a mouse. `(hover: hover) and (pointer: fine)` is the only reliable signal for
 *  that. The media query is read after mount so SSR and the first client render agree.
 *
 *  Both paths render the same text, the trigger is a real focusable button with
 *  `aria-describedby`/`aria-haspopup`, keyboard focus opens the tooltip, and Escape
 *  closes either — so the explanation is reachable without a mouse and to a screen
 *  reader. */
export function InfoTip({ title, children, label }: { title: string; children: React.ReactNode; label?: string }) {
  const [precise, setPrecise] = useState(false);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
  const id = useId();

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setPrecise(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => { if (open && !precise) dialog.current?.showModal(); }, [open, precise]);

  // Desktop tooltips are portalled as well as mobile dialogs. Table headers are sticky
  // and live inside an overflow-x container; an absolutely positioned tooltip there is
  // clipped or trapped under the table's stacking context. A fixed portal keeps it above
  // both the header and any open sheet while retaining the trigger's visual attachment.
  useEffect(() => {
    if (!precise || !open) return;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const halfWidth = 128;
      // The rendered height once the tooltip exists (a fixed 420 px guess put short tooltips far above their (i)).
      const tooltipHeight = tipRef.current?.offsetHeight || 160;
      const below = rect.bottom + 8;
      setTooltipPosition({
        left: Math.min(Math.max(rect.left + rect.width / 2, halfWidth + 8), window.innerWidth - halfWidth - 8),
        top: below + tooltipHeight <= window.innerHeight
          ? below
          : Math.max(8, rect.top - tooltipHeight - 8),
      });
    };
    update();
    // Re-place once the portal has rendered and its real height is known.
    const frame = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [precise, open]);

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      aria-label={label ? `About ${label}` : `About ${title}`}
      aria-describedby={precise && open ? id : undefined}
      aria-haspopup={precise ? undefined : "dialog"}
      aria-expanded={precise ? open : undefined}
      onClick={(event) => { event.stopPropagation(); setOpen(precise ? !open : true); }}
      onFocus={() => precise && setOpen(true)}
      onBlur={() => precise && setOpen(false)}
      onMouseEnter={() => precise && setOpen(true)}
      onMouseLeave={() => precise && setOpen(false)}
      onKeyDown={(event) => { if (event.key === "Escape" && precise) setOpen(false); }}
      // The global 44px button min-height stretched the 16px circle into a capsule; the
      // before: layer keeps a 40px tap area without changing how the circle looks.
      className="relative ml-1 inline-flex h-4 min-h-0 w-4 shrink-0 before:absolute before:-inset-3 before:content-[''] items-center justify-center rounded-full border border-current/50 bg-transparent text-[10px] font-normal leading-none text-gray-400 align-middle hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      i
    </button>
  );

  if (precise) {
    return (
      <span className="relative inline-flex items-center normal-case">
        {trigger}
        {open && tooltipPosition && createPortal(
          <span ref={tipRef} role="tooltip" id={id}
            style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
            className="pointer-events-none fixed z-[1000] w-64 -translate-x-1/2 rounded-lg border border-line bg-[#161b22] p-3 text-left text-xs font-normal normal-case tracking-normal text-gray-200 shadow-xl">
            <span className="mb-1 block font-semibold text-gray-100">{title}</span>
            <span className="block leading-relaxed text-gray-300">{children}</span>
          </span>, document.body)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center normal-case">
      {trigger}
      {open && createPortal(
        <dialog ref={dialog} onClose={() => setOpen(false)} onClick={(event) => event.stopPropagation()}
          aria-label={title}
          className="m-auto w-[min(26rem,92vw)] rounded-xl border border-line bg-[#161b22] p-4 text-left text-sm font-normal normal-case tracking-normal text-gray-200 shadow-xl backdrop:bg-black/70">
          <div className="mb-2 flex items-start justify-between gap-3">
            <h2 className="font-semibold text-gray-100">{title}</h2>
            <button autoFocus type="button" aria-label="Close" onClick={() => dialog.current?.close()}
              className="-mt-1 rounded px-2 py-0.5 text-lg leading-none text-gray-400 hover:text-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">✕</button>
          </div>
          <div className="text-xs leading-relaxed text-gray-300">{children}</div>
        </dialog>, document.body)}
    </span>
  );
}
