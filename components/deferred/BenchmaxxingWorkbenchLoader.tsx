"use client";
import { BenchmaxxingWorkbench } from "../BenchmaxxingWorkbench";
import { PageData } from "./usePageData";

type Props = Parameters<typeof BenchmaxxingWorkbench>[0];
export function BenchmaxxingWorkbenchLoader({ version, minComparisons, minTopics }: { version: string; minComparisons: number; minTopics: number }) {
  return <PageData<Pick<Props, "rows" | "models" | "initial" | "taggedCount">> dataKey="benchmaxxing" version={version} label="Benchmaxxing analysis">{(p) => <BenchmaxxingWorkbench {...p} minComparisons={minComparisons} minTopics={minTopics} />}</PageData>;
}
