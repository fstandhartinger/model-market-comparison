export const ANALYTICS_STATIC_PATHS: ReadonlySet<string>;

export interface AnalyticsPrivacyContext {
  origin: string;
  fallbackUrl?: string;
  modelIds: ReadonlySet<string>;
  modelFamilyIds?: ReadonlySet<string>;
  jevSystemIds: ReadonlySet<string>;
}

export function sanitizeAnalyticsPayload(
  payload: Record<string, unknown>,
  context: AnalyticsPrivacyContext,
): Record<string, unknown> | false;
