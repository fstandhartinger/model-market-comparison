'use client';

import { useMemo, useState } from 'react';

type Benchmark = 'jevbench' | 'imagejevbench';
type Tier = 'api_or_small_open' | 'large_open_gpu';
type Visibility = 'public' | 'private';

const price: Record<Tier, number> = { api_or_small_open: 49, large_open_gpu: 99 };

export function RequestPriorityEvaluationForm({ testMode }: { testMode: boolean }) {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [pricingTier, setPricingTier] = useState<Tier | ''>('');
  const [visibility, setVisibility] = useState<Visibility | ''>('');
  const [accessType, setAccessType] = useState<'open_weights' | 'api_endpoint' | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const total = useMemo(() => pricingTier ? price[pricingTier] * benchmarks.length : 0, [pricingTier, benchmarks]);

  function toggleBenchmark(name: Benchmark) {
    setBenchmarks((current) => current.includes(name) ? current.filter((x) => x !== name) : [...current, name]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const submission = {
      submissionId: crypto.randomUUID(),
      email: form.get('email'),
      modelName: form.get('modelName'),
      modelLink: form.get('modelLink'),
      codeLink: form.get('codeLink'),
      accessType,
      accessInstructions: form.get('accessInstructions'),
      notes: form.get('notes'),
      pricingTier,
      benchmarks,
      visibility,
      termsAccepted: form.get('termsAccepted') === 'on',
      website: form.get('website'),
    };
    try {
      const response = await fetch('/api/priority-evaluation/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submission),
      });
      const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !result.url || !result.url.startsWith('https://checkout.stripe.com/')) {
        setError(result.error || 'Checkout could not be started. Please try again.');
        setBusy(false);
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError('Network error. Please try again.');
      setBusy(false);
    }
  }

  const field = 'mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-inherit';
  const choice = 'flex gap-3 rounded-lg border border-line bg-surface/60 p-3';

  return <form className="space-y-7" onSubmit={submit}>
    {testMode && <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm" role="status"><b>TEST MODE.</b> This preview uses Stripe test payments; no real charge will be made.</div>}

    <fieldset>
      <legend className="font-semibold">Benchmarks</legend>
      <p className="bh-muted mt-1 text-sm">Choose one or both. The listed fee applies to each benchmark.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className={choice}>
          <input className="mt-1 accent-current" type="checkbox" checked={benchmarks.includes('jevbench')} onChange={() => toggleBenchmark('jevbench')} />
          <span><b>JevBench</b><span className="bh-muted block text-xs">Text-based Jev-class decisions</span></span>
        </label>
        <label className={choice}>
          <input className="mt-1 accent-current" type="checkbox" checked={benchmarks.includes('imagejevbench')} onChange={() => toggleBenchmark('imagejevbench')} />
          <span><b>ImageJevBench</b><span className="bh-muted block text-xs">Image-based decision tasks</span></span>
        </label>
      </div>
    </fieldset>

    <fieldset>
      <legend className="font-semibold">Model and price tier</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className={choice}>
          <input className="mt-1 accent-current" type="radio" name="pricingTier" required checked={pricingTier === 'api_or_small_open'} onChange={() => setPricingTier('api_or_small_open')} />
          <span><b>$49 per benchmark</b><span className="bh-muted block text-xs">API-served or open model up to about 9B parameters</span></span>
        </label>
        <label className={choice}>
          <input className="mt-1 accent-current" type="radio" name="pricingTier" required checked={pricingTier === 'large_open_gpu'} onChange={() => setPricingTier('large_open_gpu')} />
          <span><b>$99 per benchmark</b><span className="bh-muted block text-xs">Larger open model that we run on our GPUs</span></span>
        </label>
      </div>
      <p className="bh-muted mt-2 text-xs">Applicable taxes are calculated at checkout. {benchmarks.length > 1 && pricingTier && <>Your selected total is <b>${total}</b> before tax.</>}</p>
    </fieldset>

    <fieldset>
      <legend className="font-semibold">Result visibility</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className={choice}><input className="mt-1 accent-current" type="radio" name="visibility" required checked={visibility === 'public'} onChange={() => setVisibility('public')} /><span><b>Public leaderboard entry</b><span className="bh-muted block text-xs">A public run is marked “priority run”.</span></span></label>
        <label className={choice}><input className="mt-1 accent-current" type="radio" name="visibility" required checked={visibility === 'private'} onChange={() => setVisibility('private')} /><span><b>Private report</b><span className="bh-muted block text-xs">We send your team the report and do not publish it without your consent.</span></span></label>
      </div>
    </fieldset>

    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-medium">Email address<input className={field} name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <label className="block text-sm font-medium">Model name<input className={field} name="modelName" maxLength={120} required /></label>
      <label className="block text-sm font-medium">Model link (Hugging Face)<input className={field} name="modelLink" type="url" placeholder="https://huggingface.co/…" /></label>
      <label className="block text-sm font-medium">Code link (GitHub)<input className={field} name="codeLink" type="url" placeholder="https://github.com/…" /></label>
    </div>

    <fieldset>
      <legend className="font-semibold">How can we access it?</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className={choice}><input className="mt-1 accent-current" type="radio" name="accessType" required checked={accessType === 'open_weights'} onChange={() => setAccessType('open_weights')} /><span><b>Open weights</b><span className="bh-muted block text-xs">We will run the submitted model.</span></span></label>
        <label className={choice}><input className="mt-1 accent-current" type="radio" name="accessType" required checked={accessType === 'api_endpoint'} onChange={() => setAccessType('api_endpoint')} /><span><b>API endpoint</b><span className="bh-muted block text-xs">Provide an endpoint URL; do not paste an API key.</span></span></label>
      </div>
      <label className="mt-4 block text-sm font-medium">Access instructions<textarea className={field} name="accessInstructions" rows={3} maxLength={800} required placeholder="Public weights or endpoint URL, model identifier, and any setup notes. No secrets." /></label>
    </fieldset>

    <label className="block text-sm font-medium">Notes (optional)<textarea className={field} name="notes" rows={3} maxLength={1200} placeholder="Anything we should know about this model or request? Do not include API keys, passwords, or tokens." /></label>

    <div className="sr-only" aria-hidden="true"><label>Leave this field blank<input name="website" tabIndex={-1} autoComplete="off" /></label></div>

    <div className="rounded-lg border border-line bg-panel p-4">
      <p className="text-sm"><b>Encrypted access only.</b> Never enter API keys or tokens in this form. After review, send any required credential encrypted to our age recipient:</p>
      <code className="mt-2 block break-all rounded bg-surface p-2 text-xs">age1u34985kqdzp4x8mtp4jfxrzy2wlglz8t082r348tyjlhuklnq4zqhssc6s</code>
    </div>

    <label className="flex gap-3 text-sm"><input className="mt-1 accent-current" type="checkbox" name="termsAccepted" required /><span>I agree to the <a className="text-accent underline" href="/terms">priority evaluation terms</a> and have read the <a className="text-accent underline" href="/privacy">privacy policy</a>.</span></label>

    {error && <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm" role="alert">{error}</p>}
    <button className="bh-button bh-button-primary w-full justify-center font-semibold sm:w-auto" type="submit" disabled={busy || !benchmarks.length || !pricingTier || !visibility || !accessType}>
      {busy ? 'Opening secure checkout…' : total ? `Continue to secure checkout — $${total} before tax` : 'Choose a benchmark and price tier'}
    </button>
    <p className="bh-muted text-xs">Stripe Checkout handles payment. We review the evaluation request after payment succeeds.</p>
  </form>;
}
