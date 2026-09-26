import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { publicOrigin, PUBLIC_HOSTS } from '../lib/account-sync.mjs';

const route = readFileSync(new URL('../app/api/fastlane-banner-event/route.ts', import.meta.url), 'utf8');

test('CR-168.1/CR-174: banner events use the shared allowlist for all public hosts', () => {
  for (const host of PUBLIC_HOSTS) {
    assert.equal(publicOrigin(new Headers({ 'x-forwarded-host': host })), `https://${host}`);
  }
  assert.equal(publicOrigin(new Headers({ 'x-forwarded-host': 'attacker.example' })), null);
  assert.match(route, /const origin = publicOrigin\(request\.headers\)/,
    'the event route must use the shared ingress-origin guard');
  assert.doesNotMatch(route, /const HOSTS = new Set\(/,
    'the event route must not keep a narrower duplicate host allowlist');
});
