export interface ProviderCatalogEntry { platform: string; provider: string }
export interface ProviderCompany {
  key: string; keys: string[]; label: string; sub?: string; routes: string[]; names: string[]; search: string;
}
export const PROVIDER_COMPANY_BY_KEY: Record<string, string>;
export function providerKeyOf(p: ProviderCatalogEntry): string;
export function providerCompanyName(p: ProviderCatalogEntry): string;
export function providerRouteLabel(p: ProviderCatalogEntry): string;
export function providerCompanies<T extends ProviderCatalogEntry>(providers: T[]): ProviderCompany[];
