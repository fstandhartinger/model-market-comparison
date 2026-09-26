#!/usr/bin/env node
// D218: print one digest line about the paid worker route's OpenRouter balance. Exit code 0 when healthy or
// unconfigured, 2 when the balance is gone or too thin to review tomorrow's sources — the failure that
// retained 27 benchmark sources on 2026-09-26 without naming a billing problem anywhere.
//
// Credentials: OPEN_ROUTER_API_KEY (or OPENROUTER_API_KEY) from the environment. The key is never printed.
//   node scripts/check-openrouter-credits.mjs [--json]
import { checkOpenRouterCredits } from '../lib/openrouter-credits.mjs';

const result = await checkOpenRouterCredits();
process.stdout.write(process.argv.includes('--json') ? `${JSON.stringify(result)}\n` : `${result.text}\n`);
process.exit(result.level === 'alert' ? 2 : 0);
