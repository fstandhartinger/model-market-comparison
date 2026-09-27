// F-209 / D225 (2026-09-27, design authority pass 38): a source change quarantines its own arm,
// never the day.
//
// The fence D223 built is right — a board that publishes a protocol revision outside the registry's
// reviewed set must not be published under the reviewed identity. Its blast radius was wrong. On
// 2026-09-27 VulcanBench added five rows at `code-quality-maintenance-v3.15`; the repo-level
// continuity test read that capture, went red, and because the publish gate runs the whole suite
// *no* source published — while the daily's own per-arm machinery (`source-health.json`, the
// receipt's stale-source line) exists precisely to fail one arm soft and let the rest through.
//
// So the fence moves into the collector, which already raises on a changed header, task count,
// harness or effort: an unreviewed revision ends that arm `source_changed_retained`, the capture is
// retained (and replayable by path with `replay-protocol-review.mjs`), the previously published rows
// stay untouched, and every other arm collects, tests and publishes. The repo-level continuity test
// then reads the newest capture the collector *accepted*, so a quarantined capture is evidence for
// that arm's repair and never a gate for the suite.
//
// The reviewed set is not a constant here and never a parser rule: it is read out of the registry's
// own `how_to_collect.version_guard`, which is the text the daily's protocol review puts in front of
// a critic (`protocolReviewRow`). A revision enters the fence only by being reviewed into that
// sentence.

/** Marker a collector puts on the one error that means "quarantine this arm", followed by JSON. */
export const QUARANTINE_MARK = 'SOURCE_PROTOCOL_UNREVIEWED';
const QUARANTINE_LINE = new RegExp(`${QUARANTINE_MARK} (\\{[^\\n]*?\\}) — ([^\\n]*)`);

/**
 * The closed protocol allow-list a version guard states, e.g.
 * "… a protocol in exactly {code-quality-maintenance-v3.4, code-quality-maintenance-v3.15}".
 * `null` when the guard states no such list — a board without a protocol column is untouched.
 */
export function reviewedProtocols(versionGuard) {
  const stated = /protocol in exactly \{([^}]+)\}/.exec(String(versionGuard ?? ''));
  if (!stated) return null;
  const listed = stated[1].split(',').map((item) => item.trim()).filter(Boolean);
  return listed.length ? [...new Set(listed)].sort() : null;
}

/**
 * The quarantine an arm's failure declares, or `null` for any other failure. The message may be a
 * whole subprocess transcript (the collector runs in python), so the marker is matched anywhere in
 * it and the payload is one line by construction.
 */
export function parseQuarantine(error) {
  const found = QUARANTINE_LINE.exec(error?.message ?? String(error ?? ''));
  if (!found) return null;
  let payload;
  try { payload = JSON.parse(found[1]); } catch { return null; }
  const list = (value) => (Array.isArray(value) ? value.filter((x) => typeof x === 'string') : []);
  if (typeof payload.entry !== 'string' || !list(payload.unreviewed).length) return null;
  return { entry: payload.entry, unreviewed: list(payload.unreviewed).sort(),
    reviewed: list(payload.reviewed).sort(), reason: found[2].trim() };
}

/** The check a quarantined arm writes into `checks.json`: `attention` in source-health, not `failing`. */
export function quarantineCheck(quarantine, { rows = null } = {}) {
  return { id: quarantine.entry, status: 'source_changed_retained', reason: quarantine.reason,
    unreviewed_protocols: quarantine.unreviewed, reviewed_protocols: quarantine.reviewed,
    ...(rows == null ? {} : { rows }) };
}

// ------------------------------------------------------------------ accepted captures
// A capture is *accepted* when the arm that owns it published from it or confirmed it unchanged.
// A quarantined arm records the captures no accepted arm used in `quarantine.json` beside the
// manifest, so the record travels with the evidence directory it describes.

/** Every capture key a quarantine record in one evidence directory withholds. */
export function withheldKeys(record) {
  const keys = new Set();
  for (const arm of record?.arms ?? []) for (const key of arm.captures ?? []) keys.add(key);
  return keys;
}

/**
 * The 200 captures under an evidence root that the collector accepted, oldest first, each tagged
 * with its directory. Quarantined captures are returned separately so a reader can say *why* a
 * newer capture was not used instead of silently reading an older one.
 * `readJson(path)` resolves to the parsed file or `null` when it does not exist.
 */
export async function acceptedCaptures({ dirs, readJson }) {
  const accepted = [], withheld = [];
  for (const dir of [...dirs].sort()) {
    const manifest = await readJson(`${dir}/manifest.json`);
    if (!Array.isArray(manifest)) continue;
    const quarantined = withheldKeys(await readJson(`${dir}/quarantine.json`));
    for (const receipt of manifest) {
      if (receipt?.status !== 200 || !receipt.url || !receipt.file) continue;
      const key = receipt.zip_member ? `${receipt.url}#zip:${receipt.zip_member}` : receipt.url;
      (quarantined.has(key) ? withheld : accepted).push({ dir, ...receipt });
    }
  }
  return { accepted, withheld };
}

/** The newest accepted capture of a URL; names a withheld newer one rather than hiding it. */
export function newestAccepted({ accepted, withheld }, url) {
  const hits = accepted.filter((receipt) => receipt.url === url);
  if (hits.length) return hits[hits.length - 1];
  const quarantined = withheld.filter((receipt) => receipt.url === url);
  throw new Error(quarantined.length
    ? `no accepted capture of ${url}: its newest ${quarantined.length} capture(s) are quarantined (${quarantined.at(-1).dir}) — repair that arm, do not widen this check`
    : `no retained capture of ${url}`);
}
