"use client";
import { ProviderExplorer } from "../ProviderExplorer";
import { PageData } from "./usePageData";
import type { ClientData } from "../../lib/client-model";

export function ProviderExplorerLoader({ version }: { version: string }) {
  return <PageData<ClientData> dataKey="catalog" version={version} label="Provider explorer">{(data) => <ProviderExplorer data={data} />}</PageData>;
}
