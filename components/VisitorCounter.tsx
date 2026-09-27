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
  return <span aria-label={`${visits.toLocaleString("en-US")} visits`}>{visits.toLocaleString("en-US")} visits</span>;
}
