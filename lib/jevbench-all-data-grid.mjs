// CR-269: pure data layer for the collapsed "All data" grid (components/JevV15AllDataGrid.tsx).
// Everything here is framework-free so node --test can verify row/column mapping, dynamic category
// columns, missing-value behaviour and CSV escaping without a DOM. The layer only reads values that
// exist in the supplied JevV15Artifact, the jevbenchCategoryView result, previous-release keys,
// optional Jev-class eligibility metadata (lib/jevbench-jev-class.mjs result) and optional explicit
// metadata; it never infers parameter counts, prices, capability or eligibility from a model name.

const finite = (v) => (Number.isFinite(v) ? v : null);

/** Groups in chooser order; category groups (dim titles) are appended as they appear in the view. */
export const ALL_DATA_BASE_GROUPS = ['Identity', 'Scores', 'Capability', 'Axes', 'Intelligence detail', 'Choice', 'Noul', 'Score', 'Latency', 'Cost'];

/**
 * @typedef {Object} JevV15AllDataMetadata
 * Optional, explicitly supplied per-system facts. Every field stays "not reported" when absent.
 * @property {Record<string, number>} [params] exact parameter count, only where a source states it
 * @property {Record<string, string>} [firstAdded] system key -> release version string
 * @property {Record<string, number>} [apiPriceUsdPer1000] developer/API price per 1,000 decisions
 * @property {Record<string, number>} [basePriceUsdPer1000] base-model reference price per 1,000 decisions
 */

/**
 * @typedef {Object} JevV15RevisionLinks
 * @property {string} [method]
 * @property {string} [pricing]
 * @property {string} [revisionNotes]
 * @property {Record<string, string>} [addenda] addendum id (e.g. "A6") -> notes URL
 */

const boolCell = (v) => (v == null ? null : !!v);

/**
 * Build the grid model from released inputs.
 * @param {{ artifact: object, categoryView?: object|null, previousKeys?: string[]|null,
 *           eligibility?: object|null, metadata?: JevV15AllDataMetadata|null }} input
 */
