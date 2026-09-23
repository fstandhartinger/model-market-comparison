// F-163 / F-164 (Fable pass 31, 2026-09-22): the Compare page showed a launch-day model as if it
// had been measured. Two surfaces were wrong in the same way, so both fixes are generated from the
// rows the table itself renders — never pinned, never written by hand for one model:
//
//   F-164  the status line counted a developer's own claim as an "evaluation row" without saying
//          so. `compareClaimsSentence()` adds one clause per model whose rows are claims (†) or
//          announced, chart-read figures (‡), in the model page's own wording.
//   F-163  the "Where each model is strongest" cards listed such a model in every topic with
//          "No measured result" and an empty bar — twelve times for a model with nothing measured
//          anywhere. `unmeasuredNoticeLine()` is the one line that replaces those rows.
//
// Pure functions over the view; no React, no DOM. Number agreement follows the subject of the
// sentence ("1 of 17 values *is* the developer's own claim"), which is D173's rule; the model
// page's sheet line governs its verb by the total instead, so the two differ on that one edge.
import { latestScores } from './benchmark-view.mjs';

/** The row the Compare table renders for one model on one axis — the same selection the cells use. */
export const rowFor = (axis, modelId) => latestScores(axis.scores, 'all').find((r) => r.modelId === modelId);

/** How the values a model shows in the full comparison are based. `axes` are the visible axes, so
 *  the totals equal what a reader can count on the page (and the model page's sheet line for a
 *  single-variant model). `name`/`org` come from the view's model record. */
export function claimProfile(axes, model) {
  const rows = axes.map((axis) => rowFor(axis, model.id)).filter(Boolean);
  const measured = rows.filter((r) => r.basis === 'measured');
  return {
    id: model.id,
    name: model.name || model.id,
    org: model.org || 'the developer',
    total: rows.length,
    selfReported: rows.filter((r) => r.basis === 'self_reported').length,
    preliminary: rows.filter((r) => r.basis === 'preliminary').length,
    measured: measured.length,
    measuredLowSample: measured.filter((r) => r.lowSample).length,
  };
}

export const claimProfiles = (axes, modelIds, models) =>
  modelIds.map((id) => claimProfile(axes, models.find((m) => m.id === id) ?? { id }));

const plural = (n, singular, suffix = 's') => `${singular}${n === 1 ? '' : suffix}`;
/** The same rule as lib/format.ts's counted(), for the wording this module generates. */
const count = (n, singular, suffix = 's') => `${n} ${plural(n, singular, suffix)}`;
/** "A", "A and B", "A, B and C" — the page never prints a list with an invented separator. */
export const nameList = (names) => names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

const selfPhrase = (n, org, short) => short ? `${org}’s` : `${org}’s own ${plural(n, 'claim')} (†)`;
const preliminaryPhrase = (n, short) => short ? `announced ${plural(n, 'figure')} (‡)` : `announced, chart-read ${plural(n, 'figure')} (‡)`;

/** One clause per model, in the sheet's wording shortened to a single clause. A clause whose basis
 *  repeats the previous one drops the words the reader has just read ("GPT-6 Sol: 5 of 6 are
 *  OpenAI’s"), which is what keeps the line inside three lines on a phone. */
export function claimClause(profile, repeatsKind = false) {
  const { name, org, total, selfReported: self, preliminary: prel } = profile;
  const of = repeatsKind ? `${total}` : `${total} ${plural(total, 'value')}`;
  if (self && prel) return `${name}: of ${total} ${plural(total, 'value')}, ${self} ${self === 1 ? 'is' : 'are'} ${selfPhrase(self, org, false)} and ${prel} ${prel === 1 ? 'is an' : 'are'} ${preliminaryPhrase(prel, false)}`;
  if (self) return `${name}: ${self} of ${of} ${self === 1 ? 'is' : 'are'} ${selfPhrase(self, org, repeatsKind)}`;
  if (prel) return `${name}: ${prel} of ${of} ${prel === 1 ? 'is an' : 'are'} ${preliminaryPhrase(prel, repeatsKind)}`;
  return '';
}

