import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

// 9 Oct 2026 (self-heal 2026-10-09-a1): AA added "GPT-6 Sol (Daybreak Blue, max)" next to "GPT-6 Sol (Max)".
// The whole parenthetical was dropped because it names an effort, so both rows became gpt-6-sol::max and the
// daily build stopped with "Artificial Analysis normalization collision". The SKU part must stay identity;
// provenance notes such as "Default Fallback" must not split a family.
const root = fileURLToPath(new URL("..", import.meta.url));

test("an AA SKU named inside an effort annotation gets its own family instead of colliding", { timeout: 300_000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), "bh-aa-annotation-"));
  try {
    // Scripts and lib are copied (they resolve data/ from their own location); every other input is a read-only
    // symlink, except the two files this test writes: the AA snapshot it extends and the dataset the build emits.
    const linkAllBut = async (from, to, own) => {
      await mkdir(to, { recursive: true });
      for (const name of await readdir(from)) if (!own.includes(name)) await symlink(join(from, name), join(to, name));
    };
    await linkAllBut(root, dir, ["scripts", "lib", "data", ".git"]);
    for (const sub of ["scripts", "lib"]) await cp(join(root, sub), join(dir, sub), { recursive: true });
    await linkAllBut(join(root, "data"), join(dir, "data"), ["raw", "dataset.json"]);
    await linkAllBut(join(root, "data", "raw"), join(dir, "data", "raw"), ["artificialanalysis.json"]);
    await cp(join(root, "data", "dataset.json"), join(dir, "data", "dataset.json"));
    await cp(join(root, "data", "raw", "artificialanalysis.json"), join(dir, "data", "raw", "artificialanalysis.json"));
    const aaPath = join(dir, "data", "raw", "artificialanalysis.json");
    const aa = JSON.parse(await readFile(aaPath, "utf8"));
    const template = aa.models.find((m) => m.metadata && !m.metadata.openrouter_api_id && m.model_creator?.name === "OpenAI");
    assert.ok(template, "no OpenAI AA row without an OpenRouter id to clone");
    const clone = (id, name) => ({ ...structuredClone(template), id, name, slug: id,
      metadata: { ...structuredClone(template.metadata), openrouter_api_id: null } });
    aa.models.push(clone("00000000-0000-4000-8000-00000000a001", "Regression Sol 9 (Max)"),
      clone("00000000-0000-4000-8000-00000000a002", "Regression Sol 9 (Daybreak Blue, max)"));
    aa.count = aa.models.length;
    await writeFile(aaPath, JSON.stringify(aa));

    await promisify(execFile)(process.execPath, ["scripts/build-dataset.mjs"], { cwd: dir, maxBuffer: 64 * 1024 * 1024 });
    const ds = JSON.parse(await readFile(join(dir, "data", "dataset.json"), "utf8"));
    const byAa = new Map(ds.models.filter((m) => m.aa_model_id).map((m) => [m.aa_model_id, m]));
    assert.equal(byAa.get("00000000-0000-4000-8000-00000000a001")?.id, "regression-sol-9::max");
    assert.equal(byAa.get("00000000-0000-4000-8000-00000000a002")?.id, "regression-sol-9-daybreak-blue::max");

    // Provenance notes stay out of the identity: every "(…, Default Fallback)" row keeps its plain family.
    const fallbacks = aa.models.filter((m) => /Default Fallback\)$/.test(m.name));
    assert.ok(fallbacks.length, "bundled AA snapshot no longer has a Default Fallback row to check");
    for (const m of fallbacks) {
      const row = byAa.get(m.id);
      assert.ok(row, m.name);
      assert.ok(!/fallback/.test(row.family_key), `${m.name} → ${row.family_key}`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
