export type CompanyUse = "allowed" | "not_allowed" | "unclear";

export interface SubscriptionVendor {
  name: string;
  consumer_company_use: CompanyUse;
  quote: string | null;
  quote_note?: string;
  terms_url: string;
  pricing_url: string;
  pricing_checked_at?: string;
  pricing_source_sha256?: string;
  pricing_evidence_receipt_sha256?: string;
  pro_pricing_url?: string;
}

export interface SubscriptionPlan {
  id: string;
  vendor: string;
  org: string | null;
  name: string;
  audience: "individual" | "business";
  usd_per_month: number | null;
  price_is_from: boolean;
  billing_note: string | null;
  flat_rate: boolean;
  included: string;
  source_checked_at?: string;
  source_url?: string;
  source_sha256?: string;
  source_receipts?: Array<{ url: string; locator?: string; source_sha256?: string; evidence_receipt_sha256?: string }>;
}

export interface SubscriptionCatalog {
  schema_version: number;
  retrieved_at: string;
  method: string;
  vendors: Record<string, SubscriptionVendor>;
  plans: SubscriptionPlan[];
}

export interface SubscriptionRow { id: string; name: string; org: string; score: number | null; cost: number | null }

export interface SubscriptionViewPlan extends SubscriptionPlan {
  company_use: CompanyUse;
  reference: { id: string; name: string; cost: number } | null;
  breakEvenTasks: number | null;
}

export const COMPANY_USE: CompanyUse[];
export function validateCatalog(catalog: SubscriptionCatalog): string[];
export function companyUse(catalog: SubscriptionCatalog, plan: SubscriptionPlan): CompanyUse;
export function subscriptionEstimate(input: { usdPerMonth: number; extraUsd?: number; tasksPerMonth: number }): number | null;
export function estimablePlans<T extends SubscriptionPlan>(plans: T[]): T[];
export function subscriptionView(
  catalog: SubscriptionCatalog,
  opts?: { isCompany?: boolean; rows?: SubscriptionRow[] },
): { plans: SubscriptionViewPlan[]; hiddenForCompany: number; retrieved_at: string };
