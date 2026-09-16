"use client";
import { BenchmarkRanking } from "../BenchmarkRanking";
import { PageData } from "./usePageData";

type Props = Parameters<typeof BenchmarkRanking>[0];
export function BenchmarkRankingLoader({ version }: { version: string }) {
  return <PageData<Props> dataKey="ranking" version={version} label="Benchmark ranking">{(p) => <BenchmarkRanking initialView={p.initialView} axisList={p.axisList} />}</PageData>;
}
