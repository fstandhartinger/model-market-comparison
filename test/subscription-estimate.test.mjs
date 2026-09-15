import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { estimablePlans, subscriptionEstimate, subscriptionView } from '../lib/subscriptions.mjs';

test('CR-16.3: effective cost per task = (monthly fee + extra usage) ÷ completed tasks; unusable inputs give no number', () => {
  assert.equal(subscriptionEstimate({ usdPerMonth: 100, tasksPerMonth: 400 }), 0.25);
  assert.equal(subscriptionEstimate({ usdPerMonth: 100, extraUsd: 20, tasksPerMonth: 400 }), 0.3);
  for (const bad of [{ usdPerMonth: 100, tasksPerMonth: 0 }, { usdPerMonth: 100, tasksPerMonth: NaN }, { usdPerMonth: null, tasksPerMonth: 10 }, { usdPerMonth: 100, extraUsd: -5, tasksPerMonth: 10 }]) {
    assert.equal(subscriptionEstimate(bad), null);
  }
});

test('CR-16.3: only flat-rate single-vendor plans with a collected price are estimable (no Copilot credits, no uncollected prices)', async () => {
  const catalog = JSON.parse(await readFile(new URL('../data/raw/subscriptions.json', import.meta.url), 'utf8'));
  const ids = estimablePlans(subscriptionView(catalog, { isCompany: false }).plans).map((p) => p.id);
  assert.ok(ids.includes('anthropic-claude-max') && ids.includes('google-ai-pro'));
  assert.ok(!ids.some((id) => id.startsWith('github-') || id.startsWith('cursor-')), 'credit-metered and multi-vendor tools are not per-task estimable');
  assert.ok(!ids.includes('openai-chatgpt-plus-pro'), 'an uncollected price is never estimated');
});
