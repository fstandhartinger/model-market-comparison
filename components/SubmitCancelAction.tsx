'use client';

import { useState } from 'react';

export function SubmitCancelAction({ submissionId }: { submissionId: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [message, setMessage] = useState('');
  async function go() {
    setState('busy'); setMessage('');
    try {
      const r = await fetch('/api/submissions/without-fast-lane', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId }),
      });
      const result = await r.json().catch(() => ({})) as { ok?: boolean; error?: string; reference?: string; queuePosition?: number | null };
      if (r.ok && result.ok) {
        setState('done');
        setMessage(`Done — your submission is in the regular queue. Reference ${result.reference}${result.queuePosition ? `, position #${result.queuePosition}` : ''}. We'll email you a confirmation.`);
        return;
      }
      setMessage(result.error || 'Something went wrong. Please try again.');
    } catch { setMessage('Network error. Please try again.'); }
    setState('idle');
  }
  return <div>
    {state !== 'done' && <button type="button" className="bh-button bh-button-primary" onClick={go} disabled={state === 'busy'}>Send it to the regular queue without fast lane</button>}
    {message && <p className="mt-3 text-sm" role={state === 'done' ? 'status' : 'alert'}>{message}</p>}
  </div>;
}
