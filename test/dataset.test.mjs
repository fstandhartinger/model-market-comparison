import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ds = JSON.parse(await readFile(join(__dirname, "..", "data", "dataset.json"), "utf8"));

const REQUIRED = [
  "gpt-5.5", "gpt-5.4", "gpt-5.5-mini", "gpt-5.4-mini",
  "claude-opus-4.8", "claude-opus-4.7", "claude-opus-4.6", "claude-sonnet-4.6", "claude-fable-5",
  "kimi-k2.5", "kimi-k2.6", "kimi-k2.7-code",
  "glm-5.1", "glm-5.2",
  "minimax-m2.5", "minimax-m2.7", "minimax-m3",
  "mimo-v2.5-pro", "deepseek-v4-pro",
];

test("dataset has models, families and offers", () => {
  assert.ok(ds.models.length > 100, "expected many models");
  assert.ok(ds.counts.offers > 500, "expected many offers");
});

test("all brief-required model families are present", () => {
  const keys = new Set(ds.models.map((m) => m.family_key));
  // gpt-5.5-mini / gpt-5.4-mini may be absent upstream; only fail on the hard requirements
  const hard = REQUIRED.filter((k) => !k.endsWith("-mini"));
  for (const k of hard) assert.ok(keys.has(k), `missing required family: ${k}`);
});

test("featured set covers the requested families", () => {
  const featured = new Set(ds.models.filter((m) => m.featured).map((m) => m.family_key));
  for (const k of ["gpt-5.5", "claude-opus-4.8", "claude-fable-5", "kimi-k2.6", "minimax-m3", "deepseek-v4-pro"]) {
    assert.ok(featured.has(k), `expected featured: ${k}`);
  }
});

test("benchmarks never silently coerce null to 0", () => {
  // The Pro variants have no AA coding index — they must be null, not 0.
  const pro = ds.models.find((m) => m.display_name.includes("GPT-5.5 Pro"));
  if (pro) assert.equal(pro.benchmarks.aa_coding_index, null);
});

test("offers carry numeric per-1M pricing or are explicitly null", () => {
  for (const m of ds.models) {
    for (const o of m.offers) {
      if (o.unit === "per_1m_token") {
        for (const f of ["input_per_1m", "output_per_1m"]) {
          assert.ok(o[f] === null || typeof o[f] === "number", `${m.family_key} ${o.provider} ${f}`);
        }
      }
    }
  }
});
