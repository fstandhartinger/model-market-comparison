"use client";

import { useEffect, useRef, useState } from "react";

const NEVER_KEY = "bh.jev.customEvaluation.never";
const SESSION_KEY = "bh.jev.customEvaluation.dismissed";

type Phase = "waiting" | "open" | "landing" | "landed" | "hidden";

export function CustomEvaluationOffer() {
  const [phase, setPhase] = useState<Phase>("waiting");
  const badge = useRef<HTMLAnchorElement>(null);
  const toast = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let suppressed = false;
    try { suppressed = localStorage.getItem(NEVER_KEY) === "1" || sessionStorage.getItem(SESSION_KEY) === "1"; } catch { /* storage may be unavailable */ }
    if (suppressed) { setPhase("hidden"); return; }
    const show = window.setTimeout(() => setPhase("open"), 6000);
    const land = window.setTimeout(() => setPhase("landing"), 14000);
    const finish = window.setTimeout(() => setPhase("landed"), 14950);
    return () => { clearTimeout(show); clearTimeout(land); clearTimeout(finish); };
  }, []);

  useEffect(() => {
    if (phase !== "landing" || !toast.current || !badge.current) return;
    const from = toast.current.getBoundingClientRect();
    const to = badge.current.getBoundingClientRect();
    toast.current.style.setProperty("--offer-x", `${to.left + to.width / 2 - (from.left + from.width / 2)}px`);
    toast.current.style.setProperty("--offer-y", `${to.top + to.height / 2 - (from.top + from.height / 2)}px`);
  }, [phase]);

  const dismiss = (never = false) => {
    try { sessionStorage.setItem(SESSION_KEY, "1"); if (never) localStorage.setItem(NEVER_KEY, "1"); } catch { /* dismissal still works in memory */ }
    setPhase("hidden");
  };

  useEffect(() => {
    if (phase !== "open") return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(false); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [phase]);

  return <>
    <a ref={badge} href="/jev-models/custom-evaluation" aria-label="Need custom eval on your data?" className={`bh-custom-evaluation-badge ml-2 ${phase === "landed" ? "is-wiggling" : ""}`} data-bh-custom-evaluation-badge>
      <span className="bh-offer-badge-full" aria-hidden="true">Need custom eval on your data?</span>
      <span className="bh-offer-badge-short" aria-hidden="true">Need a custom eval?</span>
    </a>
    {(phase === "open" || phase === "landing") && <div ref={toast} role="status" aria-live="polite" aria-atomic="true"
      className={`bh-custom-evaluation-toast ${phase === "landing" ? "is-landing" : ""}`} data-bh-custom-evaluation-toast data-phase={phase}>
      <p><span>Need custom eval on your data? JevBench is open source: run it yourself, or ask us to help.</span>{" "}<a href="/jev-models/custom-evaluation" className="font-semibold text-accent underline">See your options</a></p>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" className="min-h-11 px-2 text-xs text-accent underline" onClick={() => dismiss(true)}>Don&apos;t show again</button>
        <button type="button" className="min-h-11 min-w-11 text-lg" aria-label="Dismiss custom eval offer" onClick={() => dismiss(false)}>×</button>
      </div>
    </div>}
  </>;
}
