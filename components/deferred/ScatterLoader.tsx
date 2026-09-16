"use client";
import { CostCapabilityScatter } from "../CostCapabilityScatter";
import { PageData } from "./usePageData";
import type { ClientData } from "../../lib/client-model";

export function ScatterLoader({ version }: { version: string }) {
  return <PageData<ClientData> dataKey="catalog" version={version} label="Chart">{(data) => <CostCapabilityScatter data={data} />}</PageData>;
}
