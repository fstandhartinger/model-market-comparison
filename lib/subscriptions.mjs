/**
 * R6.3 — subscriptions next to the per-task cost view.
 *
 * No vendor in our catalog publishes how many tasks a flat-rate plan includes (GitHub
 * publishes a credit allowance, which is money, not tasks). So we never turn a monthly
 * price into a per-task price. What we can say honestly is the break-even point: a
 * flat-rate plan is cheaper than the API only if its unpublished quota reaches
 * `price / API cost per task` tasks a month for the vendor's best model in view.
 */

export const COMPANY_USE = ["allowed", "not_allowed", "unclear"];
const AUDIENCES = ["individual", "business"];

/** Structural checks that keep an unsourced or half-filled plan out of the UI. */
export function validateCatalog(catalog) {
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(catalog?.retrieved_at ?? "")) errors.push("retrieved_at must be a date");
  const ids = new Set();
  for (const [key, v] of Object.entries(catalog?.vendors ?? {})) {
    if (!COMPANY_USE.includes(v.consumer_company_use)) errors.push(`${key}: bad consumer_company_use`);
    if (!/^https:\/\//.test(v.terms_url ?? "") || !/^https:\/\//.test(v.pricing_url ?? "")) errors.push(`${key}: missing source URL`);
    if (v.quote == null && !v.quote_note) errors.push(`${key}: a missing quote needs a quote_note`);
    if (v.pricing_checked_at && !/^\d{4}-\d{2}-\d{2}$/.test(v.pricing_checked_at)) errors.push(`${key}: bad pricing_checked_at`);
    for (const field of ["pricing_source_sha256", "pricing_evidence_receipt_sha256"]) {
      if (v[field] != null && !/^[a-f0-9]{64}$/.test(v[field])) errors.push(`${key}: bad ${field}`);
    }
  }
  for (const p of catalog?.plans ?? []) {
    if (ids.has(p.id)) errors.push(`${p.id}: duplicate id`);
    ids.add(p.id);
    if (!catalog.vendors?.[p.vendor]) errors.push(`${p.id}: unknown vendor ${p.vendor}`);
    if (!AUDIENCES.includes(p.audience)) errors.push(`${p.id}: bad audience`);
    if (p.usd_per_month != null && !(Number.isFinite(p.usd_per_month) && p.usd_per_month > 0)) errors.push(`${p.id}: bad price`);
    if (typeof p.included !== "string" || !p.included) errors.push(`${p.id}: included must say what is (not) published`);
    if (p.source_checked_at && !/^\d{4}-\d{2}-\d{2}$/.test(p.source_checked_at)) errors.push(`${p.id}: bad source_checked_at`);
    if (p.source_url && !/^https:\/\//.test(p.source_url)) errors.push(`${p.id}: bad source_url`);
    if (p.source_sha256 != null && !/^[a-f0-9]{64}$/.test(p.source_sha256)) errors.push(`${p.id}: bad source_sha256`);
    if (p.source_receipts != null && (!Array.isArray(p.source_receipts) || p.source_receipts.some((r) => !/^https:\/\//.test(r.url ?? "") || !/^[a-f0-9]{64}$/.test(r.source_sha256 ?? r.evidence_receipt_sha256 ?? "")))) errors.push(`${p.id}: bad source_receipts`);
  }
  return errors;
}

/** Company use of one plan: business plans are made for companies; consumer plans inherit
 *  the vendor's published verdict. */
export function companyUse(catalog, plan) {
  return plan.audience === "business" ? "allowed" : catalog.vendors[plan.vendor].consumer_company_use;
}

/**
 * @param catalog  data/raw/subscriptions.json
 * @param opts.isCompany  R6.1 answer. Companies see business plans plus every consumer plan
 *        whose terms do not exclude business use; individuals see consumer plans.
 * @param opts.rows  models currently in view: { id, name, org, score, cost } with cost in
 *        adjusted USD per task. Pass [] when the view is not priced per task.
 */
/** CR-16.3 (Florian 2026-09-15): assumption-based estimate, kept apart from API cost.
 *  Effective cost per task = (monthly fee + extra usage charges) ÷ completed tasks per month.
 *  Every input is the user's assumption; null when an input is unusable. Never a token allowance. */
export function subscriptionEstimate({ usdPerMonth, extraUsd = 0, tasksPerMonth }) {
  if (!(Number.isFinite(usdPerMonth) && usdPerMonth > 0)) return null;
  if (!(Number.isFinite(extraUsd) && extraUsd >= 0)) return null;
  if (!(Number.isFinite(tasksPerMonth) && tasksPerMonth >= 1)) return null;
  return (usdPerMonth + extraUsd) / tasksPerMonth;
}

/** The workflows the estimate supports: flat-rate plans of one model vendor whose price we collected.
 *  Credit-metered or multi-vendor tools (Copilot, Cursor) and uncollected prices are left out. */
export function estimablePlans(plans) {
  return plans.filter((p) => p.flat_rate && p.org && p.usd_per_month != null);
}

export function subscriptionView(catalog, { isCompany = false, rows = [] } = {}) {
  const best = new Map();
  for (const r of rows) {
    if (r.cost == null || !Number.isFinite(r.cost) || r.cost <= 0) continue;
    const cur = best.get(r.org);
    if (!cur || (r.score ?? -Infinity) > (cur.score ?? -Infinity)) best.set(r.org, r);
  }
  let hiddenForCompany = 0;
  const plans = [];
  for (const plan of catalog.plans) {
    const use = companyUse(catalog, plan);
    if (isCompany && use === "not_allowed") { hiddenForCompany++; continue; }
    if (!isCompany && plan.audience === "business") continue;
    const ref = plan.flat_rate && plan.org ? best.get(plan.org) ?? null : null;
    const breakEvenTasks = ref && plan.usd_per_month != null ? Math.floor(plan.usd_per_month / ref.cost) : null;
    plans.push({
      ...plan,
      company_use: use,
      reference: ref ? { id: ref.id, name: ref.name, cost: ref.cost } : null,
      breakEvenTasks,
    });
  }
  return { plans, hiddenForCompany, retrieved_at: catalog.retrieved_at };
}
