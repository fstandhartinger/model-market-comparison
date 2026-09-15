export type RegionBucket = 'China' | 'EU' | 'US' | 'Other';
export declare const REGION_BUCKETS: readonly RegionBucket[];
export declare function countryBucket(country: string | null | undefined): RegionBucket;
export declare function hostingBucket(offer: { region?: string | null } | null | undefined, euHosted: boolean): RegionBucket;
export declare function regionStateFromLegacy(s?: { euHostedOnly?: boolean; excludeChinese?: boolean; nonUsOnly?: boolean }): { hostedIn: RegionBucket[]; providerBasedIn: RegionBucket[]; labBasedIn: RegionBucket[] };
export declare function allRegions(list: readonly string[] | null | undefined): boolean;