export const claimKind = (p) => (p.selfReported && p.preliminary ? 'both' : p.selfReported ? 'self' : p.preliminary ? 'preliminary' : null);

/** F-164: what the status line itself says, next to the row count it qualifies. The live region is
 *  announced on every selection change, so it states the totals only — "23 of 67 values"; the
 *  per-model clauses of `compareClaimsSentence()` sit under it, where length costs nobody a re-read.
 *  Values, not rows: one row of the table holds one value per selected model. */
export function claimsSummaryClause(profiles) {
  const total = profiles.reduce((n, p) => n + p.total, 0);
  const self = profiles.reduce((n, p) => n + p.selfReported, 0);
  const prel = profiles.reduce((n, p) => n + p.preliminary, 0);
  const n = self + prel;
  if (!n) return '';
  // Said in as few words as fit three lines on a phone: which values they are, and whose, is the
  // paragraph under the line. The negative form is the precise one — the marks mean exactly this.
  return `; ${n} of ${count(total, 'value')} ${n === 1 ? 'is not an independent measurement' : 'are not independent measurements'}`;
}

/** F-164: the sentence the status line gains. Empty when every selected model is measured only. */
export function compareClaimsSentence(profiles) {
  const clauses = [];
  let previous = null;
  for (const profile of profiles) {
    const kind = claimKind(profile);
    if (!kind || !profile.total) continue;
    clauses.push(claimClause(profile, kind === previous));
    previous = kind;
  }
  return clauses.length ? `${clauses.join(' · ')}.` : '';
}

/** Why a selected model has nothing in the snapshot cards — its own rows decide, never the group's. */
export const noticeKind = (p) => (p.selfReported && p.preliminary ? 'both' : p.selfReported ? 'self' : p.preliminary ? 'preliminary' : p.measured ? 'unplaced' : 'none');
const NOTICE_ORDER = ['self', 'both', 'preliminary', 'unplaced', 'none'];

/** F-163: the one line that replaces a model's rows in every snapshot card. `profiles` are the
 *  selected models with no independently measured, placeable result in any topic — the same
 *  `measured` count the cards average, so the line and the cards can never disagree.
 *  Models are grouped by what their own values are: a model with nothing listed must not be
 *  described by another model's claims, so each group gets its own sentence. */
export function unmeasuredNoticeLine(profiles) {
  if (!profiles.length) return '';
  const groups = new Map();
  for (const profile of profiles) {
    const kind = noticeKind(profile);
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind).push(profile);
  }
  return NOTICE_ORDER.filter((kind) => groups.has(kind)).map((kind) => noticeSentence(kind, groups.get(kind))).join(' ');
}

function noticeSentence(kind, group) {
  const many = group.length > 1;
  const head = `${nameList(group.map((p) => p.name))} ${many ? 'have' : 'has'} no independently measured result in any topic yet`;
  const their = many ? 'their' : 'its';
  const tail = ', listed in the full comparison below.';
  const developers = many || group.some((p) => p.selfReported > 1) ? 'developers’' : 'developer’s';
  if (kind === 'both') return `${head} — ${their} values are the ${developers} own claims (†) and announced, chart-read figures (‡)${tail}`;
  if (kind === 'self') return `${head} — ${their} values are the ${developers} own claims (†)${tail}`;
  if (kind === 'preliminary') return `${head} — ${their} values are announced, chart-read figures (‡)${tail}`;
  // Measured rows that no peer range can place (a low sample, or a benchmark no one else has run)
  // are not claims and must not be called any: they are excluded from the averages, and said so.
  if (kind === 'unplaced') return `${head} — the ${count(group.reduce((n, p) => n + p.measured, 0), 'measurement')} ${many ? 'they have' : 'it has'} cannot be placed against a peer range, so these averages exclude ${many ? 'them' : 'it'}; ${many ? 'they are' : 'it is'} listed in the full comparison below.`;
  return `${head}, and no value of ${many ? 'theirs' : 'its own'} is listed in the full comparison.`;
}
