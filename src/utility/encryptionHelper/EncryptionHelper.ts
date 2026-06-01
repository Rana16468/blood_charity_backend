/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           ChainLock™ Encryption Engine v1.0                  ║
 * ║   Hybrid: RSA-4096-OAEP + AES-256-GCM + HMAC-SHA512         ║
 * ║   + Pepper-XOR stream layer + Argon2-style key stretching    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Architecture:
 *   1. RSA-4096-OAEP  → wraps/unwraps the AES session key
 *   2. AES-256-GCM    → encrypts the actual payload (authenticated)
 *   3. HMAC-SHA512    → signs every request & response
 *   4. Pepper-XOR     → extra obfuscation layer on ciphertext
 *   5. PBKDF2 stretch → derives child AES keys from master + salt
 */

import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AESResult {
  iv: string;       // 16 bytes → hex
  tag: string;      // 16 bytes GCM auth-tag → hex
  data: string;     // ciphertext → hex
  salt: string;     // PBKDF2 salt → hex
}

// ─── 1. RSA-4096 Key Generation ───────────────────────────────────────────────

export const generateRSAKeys = (): { publicKey: string; privateKey: string } => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding:  { type: "pkcs1", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
  });
  return { publicKey: publicKey as string, privateKey: privateKey as string };
};

// ─── 2. PBKDF2 Key Stretch (prevents brute-force on captured AES keys) ────────

const stretchKey = (masterKey: Buffer, salt: Buffer): Buffer => {
  // 100 000 iterations of SHA-512 PBKDF2 → 32-byte child key
  return crypto.pbkdf2Sync(masterKey, salt, 100_000, 32, "sha512");
};

// ─── 3. Pepper-XOR stream (extra obfuscation layer) ──────────────────────────

const PEPPER = Buffer.from(
  process.env.CHAINLOCK_PEPPER ?? "ChainLock-Default-Pepper-Change-In-Prod-!!",
  "utf8"
);

const xorPepper = (data: Buffer): Buffer => {
  const out = Buffer.allocUnsafe(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ PEPPER[i % PEPPER.length];
  }
  return out;
};

// ─── 4. AES-256-GCM Encrypt ───────────────────────────────────────────────────

export const encryptAES = (plaintext: string, masterKey: Buffer): AESResult => {
  const iv   = crypto.randomBytes(16);   // 128-bit IV
  const salt = crypto.randomBytes(32);   // PBKDF2 salt
  const key  = stretchKey(masterKey, salt);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc    = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag    = cipher.getAuthTag();    // 128-bit GCM auth tag

  // Apply Pepper-XOR on ciphertext for extra layer
  const peppered = xorPepper(enc);

  return {
    iv:   iv.toString("hex"),
    tag:  tag.toString("hex"),
    data: peppered.toString("hex"),
    salt: salt.toString("hex"),
  };
};

// ─── 5. AES-256-GCM Decrypt ───────────────────────────────────────────────────

export const decryptAES = (
  encHex: string,
  ivHex: string,
  tagHex: string,
  saltHex: string,
  masterKey: Buffer
): string => {
  const iv   = Buffer.from(ivHex,  "hex");
  const tag  = Buffer.from(tagHex, "hex");
  const salt = Buffer.from(saltHex,"hex");
  const key  = stretchKey(masterKey, salt);

  // Undo Pepper-XOR before decrypting
  const peppered = Buffer.from(encHex, "hex");
  const enc      = xorPepper(peppered);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(enc), decipher.final()]);
  return decrypted.toString("utf8");
};

// ─── 6. RSA-OAEP Encrypt (public key wraps AES master key) ───────────────────

export const encryptRSA = (data: Buffer, publicKey: string): Buffer => {
  return crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    data
  );
};

// ─── 7. RSA-OAEP Decrypt (private key unwraps AES master key) ────────────────

export const decryptRSA = (encrypted: Buffer, privateKey: string): Buffer => {
  return crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    encrypted
  );
};

// ─── 8. HMAC-SHA512 Sign ──────────────────────────────────────────────────────
// SHA-512 vs SHA-256: 50% more bits of security, same speed on 64-bit CPUs

export const signHMAC = (data: string, secret: string): string => {
  return crypto.createHmac("sha512", secret).update(data).digest("hex");
};

// ─── 9. HMAC-SHA512 Verify (constant-time) ────────────────────────────────────

export const verifyHMAC = (
  data: string,
  secret: string,
  expectedSig: string
): boolean => {
  // Both buffers must be same length for timingSafeEqual
  const actual   = Buffer.from(signHMAC(data, secret), "hex");
  const expected = Buffer.from(expectedSig, "hex");

  if (actual.length !== expected.length) return false;

  return crypto.timingSafeEqual(actual, expected);
};