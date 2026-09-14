"use client";

import { useEffect } from "react";

/** F-47 (Fable pass 6): a route-level error boundary. Without it a client-side exception
 *  replaces the whole page with Next's unbranded "Application error" text (observed once on
 *  the model page during the pass-6 capture). The nav and footer stay; the reader gets one
 *  sentence and a retry. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <section className="bh-panel mx-auto my-12 max-w-lg p-6 text-center" role="alert">
      <h1 className="text-xl font-semibold">This page hit an error while loading.</h1>
      <p className="bh-muted mt-2 text-sm">Nothing is lost — the data is unchanged. Reloading usually fixes it.</p>
      <div className="mt-4 flex justify-center gap-3">
        <button type="button" onClick={reset} className="bh-button border-accent bg-accent text-white hover:bg-accent/90">Try again</button>
        <a href="/" className="bh-button">Back to the overview</a>
      </div>
      {error.digest && <p className="mt-3 text-[11px] text-gray-500">Reference {error.digest}</p>}
      {/* F-66 (Fable pass 11): client errors carry no digest, so the panel names the error itself. */}
      <details className="mt-3 text-left text-[11px] text-gray-500"><summary className="!min-h-0 cursor-pointer !py-0.5 text-center">Details</summary><p className="mt-1 max-w-full break-words font-mono">{error.name || 'Error'}: {error.message || 'no message'}</p></details>
    </section>
  );
}
