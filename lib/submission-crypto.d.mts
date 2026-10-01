import type { KeyObject } from 'node:crypto';
export function parsePublicKey(pem: unknown): KeyObject | null;
export function encryptApiKey(plaintext: string, pem: string | undefined | null): string;
