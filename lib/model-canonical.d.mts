export function findModel<T extends { id: string; family_key: string }>(models: T[], raw: string): T | undefined;
export function modelCanonicalPath<T extends { id: string; family_key: string }>(models: T[], model: T): string;
