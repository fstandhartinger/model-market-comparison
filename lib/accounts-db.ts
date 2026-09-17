import { Pool } from "pg";
import { ACCOUNTS_SCHEMA_SQL } from "./accounts-schema.mjs";

// CR-5.2: accounts live in their own database. DATABASE_URL stays the optional *dataset* database —
// setting it would switch the whole catalog to Postgres mode (lib/data.ts), so it is never reused here.
let pool: Pool | null = null;
let ready: Promise<unknown> | null = null;

export const privateHost = (host: string) =>
  host === "localhost" || host === "127.0.0.1" || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);

function accountsPool(): Pool | null {
  const url = process.env.ACCOUNTS_DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl: privateHost(new URL(url).hostname) ? false : { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

async function db(): Promise<Pool> {
  const p = accountsPool();
  if (!p) throw new Error("Accounts database is not configured");
  // The schema is idempotent (CREATE … IF NOT EXISTS); run it once per process.
  ready ??= p.query(ACCOUNTS_SCHEMA_SQL).catch((e) => { ready = null; throw e; });
  await ready;
  return p;
}

export async function upsertGoogleUser(u: { sub: string; email: string; name: string | null; image: string | null }): Promise<string> {
  const p = await db();
  const r = await p.query(
    `INSERT INTO bh_users (google_sub, email, name, image) VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_sub) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, image = EXCLUDED.image, last_sign_in_at = now()
     RETURNING id`,
    [u.sub, u.email, u.name, u.image],
  );
  return r.rows[0].id as string;
}

export interface AccountRow { email: string; name: string | null; image: string | null; presets: unknown; settings: unknown; updated_at: string | null }

export async function loadAccount(id: string): Promise<AccountRow | null> {
  const p = await db();
  const r = await p.query(
    `SELECT u.email, u.name, u.image, d.presets, d.settings, d.updated_at
     FROM bh_users u LEFT JOIN bh_user_data d ON d.user_id = u.id WHERE u.id = $1`,
    [id],
  );
  return (r.rows[0] as AccountRow | undefined) ?? null;
}

/** Returns false when the account no longer exists (deleted in another browser). */
export async function saveAccountData(id: string, patch: { presets?: unknown; settings?: unknown }): Promise<boolean> {
  const p = await db();
  try {
    await p.query(
      `INSERT INTO bh_user_data (user_id, presets, settings) VALUES ($1, COALESCE($2::jsonb, '{}'::jsonb), $3::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET presets = COALESCE($2::jsonb, bh_user_data.presets),
         settings = COALESCE($3::jsonb, bh_user_data.settings), updated_at = now()`,
      [id, patch.presets === undefined ? null : JSON.stringify(patch.presets), patch.settings === undefined ? null : JSON.stringify(patch.settings)],
    );
    return true;
  } catch (e) {
    if ((e as { code?: string }).code === "23503") return false; // foreign key: no such user
    throw e;
  }
}

/** CR-5.5: removes the user row; presets and settings go with it (ON DELETE CASCADE). */
export async function deleteAccount(id: string): Promise<void> {
  const p = await db();
  await p.query("DELETE FROM bh_users WHERE id = $1", [id]);
}

export async function accountsReachable(): Promise<boolean> {
  try { await db(); return true; } catch { return false; }
}
