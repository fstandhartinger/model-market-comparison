"use client";

import { useEffect } from "react";
import { sanitizeAnalyticsPayload } from "../lib/analytics-privacy.mjs";

const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const EMPTY = new Set<string>();
const ANALYTICS_HOSTNAMES = new Set(["benchmarkheaven.com", "www.benchmarkheaven.com"]);

declare global {
  interface Window {
    bhUmamiBeforeSend?: (type: string, payload: Record<string, unknown>) => Record<string, unknown> | false;
  }
}

type IdResponse = { models?: unknown; modelFamilies?: unknown; jevSystems?: unknown };

function idSet(value: unknown) {
  return new Set(Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 100)
    : []);
}

async function publicIds() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch("/api/analytics/ids", {
      cache: "force-cache",
      credentials: "omit",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return { models: EMPTY, modelFamilies: EMPTY, jevSystems: EMPTY };
    const body = await response.json() as IdResponse;
    return {
      models: idSet(body.models),
      modelFamilies: idSet(body.modelFamilies),
      jevSystems: idSet(body.jevSystems),
    };
  } catch {
    // Fail closed for query values while still counting page paths.
    return { models: EMPTY, modelFamilies: EMPTY, jevSystems: EMPTY };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function Analytics() {
  useEffect(() => {
    if (
      !WEBSITE_ID ||
      process.env.NODE_ENV !== "production" ||
      window.location.protocol !== "https:" ||
      !ANALYTICS_HOSTNAMES.has(window.location.hostname.toLowerCase())
    ) return;
    const privacyNavigator = navigator as Navigator & { msDoNotTrack?: string; globalPrivacyControl?: boolean };
    const privacyWindow = window as Window & { doNotTrack?: string };
    if ([navigator.doNotTrack, privacyWindow.doNotTrack, privacyNavigator.msDoNotTrack].some((value) => value === "1" || value === "yes")) return;
    if (privacyNavigator.globalPrivacyControl) return;

    let cancelled = false;
    void publicIds().then(({ models, modelFamilies, jevSystems }) => {
      if (cancelled) return;
      window.bhUmamiBeforeSend = (type, payload) => type === "event" && !("name" in payload) && !("data" in payload)
        ? sanitizeAnalyticsPayload(payload, {
          origin: window.location.origin,
          fallbackUrl: window.location.pathname,
          modelIds: models,
          modelFamilyIds: modelFamilies,
          jevSystemIds: jevSystems,
        })
        : false;

      if (document.getElementById("bh-umami-tracker")) return;
      const script = document.createElement("script");
      script.id = "bh-umami-tracker";
      script.async = true;
      script.src = "/analytics/script.js";
      script.dataset.websiteId = WEBSITE_ID;
      script.dataset.hostUrl = `${window.location.origin}/analytics`;
      script.dataset.domains = "benchmarkheaven.com,www.benchmarkheaven.com";
      script.dataset.doNotTrack = "true";
      script.dataset.excludeHash = "true";
      script.dataset.fetchCredentials = "omit";
      script.dataset.beforeSend = "bhUmamiBeforeSend";
      document.head.appendChild(script);
    });

    return () => { cancelled = true; };
  }, []);

  return null;
}
