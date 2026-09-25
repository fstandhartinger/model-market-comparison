"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const PERMANENT_KEY = "bh-fastlane-banner-hidden";
const SESSION_KEY = "bh-fastlane-banner-closed";

function track(name: "fastlane_banner_view" | "fastlane_banner_click" | "fastlane_banner_dismiss", pathname: string) {
  const privacyNavigator = navigator as Navigator & { globalPrivacyControl?: boolean };
  const privacyWindow = window as Window & { doNotTrack?: string };
  if ([navigator.doNotTrack, privacyWindow.doNotTrack].some((value) => value === "1" || value === "yes") || privacyNavigator.globalPrivacyControl) return;
  const page = pathname.startsWith("/image-jev-bench") ? "image-jev-bench" : "jev-models";
  const body = new Blob([JSON.stringify({ name, page })], { type: "application/json" });
  if (!navigator.sendBeacon?.("/api/fastlane-banner-event", body)) {
    void fetch("/api/fastlane-banner-event", { method: "POST", body, keepalive: true, credentials: "omit" }).catch(() => {});
  }
}

function appliesTo(pathname: string) {
  return pathname.startsWith("/jev-models") || pathname.startsWith("/image-jev-bench");
}

export function FastlaneBanner() {
  const pathname = usePathname() || "";
  const [visible, setVisible] = useState(false);
  // CR-167.2 / D207: the phone form starts as a one-line teaser so the fixed bar cannot cover the
  // first result row. Tapping it reveals the full offer; desktop always shows the full offer (CSS).
  const [expanded, setExpanded] = useState(false);
  const bannerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!appliesTo(pathname)) {
      setVisible(false);
      return;
    }
    let dismissed = false;
    try { dismissed = localStorage.getItem(PERMANENT_KEY) === "1"; } catch { /* Storage may be blocked. */ }
    try { dismissed ||= sessionStorage.getItem(SESSION_KEY) === "1"; } catch { /* Storage may be blocked. */ }
    if (dismissed) {
      setVisible(false);
      return;
    }
    setVisible(true);
    setExpanded(false);
    track("fastlane_banner_view", pathname);
  }, [pathname]);

  useEffect(() => {
    if (!visible || !bannerRef.current) return;
    const banner = bannerRef.current;
    const reserve = () => {
      document.body.style.setProperty("--bh-fastlane-height", `${banner.getBoundingClientRect().height}px`);
      document.body.classList.add("bh-fastlane-visible");
    };
    reserve();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(reserve) : null;
    observer?.observe(banner);
    window.addEventListener("resize", reserve);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", reserve);
      document.body.classList.remove("bh-fastlane-visible");
      document.body.style.removeProperty("--bh-fastlane-height");
    };
  }, [visible, expanded]);

  if (!visible) return null;

  const dismiss = (permanent: boolean) => {
    track("fastlane_banner_dismiss", pathname);
    let savedPermanently = false;
    try {
      if (permanent) {
        localStorage.setItem(PERMANENT_KEY, "1");
        savedPermanently = true;
      }
    }
    catch { /* Keep the in-memory dismissal when storage is unavailable. */ }
    try { if (!savedPermanently) sessionStorage.setItem(SESSION_KEY, "1"); }
    catch { /* Keep the in-memory dismissal when storage is unavailable. */ }
    setVisible(false);
  };

  return (
    <aside ref={bannerRef} className="bh-fastlane-banner" aria-label="Priority model evaluation" data-bh-fastlane-banner data-bh-fastlane-expanded={expanded ? "yes" : "no"}>
      <div className="bh-fastlane-inner">
        <button
          type="button"
          className="bh-fastlane-teaser"
          aria-expanded={expanded}
          aria-controls="bh-fastlane-body"
          onClick={() => setExpanded(true)}
          data-bh-fastlane-teaser
        >
          <span className="bh-fastlane-teaser-label">
            <strong>Are you a model developer?</strong> Priority evaluations
          </span>
          <span className="bh-fastlane-teaser-more" aria-hidden="true">+</span>
        </button>
        <div className="bh-fastlane-body" id="bh-fastlane-body" data-bh-fastlane-body>
          <p className="bh-fastlane-copy">
            <strong>Are you a model developer?</strong> Want an extra evaluation, or your model evaluated sooner?
            Running this benchmark takes a lot of compute and time, so we charge for priority runs.
          </p>
          <div className="bh-fastlane-actions">
            <button type="button" className="bh-fastlane-primary" onClick={() => dismiss(true)}>
              Don&apos;t show again
            </button>
            <Link className="bh-fastlane-secondary" href="/jev-models/request-evaluation" onClick={() => track("fastlane_banner_click", pathname)}>
              Request an evaluation <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <button type="button" className="bh-fastlane-close" aria-label="Close priority evaluation banner for this session" onClick={() => dismiss(false)}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </aside>
  );
}
