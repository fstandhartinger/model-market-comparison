export const FREE_ROUTE_NOTE: string;
export function isFreeRoute(offer: { or_model_id?: string | null; input_per_1m?: number | null; output_per_1m?: number | null } | null | undefined): boolean;
export function paidRoutes<T extends { or_model_id?: string | null; input_per_1m?: number | null; output_per_1m?: number | null }>(offers: readonly T[] | null | undefined): T[];
