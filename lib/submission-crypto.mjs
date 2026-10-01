// CR-251: the site only ever holds a PUBLIC key (env SUBMISSION_SECRET_PUBLIC_KEY). A submitted API key is sealed
// with a fresh AES-256-GCM key; that key is wrapped with RSA-OAEP (SHA-256). Only the Sandy CLI (and the test)
// hold the private key and can decrypt. There is deliberately no decrypt helper in app code.
import { constants, createCipheriv, createPublicKey, publicEncrypt, randomBytes } from 'node:crypto';

const b64u = (buf) => Buffer.from(buf).toString('base64url');

/** Accepts a PEM with real newlines or with literal "\n" sequences (typical for env vars). Returns a KeyObject or null. */
export function parsePublicKey(pem) {
  if (typeof pem !== 'string') return null;
  const text = pem.trim().replace(/^"|"$/g, '').replace(/\\r\\n|\\n|\\r/g, '\n');
  if (!/^-----BEGIN (?:RSA )?PUBLIC KEY-----/.test(text)) return null;
  try {
    const key = createPublicKey(text);
    if (key.asymmetricKeyType !== 'rsa') return null;
    if ((key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) return null;
    return key;
  } catch { return null; }
}

/** v1.<wrapped AES key>.<iv>.<tag>.<ciphertext>, every part base64url. Throws if the public key is unusable. */
export function encryptApiKey(plaintext, pem) {
  const publicKey = parsePublicKey(pem);
  if (!publicKey) throw new Error('submission public key unavailable');
  if (typeof plaintext !== 'string' || !plaintext) throw new Error('nothing to encrypt');
  const aesKey = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', aesKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const wrapped = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, aesKey);
  aesKey.fill(0);
  return ['v1', b64u(wrapped), b64u(iv), b64u(tag), b64u(ciphertext)].join('.');
}
