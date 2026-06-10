import crypto from "crypto";
import ApiError from "../../app/error/ApiError";
import httpStatus from "http-status";

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16; // 128-bit auth tag
const KEY_LENGTH = 32; // 256-bit key

// ─────────────────────────────────────────────
//  Key derivation  (PBKDF2 → 32-byte key)
// ─────────────────────────────────────────────
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100_000, KEY_LENGTH, "sha256");
}

// ─────────────────────────────────────────────
//  Low-level: encrypt a UTF-8 string
//  Returns  "salt:iv:tag:ciphertext"  (all hex)
// ─────────────────────────────────────────────
function encryptString(plain: string, secret: string): string {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(secret, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    salt.toString("hex"),
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

// ─────────────────────────────────────────────
//  Low-level: decrypt  "salt:iv:tag:ciphertext"
//
//  Compatible with both:
//    - Node.js encryptString() above
//    - Web Crypto (browser) frontend
//
//  The Web Crypto subtle.encrypt() appends the tag at the END of
//  the ciphertext buffer. The frontend splits them before encoding,
//  so the token format "salt:iv:tag:ciphertext" is the same.
//  Node.js setAuthTag() must be called BEFORE decipher.update/final.
// ─────────────────────────────────────────────
function decryptString(token: string, secret: string): string {
  const parts = token.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted token format.");
  }

  const [saltHex, ivHex, tagHex, cipherHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(cipherHex, "hex");

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
  }
  if (tag.length !== TAG_LENGTH) {
    throw new Error(`Invalid tag length: expected ${TAG_LENGTH}, got ${tag.length}`);
  }

  const key = deriveKey(secret, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  // ✅ Must call setAuthTag BEFORE update/final
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export type Payload =
  | Record<string, unknown>           // plain object
  | Record<string, unknown>[]         // array of objects
  | unknown[];                        // any array

export interface EncryptResult {
  encrypted: string;
  type: "object" | "array";
}

export interface DecryptResult {
  decrypted: Payload;
  type: "object" | "array";
}

/**
 * encrypt()
 *
 * Accepts:
 *   - a plain object   → encrypts the whole JSON
 *   - an array (any)   → encrypts the whole JSON
 *
 * Returns a single opaque `encrypted` string + original `type` hint.
 */
export function encrypt(payload: Payload, secret: string): EncryptResult {
  if (!secret || secret.length < 8) {
    throw new ApiError(httpStatus.NOT_EXTENDED, "Secret key must be at least 8 characters.", "");
  }

  const type: "object" | "array" = Array.isArray(payload) ? "array" : "object";
  const json = JSON.stringify(payload);
  const encrypted = encryptString(json, secret);

  return { encrypted, type };
}

/**
 * decrypt()
 *
 * Accepts the `encrypted` string produced by encrypt() or the browser
 * Web Crypto frontend (same "salt:iv:tag:ciphertext" hex format).
 * Returns the original payload + its type.
 */
export function decrypt(encrypted: string, secret: string): DecryptResult {
  if (!secret || secret.length < 8) {
    throw new ApiError(httpStatus.NOT_EXTENDED, "Secret key must be at least 8 characters.", "");
  }

  const json = decryptString(encrypted, secret);
  const parsed: Payload = JSON.parse(json) as Payload;
  const type: "object" | "array" = Array.isArray(parsed) ? "array" : "object";

  return { decrypted: parsed, type };
}