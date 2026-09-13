"use client";
import Link from "next/link";
import catalogJson from "../data/raw/subscriptions.json";
import { subscriptionView, type SubscriptionCatalog, type SubscriptionRow, type CompanyUse } from "../lib/subscriptions.mjs";
import { useSettings } from "./SettingsContext";

const catalog = catalogJson as unknown as SubscriptionCatalog;
const VERDICT: Record<CompanyUse, { label: string; tone: string }> = {
  allowed: { label: "Company use allowed", tone: "text-emerald-400" },
  not_allowed: { label: "Personal use only", tone: "bh-badge" },
  unclear: { label: "Company use unclear", tone: "bh-badge" },
};
const usd = (v: number) => `$${Number.isInteger(v) ? v : v.toFixed(2)}`;

/** R6.3: flat-rate plans beside the per-task ranking. Folded by default — it answers a
 *  follow-up question ("would a subscription be cheaper?"), not the first one. */
export function SubscriptionsPanel({ rows, perTask }: { rows: SubscriptionRow[]; perTask: boolean }) {
  const { isCompany } = useSettings();
  const view = subscriptionView(catalog, { isCompany, rows: perTask ? rows : [] });
  const displayPlans = view.plans.filter((plan) => plan.usd_per_month != null);
  const uncollected = view.plans.filter((plan) => plan.usd_per_month == null);
  return (
    <details className="card mt-4 px-4 py-3" aria-label="Subscriptions">
      <summary className="cursor-pointer text-sm font-semibold">
        Would a subscription be cheaper?{" "}
        <span className="text-xs font-normal text-gray-500">· {displayPlans.length} {isCompany ? "plans open to companies" : "personal plans"}{isCompany && view.hiddenForCompany > 0 ? ` · ${view.hiddenForCompany} hidden for company use` : ""}</span>
      </summary>
      <p className="mt-2 text-xs text-gray-500">
        Monthly list prices from the vendors&apos; own pages, {view.retrieved_at}. No vendor publishes how many
        tasks a plan includes, so we show where it breaks even: the plan beats the API only if its quota
        covers that many tasks a month.
        {isCompany && view.hiddenForCompany > 0 && <> Consumer plans whose terms rule out business use are hidden.</>}
        {!perTask && <> Switch the price basis to adjusted cost to see break-even points.</>}
        {" "}<Link href="/about#subscriptions" className="text-accent underline">How we read the terms ↗</Link>
      </p>
      <ul className="mt-2 divide-y divide-line/60">
        {displayPlans.map((p) => (
          <li key={p.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 py-2 text-sm sm:grid-cols-[minmax(0,14rem)_6.5rem_10rem_1fr]">
            <span className="min-w-0 font-medium">{p.name}</span>
            <span className="text-right tabular">
              {p.usd_per_month != null
                ? <>{p.price_is_from ? "from " : ""}{usd(p.usd_per_month)}<span className="text-xs text-gray-500">/mo</span></>
                : <span className="text-xs text-gray-500">not collected</span>}
            </span>
            <span className={`col-span-2 text-xs sm:col-span-1 ${VERDICT[p.company_use].tone}`}>{VERDICT[p.company_use].label}</span>
            <span className="col-span-2 text-xs text-gray-500 sm:col-span-1">
              {p.breakEvenTasks != null && p.reference
                ? <>Beats the API above <b className="text-gray-300">{p.breakEvenTasks.toLocaleString("en-US")}</b> tasks/mo of {p.reference.name} · </>
                : p.flat_rate && p.org && p.usd_per_month != null && perTask ? <>No {p.org} model in your view to compare · </> : null}
              {p.included}{p.billing_note ? ` · ${p.billing_note}` : ""}
            </span>
          </li>
        ))}
      </ul>
      {uncollected.length > 0 && <p className="mt-2 text-xs text-gray-500">Not collected: {uncollected.map((plan) => plan.name).join(", ")} — the vendor sites refuse automated reads.</p>}
    </details>
  );
}
