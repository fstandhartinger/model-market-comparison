"use client";
import { useEffect, useMemo, useState } from "react";
import type { ClientData, ClientModel } from "../lib/client-model";
import { useSettings } from "./SettingsContext";
import { ModelExplorer } from "./ModelExplorer";
import { modelPrice, createOfferScope, type PriceSettings } from "../lib/cost";

/** R5.6 — the guided alternative to the filter bar: one question per page, each mapped to
 *  a filter that already exists, so the questionnaire is a different way into the same
 *  model, never a second opinion about the data.
 *
 *  Page order follows Florian's: company → privacy and region → minimum capability →
 *  budget → results. Every page can be skipped; skipping means "no requirement", never a
 *  silently applied default. */

type Answer = "yes" | "no" | null;

const MONTHS = [1, 2, 3, 4, 5, 6];

/** "At least the level of the best models that existed N months ago."
 *
 *  Computed from release dates and today's scores: the best index any model released on or
 *  before the cut-off reaches now. Deliberately NOT read off a historical snapshot — an
 *  index that has been re-based since would make the old number and the current one
 *  incomparable, and using today's measurement of a model that existed then answers the
 *  question ("as good as what was available in March") without that trap. */
function frontierAt(models: ClientModel[], monthsAgo: number, key: "aa_intelligence_index" | "aa_coding_index") {
  const cut = new Date();
  cut.setMonth(cut.getMonth() - monthsAgo);
  let best: { value: number; model: ClientModel } | null = null;
  for (const m of models) {
    if (!m.release_date || new Date(m.release_date) > cut) continue;
    const v = m.scores[key];
    if (v == null) continue;
    if (!best || v > best.value) best = { value: v, model: m };
  }
  return best;
}

function Page({ step, total, title, lead, children, onBack, onNext, nextLabel, skip }: {
  step: number; total: number; title: string; lead: string; children: React.ReactNode;
  onBack?: () => void; onNext: () => void; nextLabel?: string; skip?: () => void;
}) {
  return (
    <div className="card p-5 sm:p-7">
      <div className="mb-5 flex items-center gap-2" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i < step ? "bg-accent" : "bg-line"}`} />
        ))}
      </div>
      <p className="bh-eyebrow">Step {step} of {total}</p>
      <h2 className="mt-1 text-xl font-semibold sm:text-2xl">{title}</h2>
      <p className="bh-muted mt-1 max-w-2xl text-sm">{lead}</p>
      <div className="mt-5">{children}</div>
      <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line/60 pt-4">
        {onBack && <button type="button" onClick={onBack} className="rounded-md border border-line px-3 py-2 text-sm text-gray-400 hover:text-gray-200">← Back</button>}
        <button type="button" onClick={onNext} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink">{nextLabel ?? "Continue →"}</button>
        {skip && <button type="button" onClick={skip} className="text-sm text-gray-500 underline-offset-4 hover:underline">Skip — no preference</button>}
      </div>
    </div>
  );
}

function Choice({ label, hint, on, onClick }: { label: string; hint?: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left ${on ? "border-accent bg-accent/10" : "border-line hover:border-control-border"}`}>
      <span className={`block text-sm font-medium ${on ? "text-accent" : "text-gray-200"}`}>{on ? "✓ " : ""}{label}</span>
      {hint && <span className="bh-muted mt-0.5 block text-xs">{hint}</span>}
    </button>
  );
}

