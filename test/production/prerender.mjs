import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Run explicitly after npm run build (without DATABASE_URL). This tests the
// production artifact, not a source-code spelling of the cache policy.
const manifest = JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8'));
for (const route of ['/', '/about', '/charts', '/eu', '/gateways', '/provider-explorer', '/providers', '/scatter', '/benchmaxxing', '/radar', '/jev-models', '/jev-models/v1.4']) {
  test(`public page ${route} is rendered once at build time`, () => {
    assert.ok(manifest.routes[route], `${route} must not repeat catalog SSR per request`);
    assert.equal(manifest.routes[route].initialRevalidateSeconds, false);
  });
}

// 2026-09-16: `/benchmarks` is the one bundled-catalog page that is deliberately *not* prerendered.
// CR-2.5 requires a shared URL to reproduce the view, and CR-1.11 requires it without layout shift, so
// `bfd4974` made the page read `searchParams` on the server and seed the first render from them
// (measured CLS 0.20–0.36 → 0). Reading `searchParams` makes a Next 15 route dynamic by definition.
// The list above kept demanding a build-time render for it, so this file has been failing since that
// commit — unnoticed, because it runs only in the daily publication, which had not reached this step
// since 2026-09-14. The exception is recorded here rather than silently dropped: if the route ever
// becomes static again, this test fails and whoever did it must re-check the share URL and the CLS
// measurement before changing the assertion.
// CR-122 (2026-09-22): `/compare` left the list above for the same reason. A compare link is posted under a
// model-release announcement seconds after it appears, so its title, description and preview image must name
// the two models in the URL — including one that is not in the data yet. Reading `searchParams` on the server
// is what makes that possible and what makes the route dynamic. The heavy catalog data still arrives through
// `/api/page-data/compare`, so this does not reintroduce per-request catalog SSR.
test('/compare is server-rendered per request by design (CR-122 launch links name both models in the preview)', () => {
  assert.equal(manifest.routes['/compare'], undefined,
    '/compare must stay dynamic: its link preview is built from the shared URL on the server');
  assert.match(readFileSync('app/compare/page.tsx', 'utf8'), /generateMetadata[\s\S]*searchParams/,
    'the reason it is dynamic is that the preview tags are built from the URL on the server');
});

test('/benchmarks is server-rendered per request by design (CR-2.5 share URL, CR-1.11 no layout shift)', () => {
  assert.equal(manifest.routes['/benchmarks'], undefined,
    '/benchmarks must stay dynamic: it seeds its first render from the shared URL on the server');
  assert.match(readFileSync('app/benchmarks/page.tsx', 'utf8'), /searchParams/,
    'the reason it is dynamic is that the page reads the URL on the server');
});
