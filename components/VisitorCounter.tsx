"use client";

import { useEffect, useState } from "react";

export function VisitorCounter() {
  const [visits, setVisits] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/analytics/visits", { credentials: "omit" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && Number.isSafeInteger(data?.visits) && data.visits >= 0) setVisits(data.visits);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (visits === null) return null;
  const label = `${visits.toLocaleString("en-US")} visitor sessions`;
  const description = "Anonymous visitor sessions since tracking began. A returning visitor can be counted again on another day.";
  return <span aria-label={`${label}. ${description}`} title={description}>{label}</span>;
}
