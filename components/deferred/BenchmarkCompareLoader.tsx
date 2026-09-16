"use client";
import { BenchmarkCompare } from "../BenchmarkCompare";
import { PageData } from "./usePageData";

type Props = Parameters<typeof BenchmarkCompare>[0];
export function BenchmarkCompareLoader({ version, standalone = false }: { version: string; standalone?: boolean }) {
  return <PageData<Pick<Props, "initialView" | "initialPicks">> dataKey="compare" version={version} label="Comparison">{(p) => <BenchmarkCompare initialView={p.initialView} initialPicks={p.initialPicks} standalone={standalone} />}</PageData>;
}
