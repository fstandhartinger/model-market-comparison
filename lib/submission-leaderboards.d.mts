import type { FollowupOption } from './submission-shared.mjs';
export function followupOptionsFromData(data?: { jevbench?: any; imagejevbench?: any; audiojevbench?: any }): FollowupOption[];
export function followupOptions(root?: string): Promise<FollowupOption[]>;