export function buildAllDataModel({ artifact, categoryView = null, previousKeys = null, eligibility = null, metadata = null }) {
  if (!artifact || !Array.isArray(artifact.systems)) throw new Error('buildAllDataModel: artifact.systems is required');
  const headline = artifact.headline ?? 'A';
  const revision = artifact.revision;
  const previous = new Set(Array.isArray(previousKeys) ? previousKeys : []);
  const params = metadata?.params ?? null;
  const firstAddedMeta = metadata?.firstAdded ?? null;
  const apiPrice = metadata?.apiPriceUsdPer1000 ?? null;
  const basePrice = metadata?.basePriceUsdPer1000 ?? null;

  /** @type {Map<string, object>} */
  const classByRow = new Map((eligibility?.rows ?? []).map((r) => [r.row?.key, r]));

  const columns = [];
  const col = (id, label, group, kind, style, opts = {}) => {
    const column = { id, label, group, kind, style: style ?? (kind === 'number' ? 'p1' : kind === 'boolean' ? 'bool' : 'text'), title: opts.title, visible: opts.visible !== false, lockVisible: !!opts.lockVisible };
    columns.push(column);
    return column;
  };

  // --- Identity ------------------------------------------------------------
  col('rank', 'Official rank', 'Identity', 'number', 'int', { title: `Official rank under headline option ${headline} (${revision}); empty for unranked rows` });
  col('system', 'System', 'Identity', 'text', 'text', { lockVisible: true, title: 'Full published system name' });
  col('key', 'System key', 'Identity', 'text', 'text', { visible: false, title: 'Stable key used in the artifact and API' });
  col('author', 'Provider / author', 'Identity', 'text', 'text');
  col('class', 'Class', 'Identity', 'text', 'text', { title: 'System family / class as recorded in the artifact' });
  col('open', 'Open / closed / weights', 'Identity', 'text', 'text', { title: 'Openness exactly as recorded in the artifact' });
  col('api', 'API', 'Identity', 'boolean', 'bool', { title: 'True when the operator endpoint received sealed item text, without answers' });
  col('licence', 'Licence', 'Identity', 'text', 'text');
  col('endpoint', 'Endpoint', 'Identity', 'text', 'text', { title: 'Measured endpoint kind (GPU pod, CPU container, hosted API, author demo)' });
  col('listing', 'Listing', 'Identity', 'text', 'text', { title: 'ranked / partial / unranked / unpriced / honorable_mention / not measured' });
  col('notRankedBecause', 'Not ranked because', 'Identity', 'text', 'text', { visible: false });
  col('apiExposureNote', 'API exposure note', 'Identity', 'text', 'text', { visible: false });
  col('params', 'Parameter count', 'Identity', 'number', 'int', { title: 'Exact parameter count — only when explicitly supplied via metadata; otherwise not reported' });
  col('firstAdded', 'First added', 'Identity', 'text', 'text', { title: 'Release version the system first appeared in (explicit metadata, or this revision when previous-release keys prove it is new here)' });
  col('addendum', 'Addendum', 'Identity', 'text', 'text', { title: 'Roster addendum label; links come from the supplied revision links' });

  // --- Scores --------------------------------------------------------------
  col('score', 'Official score', 'Scores', 'number', 'p1', { title: `Official JevBench ${revision} score (headline option ${headline})` });
  for (const o of ['A', 'B', 'C']) col(`score${o}`, `${o} score`, 'Scores', 'number', 'p1', { title: `Score under weight option ${o}` });
  for (const o of ['A', 'B', 'C']) col(`rank${o}`, `${o} rank`, 'Scores', 'number', 'int', { title: `Rank under weight option ${o}` });

  // --- Capability ----------------------------------------------------------
  col('capability', 'Capability Score', 'Capability', 'number', 'p1', { title: 'Mean of Intelligence and Calibration; only when both values exist' });
  col('eligible', 'Jev-class eligible', 'Capability', 'boolean', 'bool', { title: 'Within the supplied Jev-class cost and median-latency caps; not reported when no caps are supplied' });
  col('eligibilityReason', 'Eligibility reason', 'Capability', 'text', 'text');
  col('costRatio', 'Cost vs cap (×)', 'Capability', 'number', 'p2', { visible: false, title: 'Cost divided by the Jev-class reference cost (from the supplied eligibility metadata)' });
  col('latencyRatio', 'Latency vs cap (×)', 'Capability', 'number', 'p2', { visible: false, title: 'Adjusted median latency divided by the Jev-class reference latency (from the supplied eligibility metadata)' });

  // --- Axes ----------------------------------------------------------------
  col('intelligence', 'Intelligence', 'Axes', 'number', 'p1');
  col('calibration', 'Calibration', 'Axes', 'number', 'p1');
  col('speed', 'Speed', 'Axes', 'number', 'p1');
  col('cost', 'Cost axis', 'Axes', 'number', 'p1');

  // --- Intelligence detail -------------------------------------------------
  col('iOpen', 'I open', 'Intelligence detail', 'number', 'p1', { title: 'Intelligence on the open set' });
  col('iSealed', 'I sealed', 'Intelligence detail', 'number', 'p1', { title: 'Intelligence on the sealed set' });
  col('gap', 'Gap (open − sealed)', 'Intelligence detail', 'number', 'signed');
  col('excess', 'Gap excess', 'Intelligence detail', 'number', 'signed', { visible: false, title: 'Gap beyond the field median gap (G_med)' });
  col('penalty', 'Gap penalty (×)', 'Intelligence detail', 'number', 'mult', { title: 'Intelligence penalty multiplier above the median gap' });

  // --- Per request type ----------------------------------------------------
  const TYPES = ['choice', 'noul', 'score'];
  const TYPE_LABEL = { choice: 'Choice', noul: 'Noul', score: 'Score' };
  for (const t of TYPES) {
    col(`ccOpen:${t}`, `${TYPE_LABEL[t]} CC open`, TYPE_LABEL[t], 'number', 'p1', { title: `${TYPE_LABEL[t]} chance-corrected competence, open set` });
    col(`nOpen:${t}`, `${TYPE_LABEL[t]} n open`, TYPE_LABEL[t], 'number', 'int', { visible: false, title: `${TYPE_LABEL[t]} open items answered` });
    col(`ccSealed:${t}`, `${TYPE_LABEL[t]} CC sealed`, TYPE_LABEL[t], 'number', 'p1', { title: `${TYPE_LABEL[t]} chance-corrected competence, sealed set` });
    col(`nSealed:${t}`, `${TYPE_LABEL[t]} n sealed`, TYPE_LABEL[t], 'number', 'int', { visible: false, title: `${TYPE_LABEL[t]} sealed items answered` });
  }

  // --- Latency & cost ------------------------------------------------------
  col('p50Raw', 'p50 raw (s)', 'Latency', 'number', 'secs', { visible: false });
  col('p95Raw', 'p95 raw (s)', 'Latency', 'number', 'secs', { visible: false });
  col('p50Adj', 'p50 adjusted (s)', 'Latency', 'number', 'secs', { title: 'Median latency after the published self-host/demo adjustment' });
  col('p95Adj', 'p95 adjusted (s)', 'Latency', 'number', 'secs');
  col('speedN', 'Latency n', 'Latency', 'number', 'int', { visible: false, title: 'Requests the latency percentiles are measured on' });
  col('adjustment', 'Latency adjustment', 'Latency', 'text', 'text');
  col('costUsd', 'USD per 1,000 decisions', 'Cost', 'number', 'usd', { title: 'Official cost per 1,000 decisions' });
  col('costKind', 'Cost kind', 'Cost', 'text', 'text', { title: 'estimate / tariff as recorded' });
  col('costBasis', 'Cost basis', 'Cost', 'text', 'text', { visible: false });
  col('apiPrice', 'Developer API price (USD / 1k)', 'Cost', 'number', 'usd', { visible: false, title: 'Only when explicitly supplied via metadata; otherwise not reported' });
  col('basePrice', 'Base-model reference price (USD / 1k)', 'Cost', 'number', 'usd', { visible: false, title: 'Only when explicitly supplied via metadata; otherwise not reported' });

  // --- Categories (dynamic) ------------------------------------------------
  const categoryReasons = {};
  if (categoryView && Array.isArray(categoryView.dims)) {
    for (const dim of categoryView.dims) {
      for (const c of dim.cats ?? []) {
        col(`cat:${dim.key}:${c.key}`, c.label, dim.title, 'number', 'p1',
          { title: `${c.label} — ${c.n} items in ${dim.title}${c.lowN ? ' (low n)' : ''}. ${dim.note ?? ''}` });
        col(`cat:${dim.key}:${c.key}:n`, `${c.label} (n)`, dim.title, 'number', 'int', { visible: false, title: `Items this system answered in ${c.label}` });
      }
    }
    col('categoryNote', 'Category note', 'Category data', 'text', 'text',
      { title: 'Why per-category values are unavailable for this system, when the category view says so' });
  }

  const dimByKey = new Map((categoryView?.dims ?? []).map((d) => [d.key, d]));

  const buildValues = (sys, notMeasured) => {
    const values = {};
    const axes = sys.axes ?? {};
    const intel = sys.intelligence ?? null;
    const speed = sys.speed ?? {};
    const cost = sys.cost ?? {};
    const split = intel?.per_type_split ?? {};
    const cell = (splitKey, t) => split[`${splitKey}|${t}`] ?? null;
    const classRow = classByRow.get(sys.key);
    const intelligence = finite(axes.intelligence);
    const calibration = finite(axes.calibration);

    values.rank = notMeasured ? null : finite(sys.rank);
    values.system = sys.display ?? sys.key ?? null;
    values.key = sys.key ?? null;
    values.author = sys.author ?? null;
    values.class = sys.class ?? null;
    values.open = sys.open == null ? null : String(sys.open);
    values.api = boolCell(sys.api_flag);
    values.licence = notMeasured ? null : sys.licence ?? null;
    values.endpoint = notMeasured ? null : sys.endpoint_kind ?? null;
    values.listing = notMeasured ? 'not measured' : sys.listing ?? null;
    values.notRankedBecause = notMeasured ? (sys.reason ?? sys.status ?? null) : sys.not_ranked_because ?? null;
    values.apiExposureNote = notMeasured ? null : sys.api_exposure_note ?? null;
    values.params = params?.[sys.key] ?? null;
    values.firstAdded = firstAddedMeta?.[sys.key]
      ?? (!notMeasured && previous.size > 0 && !previous.has(sys.key) ? revision : null);
    values.addendum = sys.addendum?.label ?? null;
    values.score = finite(sys.jevbench_score);
    for (const o of ['A', 'B', 'C']) {
      values[`score${o}`] = finite(sys.scores?.[o]);
      values[`rank${o}`] = finite(sys.ranks?.[o]);
    }
    values.capability = classRow ? finite(classRow.capability)
      : intelligence != null && calibration != null ? (intelligence + calibration) / 2 : null;
    values.eligible = classRow ? boolCell(classRow.inClass) : null;
    values.eligibilityReason = classRow ? (classRow.reasons?.length ? classRow.reasons.join('; ') : 'within caps') : null;
    values.costRatio = classRow ? finite(classRow.costRatio) : null;
    values.latencyRatio = classRow ? finite(classRow.latencyRatio) : null;
    values.intelligence = intelligence;
    values.calibration = calibration;
    values.speed = finite(axes.speed);
    values.cost = finite(axes.cost);
    values.iOpen = finite(intel?.I_open);
    values.iSealed = finite(intel?.I_sealed);
    values.gap = finite(intel?.gap);
    values.excess = finite(intel?.excess);
    values.penalty = finite(intel?.penalty);
    for (const t of TYPES) {
      const openCell = cell('open', t);
      const sealedCell = cell('sealed', t);
      values[`ccOpen:${t}`] = finite(openCell?.cc);
      values[`nOpen:${t}`] = openCell ? Object.values(openCell.n ?? {}).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) : null;
      values[`ccSealed:${t}`] = finite(sealedCell?.cc);
      values[`nSealed:${t}`] = sealedCell ? Object.values(sealedCell.n ?? {}).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) : null;
    }
    values.p50Raw = finite(speed.p50_s_raw);
    values.p95Raw = finite(speed.p95_s_raw);
    values.p50Adj = finite(speed.p50_s_adjusted);
    values.p95Adj = finite(speed.p95_s_adjusted);
    values.speedN = finite(speed.n);
    values.adjustment = speed.adjustment ?? null;
    values.costUsd = finite(cost.usd_per_1000);
    values.costKind = cost.kind ?? null;
    values.costBasis = cost.basis ?? null;
    values.apiPrice = apiPrice?.[sys.key] ?? null;
    values.basePrice = basePrice?.[sys.key] ?? null;

    if (categoryView) {
      const row = categoryView.systems?.[sys.key] ?? null;
      for (const dim of categoryView.dims ?? []) {
        const known = dimByKey.get(dim.key);
        for (const c of known?.cats ?? dim.cats ?? []) {
          const value = row?.[dim.key]?.[c.key] ?? null;
          values[`cat:${dim.key}:${c.key}`] = value == null ? null : finite(value[0]);
          values[`cat:${dim.key}:${c.key}:n`] = value == null ? null : finite(value[1]);
        }
      }
      values.categoryNote = categoryView.missing?.[sys.key] ?? null;
    }
    return values;
  };

  const rows = [
    ...artifact.systems.map((sys) => ({ key: sys.key, system: sys, notMeasured: false, values: buildValues(sys, false) })),
    ...(artifact.not_measured ?? []).map((sys) => ({ key: sys.key, system: sys, notMeasured: true, values: buildValues(sys, true) })),
  ];

  return { revision, headline, columns, rows, revisionNote: artifact.revision_note ?? null };
}

