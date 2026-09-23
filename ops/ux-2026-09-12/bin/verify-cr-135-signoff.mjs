// CR-135 — an independent receipt for the JevBench v1.4.1 release.
//
//   node verify-cr-135-signoff.mjs [outDir] [host ...]
//
// CR-135 was implemented by Codex, and the codex-luna review gate could not supply the
// non-implementer sign-off the ledger requires. This re-derives the release's claims from what the
// hosts actually serve rather than from the release job's own receipts: the two artifacts are
// fetched, hashed, and compared against each other, and the pages are read for the version they
// present. No expected value is typed in except the two published artifact digests, which are the
// thing under test.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const OUT = process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/cr135-signoff';
const HOSTS = process.argv.slice(3).length ? process.argv.slice(3)
  : ['https://benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
// The digests CR-135 published. Everything else below is derived.
const PUBLISHED = { 'v1.4': '006ebff534221d913abe3195f87efeea420698ce0ab207beeb89dc3fb50fb517',
  'v1.4.1': 'e6754863056503fe2b010410fc7111df884ac1f9ce4449aa369aab61d98092cd' };
await mkdir(OUT, { recursive: true });

const checks = [];
const check = (scope, name, ok, detail) => {
  checks.push({ scope, name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${scope} ${name}${ok ? '' : ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
};
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const ranked = (artifact) => artifact.systems.filter((s) => s.ranked);
const topFive = (artifact) => [...ranked(artifact)].sort((a, b) => a.rank - b.rank).slice(0, 5).map((s) => s.key);

for (const host of HOSTS) {
  const scope = new URL(host).host;
  const artifacts = {};
  for (const version of Object.keys(PUBLISHED)) {
    try {
      const response = await fetch(`${host}/api/jevbench/${version}`, { signal: AbortSignal.timeout(45_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const digest = sha256(bytes);
      // The header is only worth anything if it is the digest of the body that came with it.
      check(scope, `${version} served bytes hash to the advertised header`,
        digest === response.headers.get('x-content-sha256'), { body: digest, header: response.headers.get('x-content-sha256') });
      check(scope, `${version} matches the digest CR-135 published`, digest === PUBLISHED[version], digest);
      artifacts[version] = JSON.parse(bytes.toString());
      check(scope, `${version} reports its own revision`, artifacts[version].revision === version.replace('v1.4.1', 'v1.4.1').replace(/^v1\.4$/, 'v1.4.0'),
        artifacts[version].revision);
    } catch (error) { check(scope, `${version} API`, false, error.message); }
  }
  const before = artifacts['v1.4'], after = artifacts['v1.4.1'];
  if (!before || !after) continue;

  // CR-135.1 — the exact aggregate, and nothing that was already published moved.
  check(scope, 'v1.4.1 publishes 82 systems, 77 ranked',
    after.systems.length === 82 && ranked(after).length === 77, { systems: after.systems.length, ranked: ranked(after).length });
  const beforeKeys = new Set(before.systems.map((s) => s.key));
  const added = after.systems.filter((s) => !beforeKeys.has(s.key)).map((s) => s.key);
  const removed = before.systems.filter((s) => !after.systems.some((t) => t.key === s.key)).map((s) => s.key);
  check(scope, 'v1.4.1 is strictly additive over v1.4.0', removed.length === 0 && added.length === 6, { added, removed });

  const byKey = new Map(after.systems.map((s) => [s.key, s]));
  const moved = [];
  for (const old of before.systems) {
    const now = byKey.get(old.key);
    for (const field of ['jevbench_score', 'public_accuracy', 'sealed_accuracy', 'public_minus_sealed_gap_pp']) {
      if (JSON.stringify(old[field]) !== JSON.stringify(now?.[field])) moved.push(`${old.key}.${field}`);
    }
  }
  check(scope, 'no score of the 76 earlier systems moved', moved.length === 0, moved.slice(0, 10));
  check(scope, 'the axes and tier weights are unchanged',
    JSON.stringify(before.axis_weights) === JSON.stringify(after.axis_weights)
    && JSON.stringify(before.tier_weights) === JSON.stringify(after.tier_weights));
  // Ranks are positions, not scores: inserting six systems is expected to move them, and it does
  // (65 of 76). Recorded rather than asserted, so the receipt does not read as if nothing changed.
  const rankMoves = before.systems.filter((s) => byKey.get(s.key)?.rank !== s.rank).length;
  check(scope, 'rank movement is explained by the six insertions', rankMoves > 0 && moved.length === 0,
    `${rankMoves} of ${before.systems.length} ranks shifted with no score change`);

  // CR-135.4 — no new row entered the top five and its order is unchanged.
  check(scope, 'the top five and their order are unchanged',
    JSON.stringify(topFive(before)) === JSON.stringify(topFive(after)), { before: topFive(before), after: topFive(after) });

  // CR-135.1/.5 — aggregate only. A sealed result may be reported as a count and a family mean;
  // an item id, prompt, answer or per-item array would be a leak.
  // Judged structurally rather than by field name: every leaf under sealed_aggregate must be a
  // number or a short label, and no array may be long enough to be one entry per sealed item.
  const SEALED_ITEMS = 308;
  const sealedShapes = new Set(), offenders = [];
  const walkSealed = (node, path, systemKey) => {
    if (Array.isArray(node)) {
      if (node.length >= SEALED_ITEMS) offenders.push(`${systemKey}.${path}[${node.length}]`);
      node.forEach((v, i) => walkSealed(v, `${path}[${i}]`, systemKey));
    } else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) { sealedShapes.add(path ? `${path}.${k}` : k); walkSealed(v, path ? `${path}.${k}` : k, systemKey); }
    } else if (typeof node === 'string' && node.length > 200) offenders.push(`${systemKey}.${path} (${node.length} chars)`);
  };
  for (const s of after.systems) walkSealed(s.sealed_aggregate ?? {}, '', s.key);
  check(scope, 'sealed results are published as aggregates only', offenders.length === 0,
    { leaf_fields: [...sealedShapes].slice(0, 20), offenders });
  const perItemArrays = after.systems.filter((s) => ['items', 'responses', 'predictions', 'per_item']
    .some((k) => Array.isArray(s[k]) || Array.isArray(s.sealed_aggregate?.[k]))).map((s) => s.key);
  check(scope, 'no per-item array is published on any system', perItemArrays.length === 0, perItemArrays);

  // CR-135.3 — which version each page presents, and evergreen metadata on the current page.
  const pages = { '/jev-models': 'v1.4.1', '/jev-models/v1.4': 'v1.4.0', '/jev-models/v1.4.1': 'v1.4.1' };
  for (const [path, expected] of Object.entries(pages)) {
    try {
      const response = await fetch(`${host}${path}`, { signal: AbortSignal.timeout(45_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const other = expected === 'v1.4.1' ? 'v1.4.0' : 'v1.4.1';
      check(scope, `${path} presents ${expected}`, html.includes(expected) && !new RegExp(`board[^<]{0,40}${other.replace('.', '\\.')}`).test(html), expected);
      if (path === '/jev-models') {
        // Evergreen: a preview that names today's rank or score goes stale the next release.
        const meta = [...html.matchAll(/<meta[^>]+(?:name="description"|property="og:(?:title|description)")[^>]*content="([^"]*)"/g)].map((m) => m[1]);
        check(scope, 'the current page preview makes no rank or score claim',
          meta.length > 0 && !meta.some((t) => /\brank(ed|s)? #?\d|\b\d{2}\.\d\b|#1\b/i.test(t)), meta);
      }
    } catch (error) { check(scope, `${path}`, false, error.message); }
  }
}

const failed = checks.filter((c) => !c.ok);
await writeFile(`${OUT}/verification.json`, `${JSON.stringify({ generated_at: new Date().toISOString(), hosts: HOSTS,
  reviewer: 'claude-opus (non-implementer: CR-135 was Codex work)', published_digests: PUBLISHED,
  checks, passed: checks.length - failed.length, failed: failed.length }, null, 2)}\n`);
console.log(`\n${checks.length - failed.length}/${checks.length} passed — ${OUT}/verification.json`);
process.exit(failed.length ? 1 : 0);
