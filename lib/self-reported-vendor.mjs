// Self-reported vendor scores: selection, document re-verification and observation shape.
// A scout extraction is a lead. Nothing here trusts it: every accepted value must be found again
// in our own capture of the primary document, in the row the locator names, in the column the
// document's own comparison values place it in.

const NUMBER = /-?\d+(?:,\d{3})*(?:\.\d+)?/g;

/**
 * A Hugging Face or GitHub model card publishes its result table as HTML, one `<td>` per line, so a
 * line-based check would never see a published row. Each `<tr>` is folded into one line of its cell
 * texts. Markup is only stripped, never interpreted or executed.
 */
export function flattenHtmlTables(text) {
  if (!/<tr[\s>]/i.test(text)) return text;
  return text.replace(/<tr[\s\S]*?<\/tr>/gi, (row) => {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((m) => m[1].replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/\s+/g, ' ').trim());
    return `\n| ${cells.join(' | ')} |\n`;
  });
}

/** Lower-cased, with the punctuation variants a PDF text layer introduces folded away. Non-ASCII
 *  characters are kept: "τ²-Bench" must not normalize into something as generic as "bench". */
export const normalizeName = (s) => String(s ?? '').normalize('NFKC').toLowerCase()
  .replace(/[‐-―−]/g, '-').replace(/[‘’ʼ`]/g, "'")
  .replace(/\s+/g, ' ').trim();

/** The printed name, and the same name without a trailing parenthetical the extraction added. */
export const nameVariants = (printed) => {
  const full = normalizeName(printed);
  const short = normalizeName(String(printed ?? '').replace(/\s*\([^()]*\)\s*$/, ''));
  return short && short !== full ? [full, short] : [full];
};

/** "56%", "$4,231.10", "0.81" -> number; null when the token is not a single number. */
export function parseScoreToken(token) {
  if (typeof token === 'number') return Number.isFinite(token) ? token : null;
  const cleaned = String(token ?? '').replace(/[%$\s]/g, '').replace(/,(?=\d{3}\b)/g, '');
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

/**
 * The values the document prints in the same table row for the other models, as the extraction read
 * them. The labels are the document's short column names ("Fable 5.1"), not catalog names, and the
 * subject's own column is often not repeated — so this is used as an unordered set of numbers that
 * must all be present in the matched row, never as a column order.
 */
export function parseComparisonBaseline(baseline) {
  if (typeof baseline !== 'string' || !baseline.trim()) return null;
  const parts = baseline.split(';').map((p) => p.trim()).filter(Boolean);
  const values = [];
  for (const part of parts) {
    const m = part.match(/^(.*?)[\s:=]+(-?[\d.,$%]+)$/);
    if (!m) return null;
    const value = parseScoreToken(m[2]);
    if (value === null) return null;
    values.push(value);
  }
  return values.length >= 2 ? values : null;
}

/** Every number of `wanted` occurs at least as often in `have` (multiset containment). */
function contains(have, wanted) {
  const pool = [...have];
  for (const w of wanted) {
    const i = pool.findIndex((n) => nearlyEqual(n, w));
    if (i < 0) return false;
    pool.splice(i, 1);
  }
  return true;
}

/** The cells of one printed line: a Markdown/HTML pipe row, or a layout row split on column gaps. */
export function splitCells(line) {
  if (line.includes('|')) {
    const cells = []; let pos = 0;
    for (const part of line.split('|')) {
      if (part.trim()) cells.push({ text: part.trim(), start: pos, end: pos + part.length });
      pos += part.length + 1;
    }
    return cells;
  }
  const cells = []; const re = /\S(?:.*?\S)?(?=\s{2,}|$)/g;
  for (let m = re.exec(line); m; m = re.exec(line)) cells.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  return cells;
}

/**
 * Does one name contain the other as a whole name? "Opus 4.8" is "Claude Opus 4.8", but "Fable 5"
 * is not "Fable 5.1": a version may not be cut short, so the match must end on a boundary.
 */
function nameContains(haystack, needle) {
  // A fragment as short as "27B" would match a sub-header of a completely different column.
  if (needle.length < 5 && needle !== haystack) return false;
  for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + 1)) {
    const before = at === 0 || !/[a-z0-9.]/.test(haystack[at - 1]);
    const end = at + needle.length;
    const after = end === haystack.length || !/[0-9.]/.test(haystack[end]);
    if (before && after) return true;
  }
  return false;
}

/** The header cell that names this model: the longest whole-name match, and it must be unique. */
function headerCellFor(cells, model) {
  const wanted = normalizeName(model);
  let best = null, tie = false;
  for (const [index, cell] of cells.entries()) {
    const text = normalizeName(cell.text);
    if (!nameContains(wanted, text) && !nameContains(text, wanted)) continue;
    const score = Math.min(text.length, wanted.length);
    if (!best || score > best.score) { best = { ...cell, index, score }; tie = false; }
    else if (score === best.score) tie = true;
  }
  return tie ? null : best;
}

/**
 * A layout table may print its column names over several lines ("Claude" / "Fable 5.1/" /
 * "Mythos 5.1"). Cells of the lines above the row are clustered by the character span the table
 * aligns its columns on, so a column's full name can be read again.
 */
function headerColumns(lines, rowIndex, depth) {
  const clusters = [];
  for (let i = rowIndex - 1; i >= 0 && i >= rowIndex - depth; i--) {
    if (lines[i].page !== lines[rowIndex].page) break;
    const cells = splitCells(lines[i].line);
    // A prose line is one wide cell; merging it would give every column the same span.
    if (cells.length === 1 && cells[0].text.length > 40) continue;
    for (const cell of cells) {
      // A number in a line above is another benchmark's row: it marks where the column runs, but it
      // is not part of the column's name.
      const name = parseScoreToken(cell.text) === null ? [cell.text] : [];
      const hit = clusters.find((c) => Math.min(c.end, cell.end) - Math.max(c.start, cell.start) > 0);
      // Keep the *intersection* of the spans: a group header above several columns ("Fable family
      // models") must not widen a column until it covers its neighbours.
      if (hit) { hit.parts.unshift(...name); hit.start = Math.max(hit.start, cell.start); hit.end = Math.min(hit.end, cell.end); }
      else clusters.push({ parts: name, start: cell.start, end: cell.end });
    }
  }
  return clusters.map((c, index) => ({ text: c.parts.join(' '), start: c.start, end: c.end, index }));
}

/**
 * Which column of the published row belongs to the named model.
 * A table that repeats the model name in the row itself (or a sentence that names it) needs no
 * column at all. Otherwise the model must appear in a header line above the row, and the header
 * cell must line up with the cell holding the value — by cell index where the header has the same
 * number of cells, otherwise by the character span a layout table aligns its columns on.
 */
export function locateColumn(lines, rowIndex, value, model) {
  const line = lines[rowIndex].line;
  if (nameContains(normalizeName(line), normalizeName(model))) {
    return { ok: true, evidence: `the line names ${model} itself`, header: null, position: null };
  }
  const cells = splitCells(line);
  const valueCells = cells.filter((c) => nearlyEqual(parseScoreToken(c.text) ?? NaN, value));
  if (!valueCells.length) return { ok: false, reason: 'the value is not a cell of the published row' };
  const cellTable = line.includes('|');
  if (cellTable) {
    // A folded HTML or Markdown table puts its header far above the row (one markup line per cell in
    // between), and aligns from the right: the value columns are the trailing cells, while the row
    // carries one extra leading cell with the benchmark name.
    for (let i = rowIndex - 1; i >= 0 && i >= rowIndex - 400; i--) {
      if (/<\/table>/i.test(lines[i].line) || !lines[i].line.includes('|')) { if (/<\/table>/i.test(lines[i].line)) break; continue; }
      const headerCells = splitCells(lines[i].line);
      const header = headerCells.length >= 2 ? headerCellFor(headerCells, model) : null;
      if (!header) continue;
      const hit = valueCells.find((c) => cells.length - 1 - cells.indexOf(c) === headerCells.length - 1 - header.index);
      return hit ? { ok: true, header: lines[i].line.trim(),
        position: `cell ${headerCells.length - header.index} from the right of both the header and the row`,
        evidence: `column "${header.text}" of the header ${rowIndex - i} line(s) above, matched by cell position` }
        : { ok: false, reason: `the header names ${model} in a different column than the one holding ${value}` };
    }
    return { ok: false, reason: 'the captured document shows no header naming this model above the published row' };
  }
  // A PDF's layout table aligns on character columns, and may print a column name over several lines.
  // The leftmost column holds the benchmark name and the prose around the table; a model column is
  // never there, and matching it would make a sentence above the table look like a column name.
  const label = cells[0];
  const columns = headerColumns(lines, rowIndex, 12)
    .filter((c) => Math.min(c.end, label.end) - Math.max(c.start, label.start) <= 0);
  const header = headerCellFor(columns, model);
  if (!header) return { ok: false, reason: 'the captured document shows no header naming this model above the published row' };
  // The column name must sit over exactly one cell of the row, or it decides nothing.
  const under = cells.filter((c) => Math.min(c.end, header.end) - Math.max(c.start, header.start) > -2);
  if (under.length !== 1) return { ok: false, reason: `the header naming ${model} spans ${under.length} cells of the published row, so it does not identify a column` };
  return valueCells.includes(under[0])
    ? { ok: true, header: header.text.replace(/\s+/g, ' ').slice(0, 90),
      position: `characters ${header.start}-${header.end} of the line, the only row cell under it`,
      evidence: `column "${header.text.replace(/\s+/g, ' ').slice(0, 60)}" of the header above the row, matched by column position` }
    : { ok: false, reason: `the header names ${model} in a different column than the one holding ${value}` };
}

const pageOf = (locator) => {
  const m = String(locator ?? '').match(/\bp{1,2}\.?\s*(\d+)/i);
  return m ? Number(m[1]) : null;
};

/** Lines of the captured document, with the 1-based page number pdftotext's form feeds imply. */
export function documentLines(text) {
  const out = [];
  text.split('\f').forEach((page, i) => {
    for (const line of page.split('\n')) out.push({ page: i + 1, line });
  });
  return out;
};

const nearlyEqual = (a, b) => Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 1e-9);

/**
 * Re-verify one extracted row against the captured document text.
 * Strong form: one line carries the benchmark's printed name, our value, and every comparison value
 * the extraction read from that same row — so the whole published row was found again, not a number
 * that happens to appear somewhere in the document.
 * Weak form (the document prints no comparison values): the benchmark name and the value share a
 * line and the value appears exactly once there, so no neighbouring column could have been read.
 */
export function verifyRow(row, text) {
  const value = parseScoreToken(row.score_as_written ?? row.score);
  if (value === null || !nearlyEqual(value, Number(row.score))) {
    return { ok: false, reason: 'score_as_written does not parse to the recorded score' };
  }
  const names = nameVariants(row.benchmark_name_as_written).filter(Boolean);
  if (!names.length) return { ok: false, reason: 'no printed benchmark name in the extraction' };
  const modelName = row.model_name_as_written;
  if (!modelName) return { ok: false, reason: 'the extraction recorded no printed model name' };
  const baseline = parseComparisonBaseline(row.comparison_baseline);
  const wantedPage = pageOf(row.locator);

  const lines = documentLines(flattenHtmlTables(text)).map((l) => ({ ...l, normalized: normalizeName(l.line) }));
  const candidateRows = lines
    .map((l, index) => ({ ...l, index }))
    .filter((l) => names.some((n) => l.normalized.includes(n)));
  if (!candidateRows.length) return { ok: false, reason: 'the printed benchmark name is not in the captured document' };
  // The locator's page is the claim; a document that paginates a little differently after re-capture
  // is still acceptable evidence, but a row found pages away is a different table.
  const near = wantedPage ? candidateRows.filter((l) => Math.abs(l.page - wantedPage) <= 3) : [];
  let columnProblem = null;
  for (const scope of [near, candidateRows]) {
    for (const row of scope) {
      const numbers = (row.line.match(NUMBER) || []).map((t) => parseScoreToken(t)).filter((n) => n !== null);
      const rowMatches = baseline
        // The extraction sometimes repeats the subject's own column among the comparison values and
        // sometimes does not, so the value is required separately rather than as a second copy.
        ? numbers.some((n) => nearlyEqual(n, value)) && contains(numbers, baseline)
        : numbers.filter((n) => nearlyEqual(n, value)).length === 1;
      if (!rowMatches) continue;
      const column = locateColumn(lines, row.index, value, modelName);
      if (!column.ok) { columnProblem ??= column.reason; continue; }
      return { ok: true, page: row.page, line: row.line.trim(), page_matches_locator: row.page === wantedPage,
        header: column.header, position: column.position,
        method: `${baseline ? `the published row with this value and all ${baseline.length} comparison values the extraction read from it`
          : 'the published row with the benchmark name and exactly one matching value'}, and ${column.evidence}` };
    }
  }
  return { ok: false, reason: columnProblem ?? (baseline
    ? 'no line carries the benchmark name together with this value and the comparison values the extraction read'
    : 'no line carries the benchmark name with exactly one matching value') };
}

/** The accepted identity map entry for a row, or null. */
export function mapIdentity(row, identityMap) {
  for (const entry of identityMap.accepted) {
    if (entry.benchmark_normalized !== row.benchmark_normalized) continue;
    if (!entry.benchmark_version.some((v) => v === (row.benchmark_version ?? null))) continue;
    return entry;
  }
  return null;
}

const settingText = (setting) => Object.entries(setting || {})
  .filter(([, v]) => typeof v === 'string' && v.trim())
  .map(([k, v]) => `${k.replace(/_/g, ' ')} ${v.trim()}`).join('; ');

/** One registry observation from a re-verified row. */
export function buildObservation(row, { entry, mapEntry, capture, modelId, verification }) {
  const unit = mapEntry.unit_override ?? entry.scoring.unit;
  const setting = settingText(row.setting);
  const protocol = [
    `${entry.scoring.metric}`,
    `self-reported by ${row.reported_by} for its own model, printed as "${row.benchmark_name_as_written}"${row.benchmark_version ? ` ${row.benchmark_version}` : ''}`,
    setting ? `configuration: ${setting}` : null,
    row.from_figure ? 'value printed in a figure (printed number, never a bar height)' : null,
    // Anthropic prints one column for a product pair ("Claude Fable 5.1/ Mythos 5.1"). The value is
    // the pair's; saying so is better than pretending the document separated them.
    verification.header?.includes('/') ? `the document prints one column, "${verification.header.replace(/\s+/g, ' ').trim()}", for more than one product, so this value is that column's; it is recorded on the configuration the source names` : null,
    `re-verified against our own capture: ${verification.method}, page ${verification.page}${verification.page_matches_locator ? '' : ` (the extraction cited ${row.locator})`}`,
  ].filter(Boolean).join('; ');
  return {
    id: `self-reported:${row.row_sha256.slice(0, 20)}`,
    benchmark_id: entry.id,
    subject: {
      source_id: `${row.source_url}#${row.model_name_as_written}`,
      name: row.model_name_as_written,
      model_id: modelId,
      variant: row.setting?.reasoning_effort ?? null,
      harness: row.setting?.scaffold ?? null,
    },
    value: parseScoreToken(row.score_as_written ?? row.score),
    unit,
    basis: 'self_reported',
    source: {
      url: row.source_url,
      retrieved_at: capture.retrieved_at,
      published_at: row.publication_date ?? null,
      sha256: capture.sha256,
      file: capture.file,
      locator: `${row.locator || 'no locator recorded by the extraction'}; captured evidence: ${capture.evidence === 'pdf_text_layer' ? `text layer of the PDF (original document sha256 ${capture.document_sha256}, ${capture.document_bytes} bytes)` : 'original response bytes'}; matched line: ${verification.line.slice(0, 200)}${verification.header ? `; column header: ${verification.header.slice(0, 200)} (${verification.position})` : ''}`,
    },
    protocol,
    comparison_key: null,
  };
}
