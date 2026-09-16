"use client";
import { HomeMode } from "../HomeMode";
import { PageData } from "./usePageData";
import type { ClientData } from "../../lib/client-model";
import type { BenchmarkMatrix } from "../../lib/benchmark-matrix.mjs";

export function HomeModeLoader({ version }: { version: string }) {
  return <PageData<{ data: ClientData; matrix: BenchmarkMatrix }> dataKey="home" version={version} label="Models and benchmarks">{(p) => <HomeMode data={p.data} matrix={p.matrix} />}</PageData>;
}
