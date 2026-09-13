// Stable, dated observations for score boards that are stored on model rows
// rather than in the versioned benchmark registry.  These are deliberately
// history-only axes: adding them to the registry would change the denominator
// of the product's benchmark coverage count.

export const HEADLINE_REGISTRY = Object.freeze([
  { id: 'aa-intelligence-index::snapshot', family: 'aa-intelligence-index', version: 'snapshot', status: 'active', version_status: 'published', scoring: { unit: 'points', higher_better: true, metric: 'Artificial Analysis Intelligence Index' } },
  { id: 'aa-coding-index::snapshot', family: 'aa-coding-index', version: 'snapshot', status: 'active', version_status: 'published', scoring: { unit: 'points', higher_better: true, metric: 'Artificial Analysis Coding Index' } },
  { id: 'epoch-eci::general', family: 'epoch-eci', version: 'general', status: 'active', version_status: 'published', scoring: { unit: 'points', higher_better: true, metric: 'Epoch general ECI' } },
  { id: 'epoch-eci::software', family: 'epoch-eci', version: 'software', status: 'active', version_status: 'published', scoring: { unit: 'points', higher_better: true, metric: 'Epoch Software Engineering ECI' } },
  { id: 'designarena-frontend::snapshot', family: 'designarena-frontend', version: 'snapshot', status: 'active', version_status: 'published', scoring: { unit: 'Elo', higher_better: true, metric: 'DesignArena Frontend Elo' } },
  { id: 'designarena-fullstack::snapshot', family: 'designarena-fullstack', version: 'snapshot', status: 'active', version_status: 'published', scoring: { unit: 'Elo', higher_better: true, metric: 'DesignArena Full-Stack Elo' } },
]);

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

function sourceRef({ url, retrievedAt, file, sha256, locator }) {
  return {
    url: url || null,
    retrieved_at: retrievedAt || null,
    published_at: null,
    sha256: sha256 || null,
    file: file || null,
    locator: locator || null,
  };
}

function observation({ id, benchmarkId, sourceId, name, catalogModelId, value, unit, source, protocol }) {
  if (!finite(value)) return null;
  return {
    id,
    benchmark_id: benchmarkId,
    subject: {
      // source_id is the immutable upstream identity; model_id is intentionally
      // the same identity so history can bridge even when our catalog join is
      // later renamed. The optional catalog_model_id is only a display join.
      source_id: sourceId,
      model_id: sourceId,
      catalog_model_id: catalogModelId || null,
      name,
      variant: null,
      harness: null,
    },
    value,
    unit,
    basis: 'measured',
    source,
    protocol,
    comparison_key: null,
  };
}

function uniqueCatalogId(rows, predicate) {
  const matches = (rows || []).filter(predicate).map((row) => row.id);
  return matches.length === 1 ? matches[0] : null;
}

/**
 * Convert the current AA, Epoch and DesignArena source snapshots to history
 * observations.  `modelRows` is only used for an audited display join; an
 * ambiguous join is left null and never guessed.
 */
export function buildHeadlineObservations({ artificialanalysis = null, designarena = null, epochEci = null, modelRows = [], files = {} } = {}) {
  const rows = [];
  const aaSource = artificialanalysis ? sourceRef({
    url: artificialanalysis.endpoint || artificialanalysis.source_url,
    retrievedAt: artificialanalysis.collected_at,
    file: files.artificialanalysis || 'data/raw/artificialanalysis.json',
    sha256: artificialanalysis.sha256,
  }) : null;
  for (const model of artificialanalysis?.models || []) {
    const evaluations = model.evaluations || {};
    const catalogId = uniqueCatalogId(modelRows, (row) => row.aa_model_id === model.id);
    for (const [field, benchmarkId, label] of [
      ['artificial_analysis_intelligence_index', 'aa-intelligence-index::snapshot', 'AA Intelligence Index'],
      ['artificial_analysis_coding_index', 'aa-coding-index::snapshot', 'AA Coding Index'],
    ]) {
      const value = evaluations[field];
      const item = observation({
        id: `headline:${benchmarkId}:${model.id}`,
        benchmarkId,
        sourceId: model.id,
        name: model.name,
        catalogModelId: catalogId,
        value,
        unit: 'points',
        source: { ...aaSource, locator: `models[${model.id}].evaluations.${field}` },
        protocol: `${label}; Artificial Analysis API v2 model board; exact source model UUID retained`,
      });
      if (item) rows.push(item);
    }
  }

  const eciSource = epochEci ? sourceRef({
    url: epochEci.source?.urls?.general,
    retrievedAt: epochEci.collected_at,
    file: files.epochEci || 'data/raw/epoch-eci.json',
    sha256: epochEci.source?.sha256?.general,
  }) : null;
  for (const model of epochEci?.models || []) {
    // Exact value pair + display name is the conservative family-scope join.
    // If more than one catalog row matches, retain the score but omit the join.
    const catalogId = uniqueCatalogId(modelRows, (row) => row.display_name === model.display_name
      || row.display_name === model.source_model_name
      || (row.benchmarks?.epoch_eci === model.general && row.benchmarks?.epoch_eci_software === model.software));
    for (const [value, benchmarkId, label, locator] of [
      [model.general, 'epoch-eci::general', 'Epoch general ECI', 'general'],
      [model.software, 'epoch-eci::software', 'Epoch Software Engineering ECI', 'software'],
    ]) {
      const item = observation({
        id: `headline:${benchmarkId}:${model.source_model_name}`,
        benchmarkId,
        sourceId: `epoch:${model.source_model_name}`,
        name: model.display_name || model.source_model_name,
        catalogModelId: catalogId,
        value,
        unit: 'points',
        source: { ...eciSource, locator: `models[${model.source_model_name}].${locator}` },
        protocol: `${label}; Epoch AI export ${epochEci.definition_version}; source model name retained`,
      });
      if (item) rows.push(item);
    }
  }

  const daSourceBase = designarena ? sourceRef({
    url: designarena.endpoint || designarena.source_url,
    retrievedAt: designarena.collected_at,
    file: files.designarena || 'data/raw/designarena.json',
    sha256: designarena.sha256,
  }) : null;
  for (const [board, payload] of Object.entries(designarena?.leaderboards || {})) {
    const benchmarkId = `designarena-${board}::snapshot`;
    for (const [index, model] of (payload.data || []).entries()) {
      const catalogId = uniqueCatalogId(modelRows, (row) => row.designarena?.[board]?.modelId === model.modelId);
      const item = observation({
        id: `headline:${benchmarkId}:${model.modelId}`,
        benchmarkId,
        sourceId: model.modelId,
        name: designarena.model_registry?.[model.modelId]?.display_name || model.modelId,
        catalogModelId: catalogId,
        value: model.elo,
        unit: 'Elo',
        source: { ...daSourceBase, locator: `leaderboards.${board}.data[${index}]` },
        protocol: `DesignArena ${board} published Elo board; exact upstream model id retained`,
      });
      if (item) rows.push(item);
    }
  }
  return rows;
}

