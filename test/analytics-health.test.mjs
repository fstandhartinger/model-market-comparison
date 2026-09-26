import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsCheckConfigured, analyticsHealth, checkAnalyticsHealth, readAnalyticsCounts } from '../lib/analytics-health.mjs';

test('CR-177.2: a 0-page-view day with events is an alert that names the defect', () => {
  const alert = analyticsHealth({ pageviews: 0, visitors: 0, events: 4349 });
  assert.equal(alert.level, 'alert');
  assert.match(alert.text, /0 page views/);
  assert.match(alert.text, /4,349 banner events/);
  assert.match(alert.text, /CR-177\.1/);
});

test('CR-177.2: a day with page views is quiet, and silence on both counters is still an alert', () => {
  assert.equal(analyticsHealth({ pageviews: 1_204, visitors: 28, events: 37 }).level, 'ok');
  assert.match(analyticsHealth({ pageviews: 1_204, visitors: 28, events: 37 }).text, /1,204 page views, 28 visitors, 37 events over 24 h/);
  // Page views without events is normal: nobody has to press the banner.
  assert.equal(analyticsHealth({ pageviews: 12, visitors: 3, events: 0 }).level, 'ok');
  assert.equal(analyticsHealth({ pageviews: 0, visitors: 0, events: 0 }).level, 'alert');
  assert.equal(analyticsHealth({ pageviews: undefined, visitors: 3, events: 3 }).level, 'alert');
  assert.match(analyticsHealth({ pageviews: 0, visitors: 0, events: 4, days: 7 }).text, /over 7 d/);
});

test('CR-178.3: page views with at most one visitor is an alert, including the observed live counts', () => {
  const alert = analyticsHealth({ pageviews: 3_179, visitors: 1, events: 3_778 });
  assert.equal(alert.level, 'alert');
  assert.match(alert.text, /3,179 page views/);
  assert.match(alert.text, /1 visitor/);
  assert.match(alert.text, /3,778 events/);
  assert.match(alert.text, /CR-178/);
  assert.equal(analyticsHealth({ pageviews: 9, visitors: 2, events: 0 }).level, 'ok');
  assert.equal(analyticsHealth({ pageviews: 9, visitors: 0, events: 0 }).level, 'alert');
});

test('CR-177.2: the reader asks Umami for one day with Bearer auth and sums the event rows', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, json: async () => (url.includes('/stats') ? { pageviews: 9, visitors: 4 } : [{ x: 'fastlane_banner_view', y: 5 }, { x: 'fastlane_banner_click', y: 2 }]) };
  };
  const env = { UMAMI_BASE_URL: 'https://bh-analytics.app.mintapis.com/', UMAMI_WEBSITE_ID: 'site', UMAMI_API_KEY: 'umami_key' };
  const now = Date.UTC(2026, 8, 26, 12);
  const counts = await readAnalyticsCounts({ env, fetchImpl, now });
  assert.deepEqual(counts, { pageviews: 9, visitors: 4, events: 7, days: 1 });
  assert.equal(calls[0].init.headers.authorization, 'Bearer umami_key');
  assert.match(calls[0].url, /^https:\/\/bh-analytics\.app\.mintapis\.com\/api\/websites\/site\/stats\?startAt=/);
  assert.match(calls[0].url, new RegExp(`startAt=${now - 86_400_000}&endAt=${now}$`));
  assert.match(calls[1].url, /\/metrics\?.*&type=event$/);
  // An older Umami wrapped the number; both shapes must read.
  const wrapped = await readAnalyticsCounts({ env, now, fetchImpl: async (url) => ({ ok: true, json: async () => (url.includes('/stats') ? { pageviews: { value: 4 }, visitors: { value: 2 } } : []) }) });
  assert.equal(wrapped.pageviews, 4);
  assert.equal(wrapped.visitors, 2);
});

test('CR-177.2: the check is skipped without credentials and an unreadable Umami is an alert', async () => {
  assert.equal(analyticsCheckConfigured({}), false);
  assert.equal((await checkAnalyticsHealth({ env: {} })).level, 'skip');
  const env = { UMAMI_BASE_URL: 'https://example.invalid', UMAMI_WEBSITE_ID: 'site', UMAMI_API_KEY: 'k' };
  assert.equal(analyticsCheckConfigured(env), true);
  const failed = await checkAnalyticsHealth({ env, fetchImpl: async () => ({ ok: false, status: 401 }) });
  assert.equal(failed.level, 'alert');
  assert.match(failed.text, /HTTP 401/);
  // The 26 Sep 2026 state of the live instance: the defect this check exists for.
  const live = await checkAnalyticsHealth({
    env,
    fetchImpl: async (url) => ({ ok: true, json: async () => (url.includes('/stats') ? { pageviews: 0, visitors: 0 } : [{ x: 'fastlane_banner_view', y: 4349 }, { x: 'fastlane_banner_dismiss', y: 623 }, { x: 'fastlane_banner_click', y: 24 }]) }),
  });
  assert.equal(live.level, 'alert');
  assert.deepEqual(live.counts, { pageviews: 0, visitors: 0, events: 4996, days: 1 });
});
