"use client";
import { ChartsBoard } from "../ChartsBoard";
import { PageData } from "./usePageData";
import type { ClientData } from "../../lib/client-model";

export function ChartsBoardLoader({ version }: { version: string }) {
  return <PageData<ClientData> dataKey="catalog" version={version} label="Charts">{(data) => <ChartsBoard data={data} />}</PageData>;
}
