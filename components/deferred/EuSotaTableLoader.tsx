"use client";
import { EuSotaTable } from "../EuSotaTable";
import { PageData } from "./usePageData";
import type { ClientData } from "../../lib/client-model";

type Entries = Parameters<typeof EuSotaTable>[0]["entries"];
export function EuSotaTableLoader({ version, entries }: { version: string; entries: Entries }) {
  return <PageData<ClientData> dataKey="catalog" version={version} label="EU hosting table">{(data) => <EuSotaTable data={data} entries={entries} />}</PageData>;
}
