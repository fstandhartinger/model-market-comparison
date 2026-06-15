#!/usr/bin/env node
// Create schema and load data/dataset.json into Postgres (idempotent).
// Usage: DATABASE_URL=postgres://... node scripts/seed-db.mjs
import pg from "pg";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATASET = join(__dirname, "..", "data", "dataset.json");

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is required"); process.exit(1); }

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS dataset_meta (
  id SERIAL PRIMARY KEY,
  generated_at TIMESTAMPTZ NOT NULL,
  counts JSONB NOT NULL,
  sources JSONB NOT NULL,
  providers JSONB NOT NULL,
  loaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  family_key TEXT NOT NULL,
  org TEXT,
  featured BOOLEAN DEFAULT false,
  has_benchmark BOOLEAN DEFAULT false,
  has_pricing BOOLEAN DEFAULT false,
  data JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS models_family_idx ON models(family_key);
CREATE INDEX IF NOT EXISTS models_featured_idx ON models(featured);
CREATE TABLE IF NOT EXISTS offers (
  id SERIAL PRIMARY KEY,
  family_key TEXT NOT NULL,
  platform TEXT,
  provider TEXT,
  data JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS offers_family_idx ON offers(family_key);
`;

async function main() {
  const ds = JSON.parse(await readFile(DATASET, "utf8"));
  const client = await pool.connect();
  try {
    await client.query(SCHEMA);
    // Skip if already seeded with this exact snapshot (keeps cold starts fast).
    if (process.env.FORCE_SEED !== "1") {
      const existing = await client.query("SELECT generated_at FROM dataset_meta ORDER BY id DESC LIMIT 1");
      if (existing.rows.length && new Date(existing.rows[0].generated_at).getTime() === new Date(ds.generated_at).getTime()) {
        console.log("✓ already seeded with current snapshot — skipping");
        return;
      }
    }
    await client.query("BEGIN");
    await client.query("TRUNCATE models, offers, dataset_meta RESTART IDENTITY");

    await client.query(
      "INSERT INTO dataset_meta (generated_at, counts, sources, providers) VALUES ($1,$2,$3,$4)",
      [ds.generated_at, ds.counts, ds.sources, JSON.stringify(ds.providers)]
    );

    for (const m of ds.models) {
      const { offers, ...rest } = m;
      await client.query(
        "INSERT INTO models (id, family_key, org, featured, has_benchmark, has_pricing, data) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [m.id, m.family_key, m.org, !!m.featured, !!m.has_benchmark, !!m.has_pricing, { ...rest, offers: [] }]
      );
    }

    // offers are family-level — store one set per family
    const seen = new Set();
    for (const m of ds.models) {
      if (seen.has(m.family_key)) continue;
      seen.add(m.family_key);
      for (const o of m.offers || []) {
        await client.query(
          "INSERT INTO offers (family_key, platform, provider, data) VALUES ($1,$2,$3,$4)",
          [m.family_key, o.platform, o.provider, o]
        );
      }
    }

    await client.query("COMMIT");
    console.log(`✓ seeded ${ds.models.length} models, ${seen.size} families`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
