/**
 * ChainLock™ Service Layer
 * ─────────────────────────
 * Orchestrates the full encrypt / decrypt lifecycle.
 *
 * Data-flow overview:
 *
 *  generateSessionKeys()
 *    RSA-4096 key-pair  ──►  private key → server store (TTL 15 min)
 *    AES-256 master key ──►  RSA-OAEP encrypted → client gets encryptedAesKey
 *    client gets: { sessionId, publicKey, encryptedAesKey, expiresAt }
 *
 *  encryptData()
 *    client sends: { sessionId, data, hmacSignature }
 *    server: HMAC verify → lookup session → decrypt AES key
 *           → AES-GCM-PBKDF2-Pepper encrypt → HMAC sign response
 *    response: { encryptedAesKey, iv, tag, salt, data, hmacSignature }
 *
 *  decryptData()
 *    client sends: full envelope + hmacSignature
 *    server: HMAC verify → lookup session → RSA-decrypt AES key
 *           → AES-GCM-PBKDF2-Pepper decrypt → return JSON
 */

import crypto from "crypto";
import { decryptAES, decryptRSA, encryptAES, encryptRSA, generateRSAKeys, signHMAC, verifyHMAC } from "../../utility/encryptionHelper/EncryptionHelper";
import { sessionStore } from "../../utility/encryptionHelper/Chainlockstore";


// ── env vars ──────────────────────────────────────────────────────────────────
const HMAC_SECRET = process.env.HMAC_SECRET!;   // min 64 random chars recommended

if (!HMAC_SECRET) {
  throw new Error("HMAC_SECRET env var is required — set it in .env");
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ISessionResponse {
  sessionId: string;
  publicKey: string;
  encryptedAesKey: string;    // RSA-OAEP(masterAesKey) → hex — client stores this
  expiresAt: number;
}

export interface IEncryptResponse {
  encryptedAesKey: string;   // same as session's encryptedAesKey (echo back)
  iv: string;
  tag: string;
  salt: string;              // PBKDF2 salt — new each encrypt
  data: string;              // ciphertext hex
  hmacSignature: string;     // server signs the entire envelope
}

export interface IDecryptRequest {
  sessionId: string;
  encryptedAesKey: string;
  iv: string;
  tag: string;
  salt: string;
  data: string;
  hmacSignature: string;
}

// ─── 1. Generate Session ──────────────────────────────────────────────────────

const generateSessionKeys = (): ISessionResponse => {
  // ① Generate RSA-4096 key pair
  const { publicKey, privateKey } = generateRSAKeys();

  // ② Generate random 256-bit AES master key
  const masterAesKey = crypto.randomBytes(32);

  // ③ Wrap master key with RSA public key (client will receive this)
  const encryptedAesKey = encryptRSA(masterAesKey, publicKey).toString("hex");

  // ④ Generate session ID
  const sessionId = crypto.randomBytes(16).toString("hex");

  // ⑤ Store private key + encrypted AES key server-side (NEVER sent to client)
  const entry = sessionStore.set(sessionId, {
    privateKey,
    encryptedAesKey,
  });

  return {
    sessionId,
    publicKey,              // client needs this only for reference / custom use
    encryptedAesKey,        // client stores this; sends it back with each request
    expiresAt: entry.expiresAt,
  };
};

// ─── 2. Encrypt ───────────────────────────────────────────────────────────────

const encryptData = (
  sessionId: string,
  payload: unknown,
  hmacSignature: string
): IEncryptResponse => {
  // ① Verify request integrity
  const payloadStr = JSON.stringify(payload);
  if (!verifyHMAC(payloadStr, HMAC_SECRET, hmacSignature)) {
    throw new Error("HMAC verification failed — request may be tampered");
  }

  // ② Look up session
  const session = sessionStore.get(sessionId);
  if (!session) throw new Error("Session not found or expired — call /generate-keys");

  // ③ Recover AES master key using stored private key
  const masterAesKey = decryptRSA(
    Buffer.from(session.encryptedAesKey, "hex"),
    session.privateKey
  );

  // ④ Encrypt payload: AES-GCM + PBKDF2 stretch + Pepper-XOR
  const { iv, tag, data, salt } = encryptAES(payloadStr, masterAesKey);

  // ⑤ Server signs entire response envelope
  const envelope = `${session.encryptedAesKey}${iv}${tag}${salt}${data}`;
  const responseSig = signHMAC(envelope, HMAC_SECRET);

  return {
    encryptedAesKey: session.encryptedAesKey,
    iv,
    tag,
    salt,
    data,
    hmacSignature: responseSig,
  };
};

// ─── 3. Decrypt ───────────────────────────────────────────────────────────────

const decryptData = (req: IDecryptRequest): unknown => {
  const { sessionId, encryptedAesKey, iv, tag, salt, data, hmacSignature } = req;

  // ① Verify response/payload wasn't tampered in transit
  const envelope = `${encryptedAesKey}${iv}${tag}${salt}${data}`;
  if (!verifyHMAC(envelope, HMAC_SECRET, hmacSignature)) {
    throw new Error("HMAC verification failed — data may be tampered");
  }

  // ② Look up session
  const session = sessionStore.get(sessionId);
  if (!session) throw new Error("Session not found or expired — call /generate-keys");

  // ③ Recover AES master key
  const masterAesKey = decryptRSA(
    Buffer.from(encryptedAesKey, "hex"),
    session.privateKey
  );

  // ④ Decrypt: undo Pepper-XOR → AES-GCM with PBKDF2-stretched key
  const jsonStr = decryptAES(data, iv, tag, salt, masterAesKey);

  return JSON.parse(jsonStr);
};

// ─── 4. Health / diagnostics ─────────────────────────────────────────────────

const getStats = () => sessionStore.stats();

const chainLockHmacSignature=async()=>{

    const HMAC_SECRET = process.env.HMAC_SECRET!;

  // ✅ শুধু data object — sessionId বা অন্য কিছু না
  const data = {
    donorName: "Rahim Uddin",
    bloodGroup: "B+",
    contactNumber: "+8801712345678",
    location: "Dhaka, Bangladesh",
  };

  // ✅ SHA-256 — server এর verifyHMAC এর সাথে match করতে হবে
  const hmacSignature = crypto
    .createHmac("sha256", HMAC_SECRET)
    .update(JSON.stringify(data))
    .digest("hex");

  console.log("════════════════════════════");
  console.log("✅ Postman এ এই JSON পাঠাও:");
  console.log("════════════════════════════");
  console.log(JSON.stringify({ data, hmacSignature }, null, 2));
  console.log("\n🔑 hmacSignature length:", hmacSignature.length, "(64 হলে সঠিক)");


}

const ChainLockServices = {
  generateSessionKeys,
  encryptData,
  decryptData,
  getStats,
  chainLockHmacSignature
};

export default ChainLockServices;