export function Wizard({ data, onFinish }: { data: ClientData; onFinish: () => void }) {
  const s = useSettings();
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState<Answer>(null);
  const [intelMonths, setIntelMonths] = useState<number | null>(null);
  const [codingMonths, setCodingMonths] = useState<number | null>(null);

  // The questionnaire never asks about the Composite, so it must not inherit Simple mode's
  // ≥ 85 default — that would quietly filter the result by a criterion the user was not
  // asked about. Capability is asked on step 3 and applied there instead.
  const { setMinScore } = s;
  useEffect(() => { setMinScore(0); }, [setMinScore]);

  const priceSettings = useMemo<PriceSettings>(() => ({ priceMode: s.priceMode, inputWeight: s.inputWeight }), [s.priceMode, s.inputWeight]);
  const scope = useMemo(() => createOfferScope(s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly, !s.allowDataTraining),
    [s.excludedSet, s.excludeChinese, data.providers, s.euHostedOnly, s.nonUsOnly, s.teeOnly, s.allowDataTraining]);

  /** Budget page: real quartiles of what a task costs today, so the choices are anchored in
   *  the catalogue instead of in round numbers we made up. */
  const costTiers = useMemo(() => {
    const values = data.models
      .filter((m) => m.featured)
      .map((m) => modelPrice(m, data, scope, priceSettings).value)
      .filter((v): v is number => v != null && v > 0)
      .sort((a, b) => a - b);
    if (values.length < 4) return null;
    const at = (q: number) => values[Math.min(values.length - 1, Math.round((values.length - 1) * q))];
    return { p25: at(0.25), p50: at(0.5), p75: at(0.75), max: values[values.length - 1] };
  }, [data, scope, priceSettings]);

  const money = (v: number) => (v >= 10 ? `$${v.toFixed(0)}` : v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(3)}`);

  const intelFrontier = intelMonths ? frontierAt(data.models, intelMonths, "aa_intelligence_index") : null;
  const codingFrontier = codingMonths ? frontierAt(data.models, codingMonths, "aa_coding_index") : null;

  const applyCapability = () => {
    s.setMinIntelligence(intelFrontier ? Math.round(intelFrontier.value * 10) / 10 : null);
    s.setMinCoding(codingFrontier ? Math.round(codingFrontier.value * 10) / 10 : null);
  };

  const restart = () => {
    setCompany(null); setIntelMonths(null); setCodingMonths(null);
    s.setIsCompany(false); s.setExcludeChinese(false); s.setEuHostedOnly(false); s.setNonUsOnly(false);
    s.setTeeOnly(false); s.setAllowDataTraining(false);
    s.setMinIntelligence(null); s.setMinCoding(null); s.setMaxCost(null); s.setMinScore(0);
    setStep(1);
  };

  if (step === 1) return (
    <Page step={1} total={5} title="Are you buying for a company?" onNext={() => setStep(2)}
      lead="It changes which plans are open to you. Consumer subscriptions — ChatGPT Plus/Pro, Claude Pro/Max and the like — are sold to individuals; a company normally needs a business plan or API access."
      skip={() => { setCompany(null); s.setIsCompany(false); setStep(2); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Choice label="Yes, for a company or team" on={company === "yes"} hint="Consumer subscriptions are set aside"
          onClick={() => { setCompany("yes"); s.setIsCompany(true); }} />
        <Choice label="No, for myself" on={company === "no"} hint="Every plan stays in scope"
          onClick={() => { setCompany("no"); s.setIsCompany(false); }} />
      </div>
      <p className="mt-4 text-xs text-gray-500">
        Today this site prices API and platform routes only, so the answer is recorded and will
        filter subscription plans as soon as they are part of the cost view — we would rather say
        that than imply a filter that is not there yet.
      </p>
    </Page>
  );

  if (step === 2) return (
    <Page step={2} total={5} title="Does your data need to stay somewhere specific?" onBack={() => setStep(1)} onNext={() => setStep(3)}
      lead="Each answer removes provider routes from every figure on the site — the prices you then see are the prices of the routes you are allowed to use."
      skip={() => { s.setExcludeChinese(false); s.setEuHostedOnly(false); s.setNonUsOnly(false); s.setTeeOnly(false); setStep(3); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Choice label="EU-hosted only" on={s.euHostedOnly} hint="Only routes served from the EU" onClick={() => s.setEuHostedOnly(!s.euHostedOnly)} />
        <Choice label="Non-US providers only" on={s.nonUsOnly} hint="Excludes providers whose company is US-based" onClick={() => s.setNonUsOnly(!s.nonUsOnly)} />
        <Choice label="No Chinese providers" on={s.excludeChinese} hint="Excludes the providers, not the models they serve" onClick={() => s.setExcludeChinese(!s.excludeChinese)} />
        <Choice label="Strong confidential guarantees" on={s.teeOnly} hint="Only routes inside a trusted execution environment" onClick={() => s.setTeeOnly(!s.teeOnly)} />
      </div>
      <p className="mt-4 text-xs text-gray-500">
        Providers that train on or retain your prompts are already excluded by default, on every
        page. You can let them back in under Filters &amp; settings → Data confidentiality.
      </p>
    </Page>
  );

  if (step === 3) return (
    <Page step={3} total={5} title="How capable does the model have to be?" onBack={() => setStep(2)}
      onNext={() => { applyCapability(); setStep(4); }}
      lead="Rather than asking for a number on a scale nobody has a feel for, pick a point in time: “at least as good as the best model I could have used back then”."
      skip={() => { setIntelMonths(null); setCodingMonths(null); s.setMinIntelligence(null); s.setMinCoding(null); setStep(4); }}>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gray-200">General intelligence</p>
          <p className="bh-muted mt-0.5 text-xs">AA Intelligence Index</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" aria-pressed={intelMonths === null} onClick={() => setIntelMonths(null)}
              className={`rounded-md border px-3 py-1.5 text-sm ${intelMonths === null ? "border-accent bg-accent/10 text-accent" : "border-line text-gray-400"}`}>No floor</button>
            {MONTHS.map((m) => (
              <button key={m} type="button" aria-pressed={intelMonths === m} onClick={() => setIntelMonths(m)}
                className={`rounded-md border px-3 py-1.5 text-sm ${intelMonths === m ? "border-accent bg-accent/10 text-accent" : "border-line text-gray-400"}`}>
                {m} mo
              </button>
            ))}
          </div>
          <p className="mt-2 min-h-[2.5rem] text-xs text-gray-500">
            {intelFrontier
              ? <>The best model available {intelMonths} month{intelMonths === 1 ? "" : "s"} ago was <b className="text-gray-300">{intelFrontier.model.family_name}</b> at {intelFrontier.value.toFixed(1)} — that becomes the floor.</>
              : "No minimum: every scored model stays in the running."}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-200">Coding</p>
          <p className="bh-muted mt-0.5 text-xs">AA Coding Index</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" aria-pressed={codingMonths === null} onClick={() => setCodingMonths(null)}
              className={`rounded-md border px-3 py-1.5 text-sm ${codingMonths === null ? "border-accent bg-accent/10 text-accent" : "border-line text-gray-400"}`}>No floor</button>
            {MONTHS.map((m) => (
              <button key={m} type="button" aria-pressed={codingMonths === m} onClick={() => setCodingMonths(m)}
                className={`rounded-md border px-3 py-1.5 text-sm ${codingMonths === m ? "border-accent bg-accent/10 text-accent" : "border-line text-gray-400"}`}>
                {m} mo
              </button>
            ))}
          </div>
          <p className="mt-2 min-h-[2.5rem] text-xs text-gray-500">
            {codingFrontier
              ? <>The best coder available {codingMonths} month{codingMonths === 1 ? "" : "s"} ago was <b className="text-gray-300">{codingFrontier.model.family_name}</b> at {codingFrontier.value.toFixed(1)} — that becomes the floor.</>
              : "No minimum on coding."}
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-500">
        The floor is the score that model reaches <i>today</i>, on today&apos;s index version. We do
        not compare an old published number with a fresh one, because the indices are re-based
        from time to time and the two would not mean the same thing.
      </p>
    </Page>
  );

  if (step === 4) return (
    <Page step={4} total={5} title="What may one task cost?" onBack={() => setStep(3)} onNext={() => setStep(5)} nextLabel="See the models →"
      lead="Adjusted cost per task: the provider we would route you to, its prices and caching, and how many tokens this model needs to finish the job."
      skip={() => { s.setMaxCost(null); setStep(5); }}>
      {costTiers ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Choice label={`Up to ${money(costTiers.p25)}`} hint="The cheaper quarter of the shortlist" on={s.maxCost === costTiers.p25} onClick={() => s.setMaxCost(costTiers.p25)} />
          <Choice label={`Up to ${money(costTiers.p50)}`} hint="Around the middle of the field" on={s.maxCost === costTiers.p50} onClick={() => s.setMaxCost(costTiers.p50)} />
          <Choice label={`Up to ${money(costTiers.p75)}`} hint="Most of the shortlist stays in" on={s.maxCost === costTiers.p75} onClick={() => s.setMaxCost(costTiers.p75)} />
          <Choice label="No limit yet" hint="Decide after seeing the prices" on={s.maxCost === null} onClick={() => s.setMaxCost(null)} />
        </div>
      ) : <p className="bh-muted text-sm">Not enough priced models in the current scope to suggest a budget — continue without a limit.</p>}
      {costTiers && (
        <p className="mt-4 text-xs text-gray-500">
          For scale: the most expensive model in the shortlist costs {money(costTiers.max)} per task,
          {" "}{(costTiers.max / costTiers.p50).toFixed(0)}× the middle of the field. You can move the
          limit freely on the next page.
        </p>
      )}
    </Page>
  );

  return (
    <div>
      <div className="card mb-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="bh-eyebrow">Your answers</p>
            <h2 className="mt-1 text-lg font-semibold">Models that fit</h2>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(4)} className="rounded-md border border-line px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200">← Change answers</button>
            <button type="button" onClick={restart} className="rounded-md border border-line px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200">Start over</button>
            <button type="button" onClick={onFinish} className="rounded-md border border-line px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200">Open in Advanced</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <Chip on={company === "yes"}>{company === "yes" ? "Buying for a company" : company === "no" ? "Buying for myself" : "Company: no answer"}</Chip>
          {s.euHostedOnly && <Chip on>EU-hosted only</Chip>}
          {s.nonUsOnly && <Chip on>Non-US providers</Chip>}
          {s.excludeChinese && <Chip on>No Chinese providers</Chip>}
          {s.teeOnly && <Chip on>Confidential compute</Chip>}
          <Chip on={s.minIntelligence != null}>{s.minIntelligence != null ? `Intelligence ≥ ${s.minIntelligence}` : "No intelligence floor"}</Chip>
          <Chip on={s.minCoding != null}>{s.minCoding != null ? `Coding ≥ ${s.minCoding}` : "No coding floor"}</Chip>
          <Chip on={s.maxCost != null}>{s.maxCost != null ? `≤ ${money(s.maxCost)} per task` : "No budget limit"}</Chip>
        </div>
      </div>
      <ModelExplorer data={data} simple limit={15} defaultSort="cost" defaultAsc={false} />
    </div>
  );
}

function Chip({ children, on }: { children: React.ReactNode; on?: boolean }) {
  return <span className={`rounded-full border px-2.5 py-1 ${on ? "border-accent/50 bg-accent/10 text-accent" : "border-line text-gray-500"}`}>{children}</span>;
}
