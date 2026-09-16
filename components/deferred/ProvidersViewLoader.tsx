"use client";
import { ProvidersView } from "../ProvidersView";
import { PageData } from "./usePageData";
import type { ClientData } from "../../lib/client-model";

export function ProvidersViewLoader({ version }: { version: string }) {
  return <PageData<ClientData> dataKey="catalog" version={version} label="Providers">{(data) => <ProvidersView data={data} />}</PageData>;
}
