/**
 * Authenticated symmetric encryption for channel credentials at rest (RULES 第4条).
 *
 * AES-256-GCM: confidentiality + integrity (tampering is detected on decrypt). The
 * key never lives in code — it is loaded from CREDENTIAL_ENCRYPTION_KEY (base64, 32
 * bytes). Encoded format: "v1:<iv>:<authTag>:<ciphertext>" (each part base64).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const VERSION = "v1";

/** Decode + validate a base64 key into a 32-byte buffer. */
export function loadKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(`encryption key must decode to ${KEY_BYTES} bytes (got ${key.length})`);
  }
  return key;
}

/**
 * @param aad Additional authenticated data bound to the ciphertext (not encrypted,
 *   but integrity-protected). Decryption MUST supply the same aad or it fails —
 *   used to bind a credential blob to its owning tenant/channel/name.
 */
export function encryptSecret(plaintext: string, key: Buffer, aad?: string): string {
  if (key.length !== KEY_BYTES) {
    throw new Error(`encryption key must be ${KEY_BYTES} bytes`);
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  if (aad !== undefined) cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(encoded: string, key: Buffer, aad?: string): string {
  const parts = encoded.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("malformed or unsupported ciphertext");
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  if (aad !== undefined) decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
