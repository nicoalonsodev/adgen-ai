/**
 * AES-256-GCM encryption utilities for storing sensitive values (e.g. API keys) in the DB.
 *
 * Storage format: '<iv_hex>:<authTag_hex>:<ciphertext_hex>'
 *   - iv:       12 random bytes (96-bit), unique per encryption
 *   - authTag:  16 bytes GCM authentication tag (tamper detection)
 *   - ciphertext: encrypted payload, same length as plaintext
 *
 * Generate a key with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Set it as ENCRYPTION_KEY in your .env (must be exactly 64 hex characters = 32 bytes).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

function getMasterKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  if (raw.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes), got ${raw.length}. ` +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(raw, "hex");
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a string in the format '<iv_hex>:<authTag_hex>:<ciphertext_hex>'.
 */
export function encryptValue(plaintext: string): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a value produced by encryptValue().
 * Expects the format '<iv_hex>:<authTag_hex>:<ciphertext_hex>'.
 * Throws if the format is invalid or the authentication tag does not match (tampered data).
 */
export function decryptValue(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 3) {
    throw new Error(
      `Invalid encrypted value format. Expected '<iv_hex>:<authTag_hex>:<ciphertext_hex>', got ${parts.length} segment(s).`
    );
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;

  if (ivHex.length !== IV_BYTES * 2) {
    throw new Error(`Invalid IV length: expected ${IV_BYTES * 2} hex chars, got ${ivHex.length}.`);
  }
  if (authTagHex.length !== AUTH_TAG_BYTES * 2) {
    throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_BYTES * 2} hex chars, got ${authTagHex.length}.`);
  }

  const key = getMasterKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Returns a masked version of a key string showing only the last N characters.
 * Example: maskKey('sk-abcdefghij1234567890', 8) → '...67890'
 *
 * Useful for logging API keys without exposing the full value.
 */
export function maskKey(key: string, visibleChars = 8): string {
  if (key.length <= visibleChars) return "...";
  return `...${key.slice(-visibleChars)}`;
}
