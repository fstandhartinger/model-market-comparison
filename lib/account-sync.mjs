// CR-5.2 – CR-5.4: pure rules for syncing presets and settings between this browser and the account,
// and the request guards of /api/account. No I/O, so every rule is unit-tested.
import { mergePresets, sanitizeStore } from './presets.mjs';

/** localStorage: the account id this browser has already merged its presets into. */
export const ACCOUNT_MARKER_KEY = 'bh.account.v1';
/** sessionStorage: the sign-in suggestion was shown this session (CR-5.3). */
export const SIGNIN_TOAST_KEY = 'bh.signinToast.v1';
export const MAX_SETTINGS_CHARS = 32_768;
export const MAX_BODY_CHARS = 262_144;

const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const stable = (v) => JSON.stringify(v, (_, x) => isPlainObject(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x);

/** CR-5.4: the first sign-in in a browser merges its presets into the account (nothing lost, same-named
 *  different values kept as "Name (this browser)"). After that the account is authoritative, so a preset
 *  deleted in one browser is not resurrected by another browser's stale local copy. */
export function planPresetSync({ account, local, syncedUid, uid }) {
  const a = sanitizeStore(account);
  if (syncedUid && syncedUid === uid) return { presets: a, push: false };
  const l = sanitizeStore(local);
  const merged = { models: mergePresets(a.models, l.models), rows: mergePresets(a.rows, l.rows), filters: mergePresets(a.filters, l.filters) };
  return { presets: merged, push: stable(merged) !== stable(a) };
}

/** Settings are one object, not a list: the account's copy wins when it has one (that is what makes a
 *  second browser follow the first); an account without settings adopts this browser's. */
export function planSettingsSync({ accountSettings, localSettings }) {
  if (isPlainObject(accountSettings)) return { apply: accountSettings, push: false };
  return { apply: null, push: isPlainObject(localSettings) };
}

/** Validates a PUT body: `presets` is sanitised like a stored payload; `settings` must be a small plain
 *  object (the client re-sanitises it on load). Returns null for anything else. */
export function parseAccountPatch(body) {
  if (!isPlainObject(body)) return null;
  const out = {};
  if ('presets' in body) out.presets = sanitizeStore(body.presets);
  if ('settings' in body) {
    if (!isPlainObject(body.settings) || JSON.stringify(body.settings).length > MAX_SETTINGS_CHARS) return null;
    out.settings = body.settings;
  }
  return Object.keys(out).length ? out : null;
}

/** CSRF guard for state-changing account requests: the browser's Origin must name this host. */
export function sameOrigin(headers) {
  const origin = headers.get('origin');
  const host = (headers.get('x-forwarded-host') ?? headers.get('host') ?? '').split(',')[0].trim().toLowerCase();
  if (!origin || !host) return false;
  try { return new URL(origin).host.toLowerCase() === host; } catch { return false; }
}

export const isJsonRequest = (headers) => (headers.get('content-type') ?? '').toLowerCase().startsWith('application/json');
