import { Pool } from "pg";
import type { Dataset, ModelRow } from "./types";

let pool: Pool | null = null;

export function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
    });
  }
  return pool;
}

/** Load the full dataset from Postgres. Returns null if not seeded. */
export async function loadFromDb(): Promise<Dataset | null> {
  const p = getPool();
  if (!p) return null;
  const meta = await p.query("SELECT generated_at, counts, sources, providers FROM dataset_meta ORDER BY id DESC LIMIT 1");
  if (!meta.rows.length) return null;
  const offers = await p.query("SELECT family_key, data FROM offers");
  const offersByFamily = new Map<string, ModelRow["offers"]>();
  for (const r of offers.rows) {
    if (!offersByFamily.has(r.family_key)) offersByFamily.set(r.family_key, []);
    offersByFamily.get(r.family_key)!.push(r.data);
  }
  const models = await p.query("SELECT data FROM models");
  const modelRows: ModelRow[] = models.rows.map((r) => {
    const m = r.data as ModelRow;
    m.offers = offersByFamily.get(m.family_key) || [];
    return m;
  });
  const m0 = meta.rows[0];
  return {
    generated_at: m0.generated_at,
    counts: m0.counts,
    sources: m0.sources,
    providers: m0.providers,
    models: modelRows,
  };
}
