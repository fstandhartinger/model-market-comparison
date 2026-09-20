"use client";

import { useEffect, useRef, type ReactNode } from "react";

const TARGET = "#jev-costs";

export function JevCostsDisclosure({ children }: { children: ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const reveal = () => {
      const details = detailsRef.current;
      if (!details || window.location.hash !== TARGET) return;
      details.open = true;
      window.setTimeout(() => details.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      }), 0);
    };
    const onHashChange = () => reveal();
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(`a[href="${TARGET}"]`) : null;
      if (!target) return;
      window.setTimeout(() => reveal(), 0);
    };
    reveal();
    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, []);

  return <details ref={detailsRef} id="jev-costs" className="bh-panel scroll-mt-6 p-4" data-bh-jev-costs-details>
    <summary className="cursor-pointer text-sm font-semibold">How costs are estimated</summary>
    {children}
  </details>;
}
