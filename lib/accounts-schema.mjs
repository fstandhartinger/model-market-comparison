// CR-5.2: the runtime copy of db/accounts/001_init.sql (the standalone build does not ship the .sql
// file). test/account-sync.test.mjs asserts both stay identical.
export const ACCOUNTS_SCHEMA_SQL = `-- CR-5.2: Benchmark Heaven accounts. Kept in its own database (ACCOUNTS_DATABASE_URL), apart from the
-- optional dataset database (DATABASE_URL). CR-5.5: only the Google account id, email, name and
-- avatar URL are stored about a person, plus their saved presets and settings.
CREATE TABLE IF NOT EXISTS bh_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub text NOT NULL UNIQUE,
  email text NOT NULL,
  name text,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_sign_in_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bh_user_data (
  user_id uuid PRIMARY KEY REFERENCES bh_users(id) ON DELETE CASCADE,
  presets jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;
