import ApiError from "../../app/error/ApiError";
import httpStatus from "http-status";

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;      
const SALT_LENGTH = 16;    
const KEY_LENGTH = 256;    
const PBKDF2_ITERATIONS = 100_000;

// ─────────────────────────────────────────────
//  Helpers: Hex conversions (replaces Buffer)
// ─────────────────────────────────────────────
function bufToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const view = new Uint8Array(hex.length / 2);
  for (let i = 0; i < view.length; i++) {
    view[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return view;
}


async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const secretBuffer = enc.encode(secret);

  // Import the raw password material
  const baseKey = await globalThis.crypto.subtle.importKey(
    "raw",
    secretBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Derive the actual AES-GCM key
  return await globalThis.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer, // Fixed: Cast to explicit ArrayBuffer
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

// ─────────────────────────────────────────────
//  Low-level: Encrypt UTF-8 String
//  Returns: "salt:iv:ciphertext+tag" (all hex)
// ─────────────────────────────────────────────
async function encryptString(plain: string, secret: string): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(secret, salt);

  const enc = new TextEncoder();
  const encodedPlain = enc.encode(plain);

  // Web Crypto automatically appends the Auth Tag to the end of the ciphertext
  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv.buffer as ArrayBuffer, // Fixed: Cast to explicit ArrayBuffer
    },
    key,
    encodedPlain.buffer as ArrayBuffer // Fixed: Cast to explicit ArrayBuffer
  );

  return [
    bufToHex(salt),
    bufToHex(iv),
    bufToHex(new Uint8Array(encryptedBuffer)),
  ].join(":");
}

// ─────────────────────────────────────────────
//  Low-level: Decrypt "salt:iv:ciphertext+tag"
// ─────────────────────────────────────────────
async function decryptString(token: string, secret: string): Promise<string> {
  const parts = token.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format.");
  }

  const [saltHex, ivHex, cipherHex] = parts;
  const salt = hexToBuf(saltHex);
  const iv = hexToBuf(ivHex);
  const ciphertextWithTag = hexToBuf(cipherHex);

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
  }

  const key = await deriveKey(secret, salt);

  const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv.buffer as ArrayBuffer, // Fixed: Cast to explicit ArrayBuffer
    },
    key,
    ciphertextWithTag.buffer as ArrayBuffer // Fixed: Cast to explicit ArrayBuffer
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

// ─────────────────────────────────────────────
//  Exported Types & Interfaces
// ─────────────────────────────────────────────
export type Payload =
  | Record<string, unknown>
  | Record<string, unknown>[]
  | unknown[];

export interface EncryptResult {
  encrypted: string;
  type: "object" | "array";
}

export interface DecryptResult {
  decrypted: Payload;
  type: "object" | "array";
}

// ─────────────────────────────────────────────
//  High-level Exports
// ─────────────────────────────────────────────
export async function encrypt(payload: Payload, secret: string): Promise<EncryptResult> {
  if (!secret || secret.length < 8) {
    throw new ApiError(httpStatus.NOT_EXTENDED, "Secret key must be at least 8 characters.", "");
  }

  const type: "object" | "array" = Array.isArray(payload) ? "array" : "object";
  const json = JSON.stringify(payload);
  const encrypted = await encryptString(json, secret);

  return { encrypted, type };
}

export async function decrypt(encrypted: string, secret: string): Promise<DecryptResult> {
  if (!secret || secret.length < 8) {
    throw new ApiError(httpStatus.NOT_EXTENDED, "Secret key must be at least 8 characters.", "");
  }

  const json = await decryptString(encrypted, secret);
  const parsed = JSON.parse(json) as Payload;
  const type: "object" | "array" = Array.isArray(parsed) ? "array" : "object";

  return { decrypted: parsed, type };
}