#!/usr/bin/env node
// CR-9.1: one entry point for the change request's test list (04-CR-BRIEF.md, CR-9.1).
//   Unit:  data-bar normalisation and direction, winner logic, category assignment (benchmark-matrix),
//          preset CRUD and local→account merge (presets, account-sync), pick-from-chart (pick-chart), auth routes.
//   E2E:   open tab → default top 5; change selection three ways (×/+ · pick from chart · presets);
//          signed-out save → toast; share-URL round trip.
// Usage: verify-cr-e2e.mjs [host ...] [--out <dir>] [--unit-only]
// Hosts default to both public hosts. Live scripts run one after another (never in parallel: the CLS check needs
// an idle box). Writes summary.json into --out; exit code 1 when any unit test or live check fails.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "../../..");
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, 2)[1]; };
const stamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15) + "Z";
const out = flag("--out") ?? `/opt/benchmarkheaven/state/ux-evidence/cr-e2e-${stamp}`;
const unitOnly = args.includes("--unit-only");
const hosts = args.filter((a) => !a.startsWith("--"));
if (hosts.length === 0) hosts.push("https://benchmarkheaven.com", "https://model-market-comparison.app.mintapis.com");

// account-sync also holds the auth-route checks (callback origin allowlist, same-origin writes).
const UNIT = ["benchmark-matrix", "presets", "account-sync", "pick-chart"].map((n) => `test/${n}.test.mjs`);
const LIVE = [
  { script: "verify-cr-1.mjs", covers: "open tab → default top 5 by score; × removes and + type-ahead adds a column (selection way 1)" },
  { script: "verify-cr-2-2.mjs", covers: "pick from chart: sliders narrow candidates, tapping a point adds/removes a model (selection way 2)" },
  { script: "verify-cr-presets.mjs", covers: "model, row and filter presets: ours + custom save/rename/delete (selection way 3)" },
  { script: "verify-cr-5.mjs", covers: "signed-out custom preset save → sign-in toast; account pages; signed-in sync when SESSION_SECRET and ACCOUNTS_DATABASE_URL are set" },
  { script: "verify-cr-2-5-perf.mjs", covers: "share-URL round trip (models, rows, filters) and load CLS" },
];

const run = (cmd, argv, cwd) => new Promise((resolve) => {
  const child = spawn(cmd, argv, { cwd, env: process.env });
  let text = "";
  child.stdout.on("data", (d) => { text += d; process.stdout.write(d); });
  child.stderr.on("data", (d) => { text += d; process.stderr.write(d); });
  child.on("close", (code) => resolve({ code, text }));
});

await mkdir(out, { recursive: true });
const summary = { started_at: new Date().toISOString(), hosts, unit: null, live: [] };

const unit = await run(process.execPath, ["--test", ...UNIT], repo);
const count = (re) => Number(re.exec(unit.text)?.[1] ?? NaN);
summary.unit = { files: UNIT, tests: count(/ℹ tests (\d+)/), pass: count(/ℹ pass (\d+)/), fail: count(/ℹ fail (\d+)/), ok: unit.code === 0 };

if (!unitOnly) {
  for (const host of hosts) {
    const name = new URL(host).hostname === "benchmarkheaven.com" ? "canonical" : "legacy";
    for (const { script, covers } of LIVE) {
      const dir = join(out, name, script.replace(/\.mjs$/, ""));
      console.log(`\n=== ${name} ${script}`);
      const r = await run(process.execPath, [join(here, script), host, dir], repo);
      const m = [...r.text.matchAll(/^(\d+)\/(\d+)\s*$/gm)].pop();
      const passed = m ? Number(m[1]) : 0, total = m ? Number(m[2]) : 0;
      summary.live.push({ host, script, covers, passed, total, ok: r.code === 0 && total > 0 && passed === total, exit: r.code, evidence: dir });
    }
  }
}

summary.finished_at = new Date().toISOString();
summary.ok = summary.unit.ok && summary.live.every((l) => l.ok);
await writeFile(join(out, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(`\nunit ${summary.unit.pass}/${summary.unit.tests} (${summary.unit.files.length} files)`);
for (const l of summary.live) console.log(`${l.ok ? "PASS" : "FAIL"} ${new URL(l.host).hostname} ${l.script} ${l.passed}/${l.total}`);
console.log(`${summary.ok ? "ALL PASS" : "FAILURES"} → ${join(out, "summary.json")}`);
process.exitCode = summary.ok ? 0 : 1;
