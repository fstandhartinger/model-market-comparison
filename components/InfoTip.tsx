"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
/** Long enough to cross the 8 px gap between the (i) and its panel, short enough not to feel sticky. */
const CLOSE_DELAY_MS = 300;

const tabbables = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)]
  .filter((el) => el.getClientRects().length > 0 && !el.closest("[inert], [aria-hidden='true']"));

/** R1.8: an (i) affordance that is a hover panel on pointer devices and a small
 *  closeable modal on touch/small screens.
 *
 *  Which one appears is decided by the input device, not by a width breakpoint: a
 *  hover panel is unreachable without a pointer, and a modal is the wrong weight
 *  for a mouse. `(hover: hover) and (pointer: fine)` is the only reliable signal for
 *  that. The media query is read after mount so SSR and the first client render agree.
 *
 *  CR-53 (user report 2026-09-16: "the information window doesn't stay open"): many panels
 *  hold links (How we calculate, AA/Epoch credits), so on pointer devices the panel is a real
 *  non-modal popover, not a pass-through tooltip:
 *  - hover opens it; leaving the trigger or the panel closes it only after a short grace
 *    period that any re-entry cancels, so the pointer can travel from the (i) into the panel;
 *  - a click pins it open until a second click, Escape, or a pointer-down outside;
 *  - keyboard focus opens it; Tab from the trigger enters the panel's links, Tab past the
 *    last link continues with the element after the trigger, Shift+Tab from the first link
 *    returns to the trigger, Escape closes and puts focus back on the trigger;
 *  - clicks and keys inside the panel never reach the table header or row that hosts the (i)
 *    (React portals bubble through the component tree).
 *  A panel without interactive content keeps `role="tooltip"`; one with links is a
 *  labelled non-modal `role="dialog"`. Touch keeps the modal with its ✕, which a tap on
 *  the backdrop or Escape also closes. */
export function InfoTip({ title, children, label }: { title: string; children: React.ReactNode; label?: string }) {
  const [precise, setPrecise] = useState(false);
  const [open, setOpen] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const pinned = useRef(false);
  const hovering = useRef({ trigger: false, panel: false });
  const closeTimer = useRef<number | null>(null);
  /** Focus handed back to the trigger by Escape must not reopen the panel it just closed. */
  const quietFocus = useRef(false);
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

  const cancelClose = () => {
    if (closeTimer.current != null) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const close = (returnFocus = false) => {
    cancelClose();
    pinned.current = false;
    setOpen(false);
    if (returnFocus) { quietFocus.current = true; triggerRef.current?.focus({ preventScroll: true }); quietFocus.current = false; }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      if (pinned.current || hovering.current.trigger || hovering.current.panel) return;
      const active = document.activeElement;
      if (active && tipRef.current?.contains(active)) return;
      if (active === triggerRef.current && triggerRef.current?.matches(":focus-visible")) return;
      setOpen(false);
    }, CLOSE_DELAY_MS);
  };
  useEffect(() => () => cancelClose(), []);

  // A pointer-down anywhere outside the trigger and its panel closes an open panel, pinned or not.
  useEffect(() => {
    if (!precise || !open) return;
    const down = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || tipRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [precise, open]);

  // Desktop panels are portalled as well as mobile dialogs. Table headers are sticky
  // and live inside an overflow-x container; an absolutely positioned panel there is
  // clipped or trapped under the table's stacking context. A fixed portal keeps it above
  // both the header and any open sheet while retaining the trigger's visual attachment.
  useEffect(() => {
    if (!precise || !open) { setTooltipPosition(null); return; }
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const halfWidth = 128;
      // The rendered height once the panel exists (a fixed 420 px guess put short panels far above their (i)).
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

  useEffect(() => {
    if (open && tooltipPosition && tipRef.current) setInteractive(tipRef.current.querySelector(FOCUSABLE) != null);
  }, [open, tooltipPosition]);

  /** Tab past the panel's last link: continue with whatever follows the trigger in the page. */
  const focusAfterTrigger = () => {
    const all = tabbables(document).filter((el) => !tipRef.current?.contains(el));
    const at = all.indexOf(triggerRef.current as HTMLElement);
    close();
    (all[at + 1] ?? triggerRef.current)?.focus();
  };

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      data-bh-infotip-trigger
      aria-label={label ? `About ${label}` : `About ${title}`}
      aria-describedby={precise && open && !interactive ? id : undefined}
      aria-controls={precise && open ? id : undefined}
      aria-haspopup={precise ? (interactive ? "dialog" : undefined) : "dialog"}
      aria-expanded={open}
      onClick={(event) => {
        event.stopPropagation();
        if (!precise) { setOpen(true); return; }
        if (open && pinned.current) { close(); return; }
        cancelClose();
        pinned.current = true;
        setOpen(true);
      }}
      onFocus={(event) => { if (precise && !quietFocus.current && event.currentTarget.matches(":focus-visible")) { cancelClose(); setOpen(true); } }}
      onBlur={(event) => {
        if (!precise) return;
        const next = event.relatedTarget as Node | null;
        if (next && tipRef.current?.contains(next)) return;
        if (next) close(); else scheduleClose();
      }}
      onPointerEnter={(event) => {
        if (!precise || event.pointerType !== "mouse") return;
        hovering.current.trigger = true;
        cancelClose();
        setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (!precise || event.pointerType !== "mouse") return;
        hovering.current.trigger = false;
        scheduleClose();
      }}
      onKeyDown={(event) => {
        if (!precise || !open) return;
        if (event.key === "Escape") { event.stopPropagation(); close(); return; }
        if (event.key === "Tab" && !event.shiftKey && tipRef.current) {
          const inside = tabbables(tipRef.current);
          if (inside.length) { event.preventDefault(); inside[0].focus(); }
        }
      }}
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
          <span ref={tipRef} id={id} data-bh-infotip-panel
            role={interactive ? "dialog" : "tooltip"}
            aria-label={interactive ? title : undefined}
            style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
            onPointerEnter={(event) => { if (event.pointerType === "mouse") { hovering.current.panel = true; cancelClose(); } }}
            onPointerLeave={(event) => { if (event.pointerType === "mouse") { hovering.current.panel = false; scheduleClose(); } }}
            onClick={(event) => event.stopPropagation()}
            onBlur={(event) => {
              const next = event.relatedTarget as Node | null;
              if (next && (tipRef.current?.contains(next) || next === triggerRef.current)) return;
              if (next) close(); else scheduleClose();
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Escape") { close(true); return; }
              if (event.key !== "Tab" || !tipRef.current) return;
              const inside = tabbables(tipRef.current);
              if (!inside.length) return;
              if (event.shiftKey && document.activeElement === inside[0]) { event.preventDefault(); triggerRef.current?.focus(); }
              else if (!event.shiftKey && document.activeElement === inside[inside.length - 1]) { event.preventDefault(); focusAfterTrigger(); }
            }}
            className="fixed z-[1000] max-h-[calc(100vh-16px)] w-64 -translate-x-1/2 overflow-y-auto rounded-lg border border-line bg-[#161b22] p-3 text-left text-xs font-normal normal-case tracking-normal text-gray-200 shadow-xl">
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
        <dialog ref={dialog} data-bh-infotip-panel onClose={() => setOpen(false)}
          onClick={(event) => {
            event.stopPropagation();
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
    </span>
  );
}
