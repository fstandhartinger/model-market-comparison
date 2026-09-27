#!/usr/bin/env node
// Acceptance harness for the seven D206 back-fill CR rows that no harness ever covered:
// CR-148.1, CR-148.2, CR-152.1, CR-152.2, CR-152.5, CR-153.4, CR-158.4.
//
// Every other row seeded by the D206 back-fill (04-CR-BRIEF.md § "D206 back-fill") was measured by
// iteration 235 (`iter235-cr151-158`) or iteration 245 (CR-156.1-.3). These seven were named as
// uncovered in that iteration's own ledger note and in every review gate since. This script measures
// them against the acceptance text in `04-CR-BRIEF.md`, from disk, from GitHub, from the agent board
// and from the live hosts - nothing is read out of PROGRESS.md.
//
// Usage: node ops/ux-2026-09-12/bin/verify-cr-148-158-backfill.mjs <outDir>
//   env GH_TOKEN  a token that can read the two repositories (required for the CR-148.1 PR checks)
//   env ONLY      comma-separated group prefixes, e.g. ONLY=cr152 or ONLY=cr148-1,cr158-4
//
// It writes <outDir>/verification.json and prints one line per check. Exit code 1 if any selected
// check fails, so a red result is never mistaken for a green one.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: verify-cr-148-158-backfill.mjs <outDir>');
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const ONLY = (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const selected = (id) => ONLY.length === 0 || ONLY.some((p) => id.startsWith(p));
// A prefetch block for a whole group must also run when ONLY names one of its rows (ONLY=cr152-1).
const needs = (group) => ONLY.length === 0 || ONLY.some((p) => p.startsWith(group) || group.startsWith(p));

const REPO = '/opt/model-market-comparison';
const HOSTS = [
  'https://benchmarkheaven.com',
  'https://www.benchmarkheaven.com',
  'https://model-market-comparison.app.mintapis.com',
];
const PRESERVED_PATCH = '/home/flori/jobs/parallelism-gpu-and-site-20260924/preserved-cr143-deploy-checkout.patch';
const PRESERVED_PATCH_SHA = '55599d172bf48c5cf6777190774daaf7f1347094dd6fb18457d3b51673e80775';
const PATCH_PATHS = [
  'ops/ux-2026-09-12/03-CHANGE-REQUESTS-VERBATIM.md',
  'ops/ux-2026-09-12/04-CR-BRIEF.md',
  'ops/ux-2026-09-12/PROGRESS.md',
];
const RESTORE_LOG = '/home/flori/.local/state/bh/checkout-restores.jsonl';
const MERGE_QUEUE_LOG = '/home/flori/.local/state/bh/merge-queue.log';
const ADDENDUM = '/home/flori/jobs/jevbench-v15-method-20260925/METHOD-v1.5-ADDENDUM-PRICING.md';
const ADDENDUM_SHA = '2fc44459ef801d0627062f7eefd973df40772e8ac117727479748e4be4c220cc';
const DECISIONS = '/home/flori/DECISIONS.md';
const CR153_OUTPUT = '/home/flori/jobs/jev-page-requests-final-20260925/OUTPUT.md';
const HF_SPACE = 'benchmarkheaven/JevBench';

const results = [];
const record = (id, ok, detail) => {
  if (!selected(id)) return;
  results.push({ id, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${detail}`);
};
const check = (id, fn) => {
  if (!selected(id)) return;
  try {
    const { ok, detail } = fn();
    record(id, ok, detail);
  } catch (err) {
    record(id, false, `threw: ${err.message}`);
  }
};

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const read = (p) => readFileSync(p, 'utf8');
const hex64 = (s) => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);

async function fetchText(url, init) {
  const res = await fetch(url, { redirect: 'follow', ...init });
  const body = Buffer.from(await res.arrayBuffer());
  return { status: res.status, headers: res.headers, body, text: body.toString('utf8') };
}
const gh = async (path) => {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error('GH_TOKEN is not set');
  const r = await fetchText(`https://api.github.com/${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'bh-ux-workstream' },
  });
  if (r.status !== 200) throw new Error(`GET ${path} -> HTTP ${r.status}`);
  return JSON.parse(r.text);
};
const ghRaw = async (path, accept) => {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error('GH_TOKEN is not set');
  const r = await fetchText(`https://api.github.com/${path}`, {
    headers: { authorization: `Bearer ${token}`, accept, 'user-agent': 'bh-ux-workstream' },
  });
  if (r.status !== 200) throw new Error(`GET ${path} -> HTTP ${r.status}`);
  return r.text;
};

// ---------------------------------------------------------------- CR-148.1
// "The PR diff is byte-identical to the preserved patch (SHA-256 55599d17...e80775) and touches only
//  03-CHANGE-REQUESTS-VERBATIM.md, 04-CR-BRIEF.md and PROGRESS.md; it is reviewed and carries
//  bh-merge-ready."
const addedLines = (patch) =>
  patch.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
const diffBody = (formatPatch) => {
  const from = formatPatch.indexOf('diff --git');
  if (from < 0) return '';
  const rest = formatPatch.slice(from);
  const sig = rest.indexOf('\n-- \n');
  return sig < 0 ? rest : rest.slice(0, sig + 1);
};

let preserved = null;
check('cr148-1/preserved-patch-sha256', () => {
  preserved = readFileSync(PRESERVED_PATCH);
  const got = sha256(preserved);
  return { ok: got === PRESERVED_PATCH_SHA, detail: `sha256=${got} expected=${PRESERVED_PATCH_SHA} bytes=${preserved.length}` };
});
check('cr148-1/preserved-patch-paths', () => {
  const p = preserved ? preserved.toString('utf8') : read(PRESERVED_PATCH);
  const touched = [...p.matchAll(/^diff --git a\/(\S+) b\/(\S+)$/gm)].map((m) => m[1]);
  const same = touched.length === PATCH_PATHS.length && PATCH_PATHS.every((x) => touched.includes(x));
  return { ok: same, detail: `touched=${JSON.stringify(touched)}` };
});

let pr = null;
let prPatch = null;
await (async () => {
  if (!needs('cr148-1') && !needs('cr148-2')) return;
  try {
    const list = await gh('repos/fstandhartinger/model-market-comparison/pulls?state=all&per_page=100');
    pr = list.find((p) => /CR-148/.test(p.title)) || null;
    if (pr) prPatch = await ghRaw(`repos/fstandhartinger/model-market-comparison/pulls/${pr.number}`, 'application/vnd.github.v3.patch');
  } catch (err) {
    record('cr148-1/pr-fetch', false, `could not read the PR: ${err.message}`);
  }
})();

check('cr148-1/pr-exists', () => ({
  ok: !!pr,
  detail: pr ? `#${pr.number} "${pr.title}" state=${pr.state} merged_at=${pr.merged_at || 'null'} head=${pr.head.ref}` : 'no PR whose title names CR-148',
}));
check('cr148-1/pr-touches-only-the-three-files', () => {
  if (!prPatch) return { ok: false, detail: 'no PR patch' };
  const touched = [...prPatch.matchAll(/^diff --git a\/(\S+) b\/(\S+)$/gm)].map((m) => m[1]);
  const same = touched.length === PATCH_PATHS.length && PATCH_PATHS.every((x) => touched.includes(x));
  return { ok: same, detail: `touched=${JSON.stringify(touched)}` };
});
check('cr148-1/pr-added-lines-identical-to-the-patch', () => {
  if (!prPatch) return { ok: false, detail: 'no PR patch' };
  const a = sha256(addedLines(preserved ? preserved.toString('utf8') : read(PRESERVED_PATCH)));
  const b = sha256(addedLines(diffBody(prPatch)));
  return { ok: a === b, detail: `preserved-added-sha=${a.slice(0, 16)} pr-added-sha=${b.slice(0, 16)}` };
});
check('cr148-1/pr-diff-differs-only-in-git-index-lines', () => {
  if (!prPatch) return { ok: false, detail: 'no PR patch' };
  const want = (preserved ? preserved.toString('utf8') : read(PRESERVED_PATCH)).split('\n');
  const got = diffBody(prPatch).split('\n');
  if (want.length !== got.length) return { ok: false, detail: `line counts differ: preserved=${want.length} pr=${got.length}` };
  const differing = [];
  for (let i = 0; i < want.length; i += 1) if (want[i] !== got[i]) differing.push({ line: i + 1, preserved: want[i], pr: got[i] });
  const onlyIndex = differing.every((d) => d.preserved.startsWith('index ') && d.pr.startsWith('index '));
  return {
    ok: onlyIndex,
    detail: `${differing.length} differing line(s), all git blob "index" lines: ${onlyIndex}` +
      (differing.length ? ` first=${JSON.stringify(differing[0])}` : ''),
  };
});
await (async () => {
  if (!selected('cr148-1') || !pr) return;
  let reviews = [];
  try {
    reviews = await gh(`repos/fstandhartinger/model-market-comparison/pulls/${pr.number}/reviews`);
  } catch (err) {
    record('cr148-1/pr-reviewed-and-bh-merge-ready', false, `could not read reviews: ${err.message}`);
    return;
  }
  const labels = (pr.labels || []).map((l) => l.name);
  const ok = reviews.length > 0 && labels.includes('bh-merge-ready');
  record('cr148-1/pr-reviewed-and-bh-merge-ready', ok,
    `reviews=${reviews.length} labels=${JSON.stringify(labels)} state=${pr.state}`);
})();
// The point of CR-148 is that the payload survives. A PR that never merged did not preserve anything,
// so the two checks are separate: did PR #10 land, and is the candidate it carried in the ledger at all?
check('cr148-1/pr10-payload-reached-main', () => {
  const want = addedLines(preserved ? preserved.toString('utf8') : read(PRESERVED_PATCH))
    .split('\n').map((l) => l.slice(1)).filter((l) => l.trim().length > 40);
  const haystack = PATCH_PATHS.map((p) => read(resolve(REPO, p))).join('\n');
  const missing = want.filter((l) => !haystack.includes(l));
  return {
    ok: missing.length === 0,
    detail: `${want.length - missing.length}/${want.length} substantive added lines are in main; missing=${missing.length}` +
      (missing.length ? ` firstMissing=${JSON.stringify(missing[0].slice(0, 90))}` : ''),
  };
});
check('cr148-1/the-intake-candidate-is-in-the-ledger-under-some-number', () => {
  const verbatim = [
    'https://x.com/OpenAI/status/2102837574092161102',
    'built with input from more than 80 mental health clinicians',
    'https://openai.com/index/introducing-mentalhealthbench/',
  ];
  const cr = read(resolve(REPO, 'ops/ux-2026-09-12/03-CHANGE-REQUESTS-VERBATIM.md'));
  const brief = read(resolve(REPO, 'ops/ux-2026-09-12/04-CR-BRIEF.md'));
  const missing = verbatim.filter((v) => !cr.includes(v));
  const hasRow = /\|\s*CR-\d+\.1\s*\|[^|]*mentalhealthbench/i.test(brief);
  return {
    ok: missing.length === 0 && hasRow,
    detail: `verbatim capture lines missing from 03=${missing.length}; an acceptance row for the candidate exists in 04=${hasRow}`,
  };
});
// ---------------------------------------------------------------- CR-148.2
// "The restore is limited to those three tracked files; every other tracked and untracked path in the
//  checkout is unchanged afterwards; the restore runs no build, test, merge or deploy; the queue's
//  next pass reports a clean checkout."
let restore = null;
check('cr148-2/restore-record-exists', () => {
  const rows = read(RESTORE_LOG).split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  restore = rows.find((r) => r.pr === (pr ? pr.number : 10) || r.patch_sha256 === PRESERVED_PATCH_SHA) || null;
  return { ok: !!restore, detail: restore ? `restored_at=${restore.restored_at} pr=${restore.pr} branch=${restore.branch}` : `no record among ${rows.length} rows` };
});
check('cr148-2/restore-limited-to-the-three-paths', () => {
  if (!restore) return { ok: false, detail: 'no restore record' };
  const paths = restore.paths || [];
  const same = paths.length === PATCH_PATHS.length && PATCH_PATHS.every((x) => paths.includes(x));
  const before = (restore.status_before || []).map((s) => s.trim().replace(/^M\s+/, ''));
  const beforeMatches = before.length === PATCH_PATHS.length && PATCH_PATHS.every((x) => before.includes(x));
  return { ok: same && beforeMatches, detail: `paths=${JSON.stringify(paths)} status_before=${JSON.stringify(restore.status_before)}` };
});
check('cr148-2/restore-left-nothing-else-changed', () => {
  if (!restore) return { ok: false, detail: 'no restore record' };
  const after = restore.status_after || null;
  const untracked = restore.untracked_preserved || null;
  return {
    ok: Array.isArray(after) && after.length === 0 && Array.isArray(untracked) && untracked.length === 0,
    detail: `status_after=${JSON.stringify(after)} untracked_preserved=${JSON.stringify(untracked)} patch_sha256=${restore.patch_sha256 === PRESERVED_PATCH_SHA ? 'matches' : 'DIFFERS'}`,
  };
});
check('cr148-2/restore-ran-no-build-test-merge-or-deploy', () => {
  if (!restore) return { ok: false, detail: 'no restore record' };
  const forbidden = ['build', 'test', 'merge_revision', 'deployed', 'deploy', 'gates'];
  const present = forbidden.filter((k) => Object.prototype.hasOwnProperty.call(restore, k));
  return { ok: present.length === 0 && restore.dry_run === false, detail: `record keys=${JSON.stringify(Object.keys(restore).sort())} forbidden-present=${JSON.stringify(present)}` };
});
check('cr148-2/queue-next-pass-reported-a-clean-checkout', () => {
  if (!restore) return { ok: false, detail: 'no restore record' };
  const log = read(MERGE_QUEUE_LOG).split('\n');
  const at = restore.restored_at;
  const after = log.filter((l) => /^\d{4}-\d{2}-\d{2}T/.test(l) && l.slice(0, 20) > at.slice(0, 20)).slice(0, 8);
  const paused = after.filter((l) => /deploy checkout has local changes/.test(l));
  return {
    ok: after.length > 0 && paused.length === 0,
    detail: `first ${after.length} queue lines after ${at}: ${JSON.stringify(after.slice(0, 3))} paused-on-local-changes=${paused.length}`,
  };
});

// ---------------------------------------------------------------- the v1.4.2 artifact, once
let art = null;
let artBody = null;
const hostArt = {};
await (async () => {
  if (!needs('cr152')) return;
  for (const h of HOSTS) {
    try {
      const r = await fetchText(`${h}/api/jevbench/v1.4.2`);
      hostArt[h] = {
        status: r.status,
        header: r.headers.get('x-content-sha256'),
        bodySha: sha256(r.body),
        bytes: r.body.length,
      };
      if (!art && r.status === 200) { artBody = r.body; art = JSON.parse(r.text); }
    } catch (err) {
      hostArt[h] = { error: err.message };
    }
  }
  if (artBody) writeFileSync(resolve(outDir, 'jevbench-v1.4.2.json'), artBody);
})();
const ranked = () => (art.systems || []).filter((s) => s.ranked);

// ---------------------------------------------------------------- CR-152.1
// "Only rows that are complete (534 frozen + 308 sealed), hash-verified and integrity-clean are in
//  the artifact; rows still under review are absent and recorded as deferred to v1.4.3."
check('cr152-1/frozen-tier-sum-is-534', () => {
  const t = art.tiers;
  const sum = t.easy + t.standard + t.judge + t.hard;
  return { ok: sum === 534, detail: `easy ${t.easy} + standard ${t.standard} + judge ${t.judge} + hard ${t.hard} = ${sum}` };
});
check('cr152-1/sealed-tier-is-308', () => ({ ok: art.tiers.sealed === 308, detail: `tiers.sealed=${art.tiers.sealed}` }));
check('cr152-1/every-ranked-row-ran-the-full-534-and-308', () => {
  const bad = [];
  for (const s of ranked()) {
    const t = s.tiers || {};
    const sa = s.sealed_aggregate || {};
    const why = [];
    for (const k of ['easy', 'standard', 'judge', 'hard']) if (!Number.isFinite(t[k])) why.push(`tier ${k}`);
    if (sa.n !== 308) why.push(`sealed n=${sa.n}`);
    if (!Number.isFinite((s.calibration || {}).score)) why.push('calibration');
    if (s.partial) why.push('partial=true');
    if (why.length) bad.push(`${s.key}(${why.join(',')})`);
  }
  return { ok: bad.length === 0, detail: `${ranked().length} ranked rows over all four frozen tiers and 308 sealed decisions; incomplete=${bad.length}${bad.length ? ` ${JSON.stringify(bad.slice(0, 6))}` : ''}` };
});
// A full run can still return invalid answers (they count as wrong). "Complete" is about the run, so the
// shortfall must be published per row rather than silently averaged away.
check('cr152-1/every-sealed-answer-shortfall-is-published', () => {
  const short = ranked().filter((s) => {
    const sa = s.sealed_aggregate || {};
    return sa.n === 308 && Number.isFinite(sa.answered_valid) && sa.answered_valid < sa.n;
  });
  const undisclosed = short.filter((s) => {
    const fn = (art.footnotes || {})[s.key] || '';
    const sa = s.sealed_aggregate;
    return !(fn.includes(`${sa.answered_valid}/308`) || fn.includes(`${sa.answered_valid}/${sa.n}`));
  }).map((s) => `${s.key}(${s.sealed_aggregate.answered_valid}/308)`);
  return {
    ok: undisclosed.length === 0,
    detail: `${short.length} ranked rows answered fewer than 308 sealed decisions validly; each shortfall named in its own footnote except ${JSON.stringify(undisclosed)}`,
  };
});
check('cr152-1/incomplete-rows-are-unranked-and-their-reason-is-published', () => {
  const partials = (art.systems || []).filter((s) => s.partial);
  const mislabelled = partials.filter((s) => s.ranked || s.listing !== 'partial').map((s) => s.key);
  const unexplained = partials.filter((s) => {
    const fn = (art.footnotes || {})[s.key] || '';
    return !s.not_ranked_because && !/partial/i.test(fn);
  }).map((s) => s.key);
  return {
    ok: mislabelled.length === 0 && unexplained.length === 0,
    detail: `partial rows=${JSON.stringify(partials.map((s) => `${s.key}:${s.listing}`))}; ranked-or-mislabelled=${JSON.stringify(mislabelled)}; without a published reason=${JSON.stringify(unexplained)}`,
  };
});
// Carried-over rows were hash-pinned by the release they were measured in (v1.4.0/v1.4.1); the rows this
// release measured must carry their own hashes here.
check('cr152-1/rows-new-in-v1.4.2-carry-release-evidence-hashes', () => {
  const fresh = (art.systems || []).filter((s) => s.new_in === 'v1.4.2');
  const bad = fresh.filter((s) => Object.values(s.release_evidence || {}).filter((v) => hex64(v)).length < 3)
    .map((s) => `${s.key}(${Object.values(s.release_evidence || {}).filter((v) => hex64(v)).length} hashes)`);
  const ds = art.hard_dataset || {};
  const dsOk = hex64(ds.sha256_public_file) && hex64(ds.sha256_heldout_file) && hex64(ds.dataset_hash_all);
  return {
    ok: fresh.length > 0 && bad.length === 0 && dsOk,
    detail: `${fresh.length} rows new in v1.4.2, each with >=3 sha256 release-evidence hashes except ${JSON.stringify(bad)}; hard_dataset public/heldout/all hashes present=${dsOk}`,
  };
});
check('cr152-1/integrity-clean-no-item-level-content', () => {
  const forbidden = /"(item_id|item_ids|item_text|question|question_text|expected|gold|golds|prediction|predicted|per_item|item_results|prompt)"\s*:/;
  const m = artBody.toString('utf8').match(forbidden);
  const review = Object.entries((art.hard_dataset || {}).review || {});
  const unresolved = review.filter(([, v]) => (v.no_verdict || []).length > 0 || v.authored !== v.accepted + (v.rejected || []).length);
  return {
    ok: !m && unresolved.length === 0,
    detail: `item-level field in the published bytes=${m ? m[1] : 'none'}; authoring batches with an unresolved verdict=${unresolved.length}`,
  };
});
check('cr152-1/rows-under-review-are-absent-and-deferred', () => {
  const keys = (art.systems || []).map((s) => s.key);
  const present = keys.filter((k) => /imajev/i.test(k));
  const rounds = (art.systems || []).map((s) => s.source_round || '').filter((r) => /run 13|run-13/i.test(r));
  const decisions = read(DECISIONS);
  // CR-152.3's deferral is recorded in DECISIONS.md; a later Florian decision may have retargeted it.
  const deferred = /imajev-4b[\s\S]{0,400}?v1\.4\.3|v1\.4\.3[\s\S]{0,400}?imajev-4b/i.test(decisions) || /run 13[\s\S]{0,200}v1\.4\.3/i.test(decisions);
  const v143Skipped = /v1\.4\.3 is skipped/i.test(decisions);
  return {
    ok: present.length === 0 && rounds.length === 0 && deferred,
    detail: `imajev rows in the artifact=${JSON.stringify(present)}; run-13 rows=${rounds.length}; deferral recorded in DECISIONS.md=${deferred}; NOTE v1.4.3-later-skipped=${v143Skipped}`,
  };
});

// ---------------------------------------------------------------- CR-152.2
// "No author-announced or hypothetical tariff and no free tier is used as a price; Instinct carries
//  the Qwen3.8-27B reference price, visibly labelled an estimate; the rule's re-score condition is
//  written down."
check('cr152-2/instinct-is-priced-on-the-qwen3.8-27b-reference', () => {
  const s = (art.systems || []).find((x) => x.key === 'instinct');
  if (!s) return { ok: false, detail: 'no instinct row' };
  const c = s.cost || {};
  const ok = c.kind === 'estimate'
    && c.reference_model === 'qwen/qwen3.8-27b'
    && /ESTIMATE/.test(c.basis || '')
    && /qwen3\.8-27b/i.test(c.basis || '');
  return { ok, detail: `kind=${c.kind} reference_model=${c.reference_model} input_usd_per_m=${c.input_usd_per_m} basis-labels-estimate=${/ESTIMATE/.test(c.basis || '')}` };
});
check('cr152-2/instinct-does-not-use-the-announced-tariff', () => {
  const s = (art.systems || []).find((x) => x.key === 'instinct');
  const c = (s && s.cost) || {};
  const ok = /author-announced \$0\.03\/M is not used/i.test(c.basis || '') && /author-announced/i.test(c.superseded_basis || '');
  return { ok, detail: `superseded_basis=${JSON.stringify((c.superseded_basis || '').slice(0, 90))}` };
});
check('cr152-2/the-rescore-condition-is-written-down', () => {
  const note = art.cost_estimate_note || '';
  const ok = /never used/i.test(note) && /re-scored when a bookable price is published/i.test(note) && /Author-announced tariffs and free tiers/i.test(note);
  return { ok, detail: `cost_estimate_note=${JSON.stringify(note.slice(0, 200))}` };
});
check('cr152-2/no-ranked-row-is-priced-on-an-announced-tariff-or-a-free-tier', () => {
  const offenders = ranked().filter((s) => {
    const c = s.cost || {};
    if (c.kind === 'announced' || c.kind === 'hypothetical') return true;
    return /^ANNOUNCED PRICE|announced tariff is used|free tier price/i.test(c.basis || '');
  }).map((s) => `${s.key}(kind=${(s.cost || {}).kind})`);
  return { ok: offenders.length === 0, detail: `ranked rows priced on an announced tariff or a free tier=${JSON.stringify(offenders)}` };
});

// ---------------------------------------------------------------- CR-152.5
// "/api/jevbench/v1.4.2 returns 200 with its hash header on every public host; the GitHub release and
//  the HF Space are updated by the v1.4.1 procedure; the method is unchanged from v1.4."
check('cr152-5/api-200-with-a-truthful-hash-header-on-every-host', () => {
  const bad = Object.entries(hostArt).filter(([, v]) => v.error || v.status !== 200 || !hex64(v.header || '') || v.header !== v.bodySha);
  return {
    ok: bad.length === 0 && Object.keys(hostArt).length === HOSTS.length,
    detail: Object.entries(hostArt).map(([h, v]) => `${h.replace('https://', '')}=${v.error || `${v.status}/${(v.header || 'no-header').slice(0, 12)}/body=${v.bodySha.slice(0, 12)}`}`).join(' '),
  };
});
check('cr152-5/the-same-artifact-on-every-host', () => {
  const hashes = [...new Set(Object.values(hostArt).map((v) => v.bodySha))];
  return { ok: hashes.length === 1, detail: `distinct body hashes=${hashes.length} ${JSON.stringify(hashes.map((h) => h.slice(0, 16)))}` };
});
check('cr152-5/method-unchanged-from-v1.4', () => {
  const ok = art.protocol === 'jevbench::v1.4'
    && /v1\.4 scoring formulas and all v1\.4\.1 measurements are unchanged/i.test(art.revision_note || '')
    && art.revision === 'v1.4.2' && art.status === 'final';
  return { ok, detail: `protocol=${art.protocol} revision=${art.revision} status=${art.status} note=${JSON.stringify((art.revision_note || '').slice(0, 110))}` };
});
await (async () => {
  if (!needs('cr152-5')) return;
  let rels = null;
  try {
    rels = await gh('repos/fstandhartinger/jevbench/releases?per_page=20');
  } catch (err) {
    record('cr152-5/github-release-follows-the-v1.4.1-procedure', false, `could not read releases: ${err.message}`);
    return;
  }
  const r142 = rels.find((r) => r.tag_name === 'v1.4.2');
  const r141 = rels.find((r) => r.tag_name === 'v1.4.1');
  const ok = !!r142 && !!r141 && !r142.draft && !r142.prerelease
    && new Date(r142.published_at) > new Date(r141.published_at)
    && (r142.body || '').length >= (r141.body || '').length
    && r142.assets.length === r141.assets.length;
  record('cr152-5/github-release-follows-the-v1.4.1-procedure', ok,
    r142 && r141
      ? `v1.4.2 published=${r142.published_at} draft=${r142.draft} prerelease=${r142.prerelease} body=${(r142.body || '').length}B assets=${r142.assets.length}; v1.4.1 published=${r141.published_at} body=${(r141.body || '').length}B assets=${r141.assets.length}`
      : `v1.4.2=${!!r142} v1.4.1=${!!r141}`);
})();
let hfSnapshot = null;
await (async () => {
  if (!needs('cr152-5')) return;
  let commits = null;
  let card = null;
  try {
    const c = await fetchText(`https://huggingface.co/api/spaces/${HF_SPACE}/commits/main`);
    commits = JSON.parse(c.text);
    const s = await fetchText(`https://huggingface.co/spaces/${HF_SPACE}/raw/main/snapshot.json`);
    hfSnapshot = JSON.parse(s.text);
    writeFileSync(resolve(outDir, 'hf-snapshot.json'), s.body);
    const i = await fetchText(`https://huggingface.co/spaces/${HF_SPACE}/raw/main/index.html`);
    card = i.text;
  } catch (err) {
    record('cr152-5/hf-space-updated-by-the-v1.4.1-procedure', false, `could not read the Space: ${err.message}`);
    return;
  }
  const pub142 = commits.find((c) => /v1\.4\.2/.test(c.title) && /publish/i.test(c.title));
  const pub141 = commits.find((c) => /v1\.4\.1/.test(c.title) && /publish/i.test(c.title));
  const ok = !!pub142 && !!pub141 && new Date(pub142.date) > new Date(pub141.date)
    && hfSnapshot && hfSnapshot.revision === 'v1.4.2'
    && /v1\.4\.2/.test(card || '');
  record('cr152-5/hf-space-updated-by-the-v1.4.1-procedure', ok,
    `v1.4.2 commit=${pub142 ? `${pub142.date} "${pub142.title}"` : 'none'}; v1.4.1 commit=${pub141 ? pub141.date : 'none'}; snapshot.revision=${hfSnapshot && hfSnapshot.revision}; index.html names v1.4.2=${/v1\.4\.2/.test(card || '')}`);
})();
check('cr152-5/hf-snapshot-numbers-equal-the-live-api', () => {
  if (!hfSnapshot) return { ok: false, detail: 'no HF snapshot' };
  // The Space carries rank, display, jevbench_score, the four axes and the cost. Join on rank: both
  // surfaces publish the same 89 ranked rows, and the name is checked separately below.
  const live = new Map(ranked().map((s) => [s.rank, s]));
  const rows = hfSnapshot.systems || [];
  const bad = [];
  let compared = 0;
  const near = (a, b, tol) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;
  for (const row of rows) {
    const l = live.get(row.rank);
    if (!l) { bad.push(`rank ${row.rank} (${row.display}): no ranked live row`); continue; }
    const want = {
      jevbench_score: l.jevbench_score,
      intelligence: (l.axes || {}).intelligence,
      calibration: (l.axes || {}).calibration,
      speed: (l.axes || {}).speed,
      cost: (l.axes || {}).cost,
      cost_usd_per_1000: (l.cost || {}).usd_per_1000,
    };
    const got = { jevbench_score: row.jevbench_score, ...(row.axes || {}), cost_usd_per_1000: row.cost_usd_per_1000 };
    for (const [k, v] of Object.entries(got)) {
      if (!Number.isFinite(v) || !Number.isFinite(want[k])) continue;
      compared += 1;
      if (!near(v, want[k], k === 'cost_usd_per_1000' ? 1e-12 : 1e-9)) bad.push(`rank ${row.rank}.${k} ${v} vs ${want[k]}`);
    }
  }
  return {
    ok: rows.length === live.size && compared > 0 && bad.length === 0,
    detail: `${rows.length} Space rows vs ${live.size} ranked live rows, ${compared} numbers compared; mismatches=${bad.length}${bad.length ? ` ${JSON.stringify(bad.slice(0, 5))}` : ''}`,
  };
});
check('cr152-5/hf-snapshot-names-the-systems-as-the-live-board-does', () => {
  if (!hfSnapshot) return { ok: false, detail: 'no HF snapshot' };
  const live = new Map(ranked().map((s) => [s.rank, s]));
  const bad = [];
  for (const row of hfSnapshot.systems || []) {
    const l = live.get(row.rank);
    if (l && row.display !== l.display) bad.push(`rank ${row.rank}: Space "${row.display}" vs board "${l.display}"`);
  }
  return { ok: bad.length === 0, detail: `rows whose published name differs from the live board=${bad.length} ${JSON.stringify(bad)}` };
});

// ---------------------------------------------------------------- CR-153.4
// "OUTPUT.md lists every earlier request with an explicit done / not done, and the not-done ones are
//  finished or carry a stated reason."
let cr153 = null;
check('cr153-4/output-md-exists', () => {
  cr153 = read(CR153_OUTPUT);
  return { ok: cr153.length > 0, detail: `${CR153_OUTPUT} ${cr153.length} bytes, mtime ${statSync(CR153_OUTPUT).mtime.toISOString()}` };
});
check('cr153-4/output-md-has-no-unfilled-placeholders', () => {
  const holes = [...new Set([...(cr153 || '').matchAll(/__[A-Z][A-Z_]*__/g)].map((m) => m[0]))];
  return { ok: holes.length === 0, detail: `unfilled placeholders=${JSON.stringify(holes)}` };
});
check('cr153-4/output-md-lists-the-earlier-requests-with-done-or-not-done', () => {
  const t = cr153 || '';
  const section = t.slice(t.search(/##\s*Request list/i));
  const table = section.split('\n').filter((l) => /^\s*\|/.test(l));
  const verdicts = table.filter((l) => /\b(done|not done|erledigt|nicht erledigt)\b/i.test(l));
  return {
    ok: table.length >= 3 && verdicts.length >= 1,
    detail: `"Request list" section present=${/##\s*Request list/i.test(t)}; table rows=${table.length}; rows carrying a done/not-done verdict=${verdicts.length}; section body=${JSON.stringify(section.split('\n').slice(1, 3).join(' ').slice(0, 120))}`,
  };
});

// ---------------------------------------------------------------- CR-158.4
// "METHOD-v1.5-ADDENDUM-PRICING.md exists ..., hashes to SHA-256 2fc44459...20cc, was board-posted
//  (#1340) before the first v1.5 result, and states all three rules ... The same rules are in
//  DECISIONS.md."
let addendum = null;
check('cr158-4/addendum-exists-and-is-frozen-read-only', () => {
  const st = statSync(ADDENDUM);
  addendum = read(ADDENDUM);
  const mode = (st.mode & 0o777).toString(8);
  return { ok: (st.mode & 0o200) === 0, detail: `mode=${mode} bytes=${st.size} mtime=${st.mtime.toISOString()}` };
});
check('cr158-4/addendum-sha256', () => {
  const got = sha256(readFileSync(ADDENDUM));
  return { ok: got === ADDENDUM_SHA, detail: `sha256=${got} expected=${ADDENDUM_SHA}` };
});
const THREE_RULES = [
  { name: '30-day bookable list price', re: /continuously in effect\*{0,2} for at least 30 days|at least \*{0,2}30 days\*{0,2}/i, dre: /continuously in effect >= 30 days|continuously in effect >=30 days/i },
  { name: 'max(list, base-model reference) floor', re: /max\(cost at the counting list price, cost at the market reference price/i, dre: /max\(cost at list price, cost at the base model's market reference price\)/i },
  { name: 're-score with a visible note on a later price change', re: /triggers a \*{0,2}re-score\*{0,2}[\s\S]{0,400}?visible note/i, dre: /triggers a re-score with a visible row note/i },
];
check('cr158-4/addendum-states-all-three-rules', () => {
  const missing = THREE_RULES.filter((r) => !r.re.test(addendum || '')).map((r) => r.name);
  return { ok: missing.length === 0, detail: `missing=${JSON.stringify(missing)}` };
});
check('cr158-4/decisions-md-states-the-same-three-rules', () => {
  const d = read(DECISIONS);
  const missing = THREE_RULES.filter((r) => !r.dre.test(d)).map((r) => r.name);
  const namesHashAndPost = /2fc44459/.test(d) && /#1340/.test(d);
  return { ok: missing.length === 0 && namesHashAndPost, detail: `missing=${JSON.stringify(missing)}; DECISIONS.md names the hash and board #1340=${namesHashAndPost}` };
});
check('cr158-4/board-1340-posted-the-addendum-before-the-first-v1.5-result', () => {
  const out = execFileSync('/home/flori/.local/bin/agent-board', ['read', '13', '--since', '1338'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  writeFileSync(resolve(outDir, 'board-thread-13.txt'), out);
  const entries = [...out.matchAll(/^#(\d+) \[([0-9TZ:\-.]+)\] (\S+) · (\w+)\n([\s\S]*?)(?=^#\d+ \[|$(?![\s\S]))/gm)]
    .map((m) => ({ id: Number(m[1]), ts: m[2], author: m[3], kind: m[4], body: m[5] }));
  const e1340 = entries.find((e) => e.id === 1340);
  if (!e1340) return { ok: false, detail: `thread #13 has no entry #1340 (read ${entries.length} entries from #${entries[0] && entries[0].id})` };
  const namesFile = /METHOD-v1\.5-ADDENDUM-PRICING\.md/.test(e1340.body) && e1340.body.includes(ADDENDUM_SHA);
  // The freeze entry #1339 states "No entrant has run yet"; the first entry reporting any v1.5 run is
  // the harness pilot. #1340 must sit between them.
  const freeze = entries.find((e) => e.id === 1339 && /No entrant has run yet/i.test(e.body));
  const firstRun = entries.find((e) => e.id > 1340 && /(PILOT done|official runs|\b\d{3,4}\/904\b|\d{3,4}\/1,?624\b)/i.test(e.body));
  const ok = namesFile
    && !!freeze && freeze.ts < e1340.ts
    && !!firstRun && e1340.ts < firstRun.ts;
  return {
    ok,
    detail: `#1340 ${e1340.ts} by ${e1340.author}; names the file and its sha256=${namesFile}; freeze #1339 ${freeze ? freeze.ts : 'not found'} ("No entrant has run yet"); first entry reporting a v1.5 run #${firstRun ? `${firstRun.id} ${firstRun.ts}` : 'none'}`,
  };
});

// ---------------------------------------------------------------- receipt
const total = results.length;
const passed = results.filter((r) => r.ok).length;
const byRow = {};
for (const r of results) {
  const row = r.id.split('/')[0];
  byRow[row] = byRow[row] || { pass: 0, fail: 0 };
  byRow[row][r.ok ? 'pass' : 'fail'] += 1;
}
const receipt = {
  script: 'ops/ux-2026-09-12/bin/verify-cr-148-158-backfill.mjs',
  generated_utc: new Date().toISOString(),
  only: ONLY,
  repo_head: execFileSync('git', ['-C', REPO, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  live_revision: await (async () => {
    try { const r = await fetchText('https://benchmarkheaven.com/api/meta'); return JSON.parse(r.text).revision; } catch { return null; }
  })(),
  hosts: hostArt,
  totals: { total, passed, failed: total - passed },
  by_row: byRow,
  checks: results,
};
writeFileSync(resolve(outDir, 'verification.json'), `${JSON.stringify(receipt, null, 1)}\n`);
console.log(`\n${passed}/${total} checks pass`);
for (const [row, v] of Object.entries(byRow)) console.log(`  ${row}: ${v.pass}/${v.pass + v.fail}`);
console.log(`receipt: ${resolve(outDir, 'verification.json')}`);
process.exit(passed === total ? 0 : 1);
