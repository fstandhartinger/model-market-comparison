import type { PresetStore } from './presets.mjs';

export declare const ACCOUNT_MARKER_KEY: string;
export declare const SIGNIN_TOAST_KEY: string;
export declare const MAX_SETTINGS_CHARS: number;
export declare const MAX_BODY_CHARS: number;
export declare function planPresetSync(input: { account: unknown; local: unknown; syncedUid: string | null; uid: string }): { presets: PresetStore; push: boolean };
export declare function planSettingsSync(input: { accountSettings: unknown; localSettings: unknown }): { apply: Record<string, unknown> | null; push: boolean };
export declare function parseAccountPatch(body: unknown): { presets?: PresetStore; settings?: Record<string, unknown> } | null;
export declare function sameOrigin(headers: { get(name: string): string | null }): boolean;
export declare function isJsonRequest(headers: { get(name: string): string | null }): boolean;
