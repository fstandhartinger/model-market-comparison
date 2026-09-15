"use client";
import { useState } from "react";
import Link from "next/link";
import catalogJson from "../data/raw/subscriptions.json";
import { estimablePlans, subscriptionEstimate, subscriptionView, type SubscriptionCatalog, type SubscriptionRow, type CompanyUse, type SubscriptionViewPlan } from "../lib/subscriptions.mjs";
import { useSettings } from "./SettingsContext";
import { priceNumber } from "./PriceValue";

const catalog = catalogJson as unknown as SubscriptionCatalog;
/** CR-16.1: eligibility is provider-, plan-, region- and contract-dependent; labels say what the
 *  terms we read say, never that a consumer plan is a business-safe API equivalent. */
const ELIGIBILITY: Record<CompanyUse, { label: string; tone: string; flag: boolean }> = {
  allowed: { label: "Business use covered by its terms", tone: "text-emerald-400", flag: false },
  not_allowed: { label: "Consumer terms restrict business use", tone: "text-warn", flag: true },
  unclear: { label: "Business use depends on plan, region and contract", tone: "text-gray-400", flag: true },
};
const usd = (v: number) => `$${Number.isInteger(v) ? v : v.toFixed(2)}`;

/** CR-16.3: optional, assumption-based estimate — visibly separate from the API cost. */
function Estimate({ plans, perTask }: { plans: SubscriptionViewPlan[]; perTask: boolean }) {
  const options = estimablePlans(plans);
  const [planId, setPlanId] = useState(options[0]?.id ?? "");
  const [tasks, setTasks] = useState(200);
  const [extra, setExtra] = useState(0);
  const plan = options.find((p) => p.id === planId) ?? options[0];
  if (!plan) return null;
  const value = subscriptionEstimate({ usdPerMonth: plan.usd_per_month!, extraUsd: extra, tasksPerMonth: tasks });
  const eligibility = ELIGIBILITY[plan.company_use];
  return <section aria-label="Subscription cost estimate" className="mt-4 rounded-lg border border-dashed border-line p-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Estimate a plan&apos;s cost per task · your assumptions, not guaranteed capacity</p>
    <div className="mt-2 grid gap-3 sm:grid-cols-3">
      <label className="text-xs text-gray-400">Plan
        <select className="bh-input mt-1 block w-full text-sm" value={plan.id} onChange={(e) => setPlanId(e.target.value)}>
          {options.map((p) => <option key={p.id} value={p.id}>{p.name} · {usd(p.usd_per_month!)}/mo</option>)}
        </select></label>
      <label className="text-xs text-gray-400">Completed tasks per month <span className="text-gray-500">(assumption; 200 is only an example)</span>
        <input type="number" inputMode="numeric" min={1} step={1} className="bh-input mt-1 block w-full text-sm tabular" value={Number.isFinite(tasks) ? tasks : ""} onChange={(e) => setTasks(e.target.valueAsNumber)} /></label>
      <label className="text-xs text-gray-400">Extra usage charges per month, $ <span className="text-gray-500">(optional)</span>
        <input type="number" inputMode="decimal" min={0} step={1} className="bh-input mt-1 block w-full text-sm tabular" value={Number.isFinite(extra) ? extra : ""} onChange={(e) => setExtra(e.target.valueAsNumber)} /></label>
    </div>
    <p className="mt-3 text-sm" data-testid="subscription-estimate">
      {value == null ? <span className="text-gray-500">Enter at least one task per month and a non-negative extra charge.</span>
        : <><b className="tabular">≈ {priceNumber(value)} per task</b> <span className="bh-badge ml-1">subscription estimate</span></>}
      {plan.reference && perTask && <span className="text-gray-500"> · API baseline: {priceNumber(plan.reference.cost)} per task for {plan.reference.name}</span>}
    </p>
    <p className="mt-1 text-xs text-gray-500">
      ({usd(plan.usd_per_month!)} monthly fee{extra > 0 ? ` + ${usd(extra)} extra usage` : ""}) ÷ {Number.isFinite(tasks) ? tasks.toLocaleString("en-US") : "—"} tasks. This only holds if the plan&apos;s limits really cover that many tasks a month; {plan.included.charAt(0).toLowerCase() + plan.included.slice(1)}.
      {eligibility.flag && <> <span className={eligibility.tone}>⚑ {eligibility.label}.</span></>}
    </p>
  </section>;
}

