// CR-5.2: applies db/accounts/*.sql to ACCOUNTS_DATABASE_URL (idempotent). The app also runs the same
// schema on first use, so this is for provisioning and checks.
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const url = process.env.ACCOUNTS_DATABASE_URL;
if (!url) { console.error('ACCOUNTS_DATABASE_URL is not set'); process.exit(1); }
const dir = path.join(import.meta.dirname, '..', 'db', 'accounts');
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  for (const file of (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
    await client.query(await fs.readFile(path.join(dir, file), 'utf8'));
    console.log(`applied ${file}`);
  }
  const { rows } = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'bh_%' ORDER BY 1");
  console.log('tables:', rows.map((r) => r.table_name).join(', '));
} finally {
  await client.end();
}
