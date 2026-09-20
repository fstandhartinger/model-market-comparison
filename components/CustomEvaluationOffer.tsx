"use client";

import { useEffect, useRef, useState } from "react";

const NEVER_KEY = "bh.jev.customEvaluation.never";
const SESSION_KEY = "bh.jev.customEvaluation.dismissed";

type Phase = "waiting" | "open" | "landing" | "landed" | "hidden";

export function CustomEvaluationOffer() {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [bottom, setBottom] = useState(16);
  const badge = useRef<HTMLAnchorElement>(null);
  const toast = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let suppressed = false;
    try { suppressed = localStorage.getItem(NEVER_KEY) === "1" || sessionStorage.getItem(SESSION_KEY) === "1"; } catch { /* storage may be unavailable */ }
    if (suppressed) { setPhase("hidden"); return; }
    const show = window.setTimeout(() => setPhase("open"), 6000);
    const land = window.setTimeout(() => setPhase("landing"), 14000);
    const finish = window.setTimeout(() => setPhase("landed"), 14700);
    return () => { clearTimeout(show); clearTimeout(land); clearTimeout(finish); };
  }, []);

  useEffect(() => {
    if (phase !== "open") return;
    const place = () => {
      if (window.innerWidth >= 640) { setBottom(16); return; }
      const height = toast.current?.getBoundingClientRect().height ?? 92;
      const blockers = Array.from(document.querySelectorAll<HTMLElement>("[data-bh-jev12-main-chart], [data-bh-jev12-difficulty], [data-bh-jev12-table]"));
      const hit = blockers.map((node) => node.getBoundingClientRect()).filter((r) => r.bottom > 0 && r.top < window.innerHeight && r.top < window.innerHeight - 8 && r.bottom > window.innerHeight - height - 24).sort((a, b) => a.top - b.top)[0];
      setBottom(hit ? Math.max(16, window.innerHeight - hit.top + 8) : 16);
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place); };
  }, [phase]);

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
    <a ref={badge} href="/jev-models/custom-evaluation" className="bh-thin-tag ml-2 inline-flex min-h-7 items-center text-accent" data-bh-custom-evaluation-badge>Custom evaluation</a>
    {(phase === "open" || phase === "landing") && <div ref={toast} role="status" aria-live="polite" aria-atomic="true"
      className={`bh-custom-evaluation-toast ${phase === "landing" ? "is-landing" : ""}`} style={{ bottom }} data-bh-custom-evaluation-toast data-phase={phase}>
      <p><span>Benchmark Jev-class models on your own data.</span>{" "}<a href="/jev-models/custom-evaluation" className="font-semibold text-accent underline">How it works</a></p>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" className="min-h-11 px-2 text-xs text-accent underline" onClick={() => dismiss(true)}>Don&apos;t show again</button>
        <button type="button" className="min-h-11 min-w-11 text-lg" aria-label="Dismiss custom evaluation offer" onClick={() => dismiss(false)}>×</button>
      </div>
    </div>}
  </>;
}
