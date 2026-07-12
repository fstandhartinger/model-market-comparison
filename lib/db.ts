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
  const models = await p.query("SELECT data FROM models");
  const storedModels = models.rows.map((r) => r.data as ModelRow & { offers_scope?: string });
  // Legacy seeds stored only a family-wide offer union. Reattaching that union
  // here would leak a sibling model's provider/region/SKU into every variant.
  // Return null so getDataset() safely uses the bundled exact-model snapshot
  // until the normal deployment seed upgrades the database.
  if (storedModels.some((model) => model.offers_scope !== "model")) {
    console.warn("[data] Legacy DB seed has family-scoped offers; using bundled exact-model snapshot until reseeded");
    return null;
  }
  const modelRows: ModelRow[] = storedModels.map(({ offers_scope: _scope, ...model }) => model);
  const m0 = meta.rows[0];
  return {
    generated_at: m0.generated_at,
    counts: m0.counts,
    sources: m0.sources,
    providers: m0.providers,
    models: modelRows,
  };
}
