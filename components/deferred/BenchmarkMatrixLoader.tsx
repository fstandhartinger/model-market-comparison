"use client";
import { BenchmarkMatrix } from "../BenchmarkMatrix";
import { PageData } from "./usePageData";

type Props = Parameters<typeof BenchmarkMatrix>[0];
export function BenchmarkMatrixLoader({ version, initial }: { version: string; initial: Props["initial"] }) {
  return <PageData<Pick<Props, "matrix" | "filterData">> dataKey="benchmarks" version={version} label="Benchmark comparison">{(p) => <BenchmarkMatrix matrix={p.matrix} filterData={p.filterData} initial={initial} />}</PageData>;
}