/** R6.3 / CR-16.2: API pricing stays the baseline everywhere; subscriptions are a quiet, folded
 *  secondary note below the ranking, with the explanation, an optional estimate and the plans. */
export function SubscriptionsPanel({ rows, perTask }: { rows: SubscriptionRow[]; perTask: boolean }) {
  const { isCompany } = useSettings();
  const view = subscriptionView(catalog, { isCompany, rows: perTask ? rows : [] });
  const displayPlans = view.plans.filter((plan) => plan.usd_per_month != null);
  const uncollected = view.plans.filter((plan) => plan.usd_per_month == null);
  return (
    <details className="card mt-4 px-4 py-3" aria-label="Subscriptions">
      <summary className="cursor-pointer text-sm font-semibold">
        Subscription costs may differ{" "}
        <span className="text-xs font-normal text-gray-500">· the costs above are API prices</span>
      </summary>
      <div className="mt-2 max-w-3xl space-y-2 text-xs text-gray-400">
        <p>Subscription plans can make the effective cost per task much lower for heavy users. They are not fixed token bundles, though: their session, weekly and other limits vary and are mostly unpublished, so their effective cost per task depends on how much you use them and cannot be stated as one universal number.</p>
        <p>They are also not interchangeable with API access. Account sharing, resale and automation are restricted and rate limits apply, and whether a business may use a plan depends on the provider, the plan, the region and the contract. Team, Enterprise and API access are the safer commercial categories.
          {isCompany && view.hiddenForCompany > 0 && <> With &ldquo;buying for a company&rdquo; set, consumer plans whose terms restrict business use are set aside.</>}
          {" "}<Link href="/about#subscriptions" className="text-accent underline">How we read the terms ↗</Link></p>
      </div>
      <Estimate plans={view.plans} perTask={perTask} />
      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Plans · list prices {view.retrieved_at}{isCompany ? " · open to companies" : ""}</h3>
      <ul className="mt-1 divide-y divide-line/60">
        {displayPlans.map((p) => {
          const e = ELIGIBILITY[p.company_use];
          return <li key={p.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 py-2 text-sm sm:grid-cols-[minmax(0,14rem)_6.5rem_12rem_1fr]">
            <span className="min-w-0 font-medium">{p.name}</span>
            <span className="text-right tabular">{p.price_is_from ? "from " : ""}{usd(p.usd_per_month!)}<span className="text-xs text-gray-500">/mo</span></span>
            <span className={`col-span-2 text-xs sm:col-span-1 ${e.tone}`}>{e.flag ? "⚑ " : ""}{e.label}</span>
            <span className="col-span-2 text-xs text-gray-500 sm:col-span-1">
              {p.breakEvenTasks != null && p.reference
                ? <>Cheaper than the API above <b className="text-gray-300">{p.breakEvenTasks.toLocaleString("en-US")}</b> tasks/mo of {p.reference.name}, if its limits allow · </>
                : p.flat_rate && p.org && perTask ? <>No {p.org} model in your view to compare · </> : null}
              {p.included}{p.billing_note ? ` · ${p.billing_note}` : ""}
            </span>
          </li>;
        })}
      </ul>
      {uncollected.length > 0 && <p className="mt-2 text-xs text-gray-500">Not collected: {uncollected.map((plan) => plan.name).join(", ")} — the vendor sites refuse automated reads.</p>}
    </details>
  );
}
