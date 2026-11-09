import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseInceptronModelsPage } from "../lib/inceptron-catalog.mjs";

// 2026-11-09: www.inceptron.io/models still lists the models but the Input/Output/Cache-read slots are empty
// (also in the rendered DOM; the framercms payload holds no prices). The parser must fail closed, never invent prices.
test("price-less Inceptron models page fails closed", async () => {
  const html = await readFile(new URL("./fixtures/inceptron-models-page-2026-11-09-no-prices.html", import.meta.url), "utf8");
  assert.match(html, /Input tokens, 1M/);
  assert.throws(() => parseInceptronModelsPage(html), /no priced model cards/);
});