/** True when at least one row carries a value for the column — used to disable empty range filters. */
export function columnHasValues(rows, column) {
  return rows.some((row) => row.values[column.id] != null);
}

/** AND of all filters; null cells never match an active filter (missing stays missing). */
export function matchesFilters(row, columns, filters) {
  const byId = new Map(columns.map((c) => [c.id, c]));
  for (const f of filters ?? []) {
    const column = byId.get(f?.id);
    if (!column) continue;
    const v = row.values[f.id];
    if (f.text != null && String(f.text).trim() !== '') {
      if (v == null) return false;
      if (!String(v).toLowerCase().includes(String(f.text).toLowerCase())) return false;
    }
    if (column.kind === 'number' && (f.min != null || f.max != null)) {
      if (v == null || typeof v !== 'number') return false;
      if (f.min != null && Number.isFinite(f.min) && v < f.min) return false;
      if (f.max != null && Number.isFinite(f.max) && v > f.max) return false;
    }
  }
  return true;
}

export function applyFilters(rows, columns, filters) {
  const active = (filters ?? []).filter((f) => f && (f.text != null || f.min != null || f.max != null));
  if (!active.length) return rows;
  return rows.filter((row) => matchesFilters(row, columns, active));
}

/** Multi-column stable sort; empty cells sort last in either direction. */
export function sortRows(rows, columns, sorts) {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const active = (sorts ?? []).filter((s) => s && byId.has(s.id) && (s.dir === 'asc' || s.dir === 'desc'));
  if (!active.length) return rows;
  const indexed = rows.map((row, i) => [row, i]);
  indexed.sort((a, b) => {
    for (const { id, dir } of active) {
      const av = a[0].values[id];
      const bv = b[0].values[id];
      if (av == null && bv == null) continue;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp;
      if (byId.get(id).kind === 'number') cmp = av - bv;
      else if (byId.get(id).kind === 'boolean') cmp = (av ? 1 : 0) - (bv ? 1 : 0);
      else cmp = av < bv ? -1 : av > bv ? 1 : 0;
      if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
    }
    return a[1] - b[1];
  });
  return indexed.map(([row]) => row);
}

const csvEscape = (s) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** RFC 4180 CSV: raw values (full precision), empty string for missing, yes/no for booleans, CRLF rows. */
export function toCsv(columns, rows) {
  const cell = (v, kind) => {
    if (v == null) return '';
    if (kind === 'boolean') return v ? 'yes' : 'no';
    return String(v);
  };
  const lines = [columns.map((c) => csvEscape(c.label)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => csvEscape(cell(row.values[c.id], c.kind))).join(','));
  }
  return lines.join('\r\n');
}

/** JSON export keeps raw values and nulls, keyed by stable column id. */
export function toJson(columns, rows) {
  return rows.map((row) => {
    const out = {};
    for (const c of columns) out[c.id] = row.values[c.id] ?? null;
    return out;
  });
}