'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BENCHMARK_LABELS, FOLLOWUP_BENCHMARKS, fastLaneSubset, followupValue, slowScheduleNotice,
  type FollowupBenchmark, type FollowupOption,
} from '../lib/submission-shared.mjs';

type Tier = 'api_or_small_open' | 'large_open_gpu';
type Visibility = 'public' | 'private';
type Done = { reference: string; queuePosition: number | null; fastLane?: boolean };

const BENCH_HELP: Record<FollowupBenchmark, string> = {
  jevbench: 'Text-based Jev-class decisions',
  imagejevbench: 'Image-based decision tasks',
  audiojevbench: 'Audio-based decision tasks',
};
const FAST_NOTE_AUDIO = 'AudioJevBench joins the regular queue; the fast lane covers JevBench and ImageJevBench';

export function ModelSubmissionForm({ followups, formToken, prices, testMode }: {
  followups: FollowupOption[]; formToken: string; prices: Record<Tier, number>; testMode: boolean;
}) {
  const [benchmarks, setBenchmarks] = useState<FollowupBenchmark[]>([]);
  const [followup, setFollowup] = useState('');
  const [fastLane, setFastLane] = useState(false);
  const [tier, setTier] = useState<Tier>('api_or_small_open');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [terms, setTerms] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [done, setDone] = useState<Done | null>(null);
  const [retryable, setRetryable] = useState(false);
  const idRef = useRef<string | null>(null);
  const fastBox = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => followups.find((o) => followupValue(o) === followup) ?? null, [followups, followup]);
  const notice = selected ? slowScheduleNotice(selected.rank) : null;
  const fastBenchmarks = fastLaneSubset(benchmarks);
  const audioTicked = benchmarks.includes('audiojevbench');
  const audioOnly = benchmarks.length > 0 && fastBenchmarks.length === 0;
  const fastActive = fastLane && !audioOnly;
  const cents = prices[tier];
  const total = cents * fastBenchmarks.length;
  const unit = cents;

  // When the heads-up appears, draw the eye to the fast lane box (not when the visitor prefers reduced motion).
  useEffect(() => {
    if (!notice || !fastBox.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    fastBox.current.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }, [notice]);

  function toggleBenchmark(name: FollowupBenchmark) {
    setBenchmarks((c) => c.includes(name) ? c.filter((x) => x !== name) : [...c, name]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setFieldError(''); setRetryable(false);
    const form = new FormData(event.currentTarget);
    idRef.current ??= crypto.randomUUID();
    const body = {
      submissionId: idRef.current,
      formToken,
      modelName: form.get('modelName'),
      githubUrl: form.get('githubUrl'),
      huggingfaceUrl: form.get('huggingfaceUrl'),
      apiUrl,
      apiKey,
      description: form.get('description'),
      email: form.get('email'),
      xHandle: form.get('xHandle'),
      benchmarks,
      followup,
      fastLane: fastActive,
      pricingTier: fastActive ? tier : undefined,
      visibility: fastActive ? visibility : undefined,
      termsAccepted: fastActive ? terms : undefined,
      website: form.get('website'),
    };
    // The key lives only in this request body; clear it from the page right away.
    setApiKey('');
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({})) as { ok?: boolean; url?: string; error?: string; field?: string; reference?: string; queuePosition?: number | null; fastLane?: boolean };
      if (response.ok && fastActive && result.url?.startsWith('https://checkout.stripe.com/')) {
        window.location.assign(result.url);
        return;
      }
      if (response.ok && result.ok) {
        setDone({ reference: result.reference ?? '', queuePosition: result.queuePosition ?? null, fastLane: result.fastLane });
        setBusy(false);
        return;
      }
      if (response.status === 409) idRef.current = null;
      setError((result.error || 'We could not send your submission. Please try again.') + (body.apiKey ? ' Re-enter your API key before sending again.' : ''));
      setFieldError(result.field ?? '');
      setRetryable(fastActive && response.status >= 500);
    } catch {
      setError('Network error. Please try again.' + (body.apiKey ? ' Re-enter your API key before sending again.' : ''));
      setRetryable(fastActive);
    }
    setBusy(false);
  }

  async function regularQueueInstead() {
    if (!idRef.current || busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/submissions/without-fast-lane', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId: idRef.current }),
      });
      const result = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; reference?: string; queuePosition?: number | null };
      if (response.ok && result.ok) { setDone({ reference: result.reference ?? '', queuePosition: result.queuePosition ?? null }); setBusy(false); return; }
      setError(result.error || 'Something went wrong. Please try again.');
    } catch { setError('Network error. Please try again.'); }
    setBusy(false);
  }

  if (done) {
    return <div className="rounded-xl border border-line bg-panel p-5" role="status" data-bh-submit-done>
      <h2 className="text-xl font-semibold">Thanks — your submission is in</h2>
      <p className="mt-3 text-sm">Reference: <b className="tabular-nums">{done.reference}</b>{done.queuePosition ? <> · Position in the regular queue: <b>#{done.queuePosition}</b></> : null}</p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
        <li>We&apos;ll email you a confirmation.</li>
        <li>We review the submission and evaluate it in the order received. We email you when results are published.</li>
        {done.fastLane && <li>This submission is in the fast lane: results within 48 hours of payment, or a full refund on request.</li>}
      </ul>
      <p className="mt-4 text-sm"><a className="text-accent underline" href="/submit">Submit another model</a> · <a className="text-accent underline" href="/jev-models">Back to JevBench</a></p>
    </div>;
  }

  const field = 'mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-inherit';
  const choice = 'flex gap-3 rounded-lg border border-line bg-surface/60 p-3';
  const bad = (name: string) => fieldError === name ? { 'aria-invalid': true as const } : {};

  return <form className="space-y-7" onSubmit={submit} noValidate={false}>
    {testMode && <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm" role="status"><b>TEST MODE.</b> The fast lane uses Stripe test payments; no real charge will be made.</div>}

    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-medium sm:col-span-2">Model name<input className={field} name="modelName" maxLength={120} required {...bad('modelName')} /></label>
      <label className="block text-sm font-medium">GitHub link<input className={field} name="githubUrl" type="url" maxLength={2048} placeholder="https://github.com/…" {...bad('githubUrl')} /></label>
      <label className="block text-sm font-medium">Hugging Face link<input className={field} name="huggingfaceUrl" type="url" maxLength={2048} placeholder="https://huggingface.co/…" {...bad('huggingfaceUrl')} /></label>
      <label className="block text-sm font-medium sm:col-span-2">API URL<input className={field} name="apiUrl" type="url" maxLength={2048} placeholder="https://api.example.com/v1" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} {...bad('apiUrl')} /></label>
      <p className="bh-muted -mt-2 text-xs sm:col-span-2">Add at least one of the three. An API URL must be a public https address.</p>
      <label className="block text-sm font-medium sm:col-span-2">API key (optional)
        <input className={field} name="apiKey" type="password" autoComplete="off" maxLength={4096} value={apiKey} onChange={(e) => setApiKey(e.target.value)} disabled={!apiUrl.trim()} spellCheck={false} {...bad('apiKey')} />
        <span className="bh-muted mt-1 block text-xs font-normal">Stored encrypted, never shown again, used only for this evaluation and deleted afterwards.{!apiUrl.trim() && ' Add an API URL to enable this field.'}</span>
      </label>
      <label className="block text-sm font-medium sm:col-span-2">Description / notes (optional)<textarea className={field} name="description" rows={4} maxLength={2000} placeholder="Anything we should know: model version, serving setup, rate limits, special prompts." {...bad('description')} /></label>
      <label className="block text-sm font-medium">Contact email<input className={field} name="email" type="email" autoComplete="email" maxLength={254} required {...bad('email')} /></label>
      <label className="block text-sm font-medium">X handle (optional)<input className={field} name="xHandle" maxLength={16} placeholder="@name" autoComplete="off" {...bad('xHandle')} /></label>
    </div>

    <fieldset>
      <legend className="font-semibold">Benchmarks</legend>
      <p className="bh-muted mt-1 text-sm">Choose at least one.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {FOLLOWUP_BENCHMARKS.map((b) => <label key={b} className={choice}>
          <input className="mt-1 accent-current" type="checkbox" checked={benchmarks.includes(b)} onChange={() => toggleBenchmark(b)} />
          <span><b>{BENCHMARK_LABELS[b]}</b><span className="bh-muted block text-xs">{BENCH_HELP[b]}</span></span>
        </label>)}
      </div>
    </fieldset>

    <div>
      <label className="block text-sm font-medium" htmlFor="submit-followup">Follow-up of a model already on the leaderboard?</label>
      <select id="submit-followup" className={field} value={followup} onChange={(e) => setFollowup(e.target.value)} {...bad('followup')}>
        <option value="">No, this is a new model</option>
        {FOLLOWUP_BENCHMARKS.map((b) => {
          const list = followups.filter((o) => o.benchmark === b);
          return list.length ? <optgroup key={b} label={BENCHMARK_LABELS[b]}>
            {list.map((o) => <option key={followupValue(o)} value={followupValue(o)}>#{o.rank} {o.name}</option>)}
          </optgroup> : null;
        })}
      </select>
      {notice && <p className="mt-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm" role="status" data-bh-slow-notice>{notice}</p>}
    </div>

    <div ref={fastBox} className={`rounded-xl border p-4 ${notice ? 'border-accent ring-2 ring-accent/60' : 'border-line'} bg-panel`} data-bh-fast-lane-box>
      <label className="flex gap-3 text-sm font-semibold">
        <input className="mt-1 accent-current" type="checkbox" checked={fastActive} disabled={audioOnly} onChange={(e) => setFastLane(e.target.checked)} />
        <span>Fast lane: results within 48 hours of payment, or a full refund on request</span>
      </label>
      {audioOnly && <p className="bh-muted mt-2 text-sm">{FAST_NOTE_AUDIO}.</p>}
      {fastActive && <div className="mt-4 space-y-4">
        {audioTicked && <p className="text-sm" role="status">{FAST_NOTE_AUDIO}. You are charged only for {fastBenchmarks.map((b) => BENCHMARK_LABELS[b]).join(' and ')}.</p>}
        <fieldset>
          <legend className="text-sm font-semibold">Model and price tier</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className={choice}><input className="mt-1 accent-current" type="radio" name="tier" checked={tier === 'api_or_small_open'} onChange={() => setTier('api_or_small_open')} /><span><b>${prices.api_or_small_open / 100} per benchmark</b><span className="bh-muted block text-xs">API-served or open model up to about 9B parameters</span></span></label>
            <label className={choice}><input className="mt-1 accent-current" type="radio" name="tier" checked={tier === 'large_open_gpu'} onChange={() => setTier('large_open_gpu')} /><span><b>${prices.large_open_gpu / 100} per benchmark</b><span className="bh-muted block text-xs">Larger open model that we run on our GPUs</span></span></label>
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold">Result visibility</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className={choice}><input className="mt-1 accent-current" type="radio" name="visibility" checked={visibility === 'public'} onChange={() => setVisibility('public')} /><span><b>Public leaderboard entry</b><span className="bh-muted block text-xs">A public run is marked “priority run”.</span></span></label>
            <label className={choice}><input className="mt-1 accent-current" type="radio" name="visibility" checked={visibility === 'private'} onChange={() => setVisibility('private')} /><span><b>Private report</b><span className="bh-muted block text-xs">We send you the report and do not publish it without your consent.</span></span></label>
          </div>
        </fieldset>
        <label className="flex gap-3 text-sm"><input className="mt-1 accent-current" type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} required /><span>I agree to the <a className="text-accent underline" href="/terms" target="_blank" rel="noopener">evaluation terms</a>.</span></label>
        <p className="text-sm" aria-live="polite" data-bh-fast-total>
          {fastBenchmarks.length ? <b>${unit / 100} × {fastBenchmarks.length} benchmark{fastBenchmarks.length === 1 ? '' : 's'} = ${total / 100} + applicable tax</b> : 'Choose JevBench or ImageJevBench to see the total.'}
        </p>
      </div>}
    </div>

    <div className="sr-only" aria-hidden="true"><label>Leave this field blank<input name="website" tabIndex={-1} autoComplete="off" /></label></div>

    {error && <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm" role="alert">
      <p>{error}</p>
      {retryable && <p className="mt-2"><button type="button" className="bh-button" onClick={regularQueueInstead} disabled={busy}>Send it to the regular queue without fast lane</button></p>}
    </div>}

    <button className="bh-button bh-button-primary w-full justify-center font-semibold sm:w-auto" type="submit" disabled={busy || !benchmarks.length || (fastActive && !terms)}>
      {busy ? 'Sending…' : fastActive && total ? `Pay $${total / 100} and send submission` : 'Send submission'}
    </button>
    <p className="bh-muted text-xs">{fastActive ? 'Stripe Checkout handles payment. ' : ''}We use your email only to confirm and to report back on this submission. <a className="text-accent underline" href="/privacy">Privacy</a>.</p>
  </form>;
}
