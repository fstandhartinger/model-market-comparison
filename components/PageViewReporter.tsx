"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// CR-177.1: report in-app (client-router) navigations to our own origin, so Umami's page-view count is not
// only the full page loads that `middleware.ts` already forwards. Renders nothing.
//
// What it does NOT do (decision record ops/ux-2026-09-12/CR-67.5-CONSENT-DECISION.md §7): it sets no cookie,
// writes and reads no localStorage/sessionStorage/cache/client hint, loads no third-party script, and sends
// nothing on the first render — the server counted that load itself. The body is the path of the page the
// visitor navigated to, which the server would have seen as a request anyway, plus the ORIGIN of the site that
// referred the visitor to us (document.referrer reduced to scheme+host in the browser; the server keeps only an
// external host — growth measure A, 22 Nov 2026; never the referrer's path or query), and credentials are omitted so
// not even a signed-in session cookie travels with it. GPC/DNT stop it in the browser as well as on the server.
function referrerOrigin() {
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (!ref || (ref.protocol !== "https:" && ref.protocol !== "http:") || ref.host === window.location.host) return undefined;
    return ref.origin;
  } catch {
    return undefined;
  }
}

function reportPath(path: string) {
  const privacyNavigator = navigator as Navigator & { globalPrivacyControl?: boolean };
  const privacyWindow = window as Window & { doNotTrack?: string };
  if ([navigator.doNotTrack, privacyWindow.doNotTrack].some((value) => value === "1" || value === "yes") || privacyNavigator.globalPrivacyControl) return;
  void fetch("/api/page-view", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path, referrer: referrerOrigin() }),
    credentials: "omit",
    cache: "no-store",
    keepalive: true,
  }).catch(() => {});
}

export function PageViewReporter() {
  const pathname = usePathname();
  // The first value is the page load the server already counted; only later values are in-app navigations.
  const counted = useRef<string | null>(null);
  useEffect(() => {
    if (!pathname) return;
    if (counted.current === null) { counted.current = pathname; return; }
    if (counted.current === pathname) return;
    counted.current = pathname;
    reportPath(pathname);
  }, [pathname]);
  return null;
}
