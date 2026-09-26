#!/usr/bin/env node
// CR-177.2 / CR-178.3: print one digest line about page-view and visitor tracking. Exit code 0 when healthy or
// unconfigured, 2 when page views are absent while events arrive, visitors are <= 1 despite page views, or Umami
// cannot be read.
//
// Credentials: UMAMI_BASE_URL / UMAMI_WEBSITE_ID / UMAMI_API_KEY from the environment, or from an env file
// (default /home/flori/.config/bh-analytics/daily-digest.env, mode 600, outside this repository).
//   node scripts/check-analytics-health.mjs [--days 1] [--env-file PATH] [--json]
import { readFile } from 'node:fs/promises';
import { checkAnalyticsHealth, CHECK_DAYS } from '../lib/analytics-health.mjs';

const DEFAULT_ENV_FILE = '/home/flori/.config/bh-analytics/daily-digest.env';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** KEY=value lines; quotes stripped, comments and blanks ignored. Values are never printed. */
export function parseEnvFile(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    out[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

const file = arg('env-file', DEFAULT_ENV_FILE);
const fromFile = await readFile(file, 'utf8').then(parseEnvFile).catch(() => ({}));
const env = { ...fromFile, ...process.env };
const result = await checkAnalyticsHealth({ env, days: Number(arg('days', CHECK_DAYS)) });
process.stdout.write(process.argv.includes('--json') ? `${JSON.stringify(result)}\n` : `${result.text}\n`);
process.exit(result.level === 'alert' ? 2 : 0);
