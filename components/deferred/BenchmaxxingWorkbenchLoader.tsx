"use client";
import { BenchmaxxingWorkbench } from "../BenchmaxxingWorkbench";
import { PageData } from "./usePageData";

type Props = Parameters<typeof BenchmaxxingWorkbench>[0];
export function BenchmaxxingWorkbenchLoader({ version, minComparisons, tagMinComparisons, minTopics }: { version: string; minComparisons: number; tagMinComparisons: number; minTopics: number }) {
  return <PageData<Pick<Props, "rows" | "models" | "initial" | "levelCounts" | "uncertainCount" | "tagAverage">> dataKey="benchmaxxing" version={version} label="Benchmaxxing analysis">{(p) => <BenchmaxxingWorkbench {...p} minComparisons={minComparisons} tagMinComparisons={tagMinComparisons} minTopics={minTopics} />}</PageData>;
}
