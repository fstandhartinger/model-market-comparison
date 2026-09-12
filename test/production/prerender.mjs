import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Run explicitly after npm run build (without DATABASE_URL). This tests the
// production artifact, not a source-code spelling of the cache policy.
const manifest = JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8'));
for (const route of ['/', '/about', '/charts', '/compare', '/eu', '/gateways', '/provider-explorer', '/providers', '/scatter', '/benchmarks', '/benchmaxxing', '/radar']) {
  test(`bundled catalog ${route} is rendered once at build time`, () => {
    assert.ok(manifest.routes[route], `${route} must not repeat catalog SSR per request`);
    assert.equal(manifest.routes[route].initialRevalidateSeconds, false);
  });
}
