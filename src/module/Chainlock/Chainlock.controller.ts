/**
 * ChainLock™ Controller
 * ──────────────────────
 * Express request handlers for:
 *   POST /generate-keys  → create session + return public material
 *   POST /encrypt        → encrypt a JSON payload
 *   POST /decrypt        → decrypt an envelope
 *   GET  /health         → session store diagnostics
 */

import { RequestHandler } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utility/catchAsync";
import ChainLockServices from "./Chainlock.services";
import sendRespone from "../../utility/sendRespone";


// ─── POST /generate-keys ──────────────────────────────────────────────────────
/**
 * Step 1 — Client calls this once to start a session.
 *
 * Response shape:
 * {
 *   sessionId       : "a3f9..." (32 hex chars)  ← save this
 *   publicKey       : "-----BEGIN RSA..."        ← save this (optional use)
 *   encryptedAesKey : "4b2c..."                  ← save this — send with every request
 *   expiresAt       : 1716643200000              ← re-generate before this time
 * }
 *
 * 🔒 privateKey   → stored SERVER-SIDE only; never leaves the server
 * 🔒 rawAesKey    → never exposed; unwrapped per-request server-side
 */
export const generateKeys: RequestHandler = catchAsync(async (_req, res) => {
  const session = ChainLockServices.generateSessionKeys();

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Session keys generated successfully",
    data: session,
  });
});

// ─── POST /encrypt ────────────────────────────────────────────────────────────
/**
 * Step 2 — Encrypt any JSON payload.
 *
 * Request body:
 * {
 *   "sessionId"     : "<from /generate-keys>",
 *   "data"          : { ...any JSON... },
 *   "hmacSignature" : "<HMAC-SHA512 of JSON.stringify(data) using HMAC_SECRET>"
 * }
 *
 * Response shape:
 * {
 *   encryptedAesKey : "<hex>",   ← same as session's; echo back for decrypt
 *   iv              : "<hex>",   ← 16-byte AES IV
 *   tag             : "<hex>",   ← 16-byte GCM auth tag
 *   salt            : "<hex>",   ← 32-byte PBKDF2 salt
 *   data            : "<hex>",   ← Pepper-XOR'd ciphertext
 *   hmacSignature   : "<hex>"    ← server's HMAC-SHA512 of the envelope
 * }
 */
export const encryptProfile: RequestHandler = catchAsync(async (req, res) => {
  const { sessionId, data, hmacSignature } = req.body as {
    sessionId: string;
    data: unknown;
    hmacSignature: string;
  };

  if (!sessionId || !data || !hmacSignature) {
    sendRespone(res, {
      success: false,
      statusCode: httpStatus.BAD_REQUEST,
      message: "'sessionId', 'data', and 'hmacSignature' are all required",
      data: null,
    });
    return;
  }

  const result = ChainLockServices.encryptData(sessionId, data, hmacSignature);

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Data encrypted successfully",
    data: result,
  });
});

// ─── POST /decrypt ────────────────────────────────────────────────────────────
/**
 * Step 3 — Decrypt the envelope from /encrypt.
 *
 * Request body: (paste the entire /encrypt response + sessionId)
 * {
 *   "sessionId"      : "<from /generate-keys>",
 *   "encryptedAesKey": "<from /encrypt response>",
 *   "iv"             : "<from /encrypt response>",
 *   "tag"            : "<from /encrypt response>",
 *   "salt"           : "<from /encrypt response>",
 *   "data"           : "<from /encrypt response>",
 *   "hmacSignature"  : "<from /encrypt response>"
 * }
 *
 * Response: the original JSON payload, decrypted.
 */
export const decryptProfile: RequestHandler = catchAsync(async (req, res) => {
  const { sessionId, encryptedAesKey, iv, tag, salt, data, hmacSignature } =
    req.body as {
      sessionId: string;
      encryptedAesKey: string;
      iv: string;
      tag: string;
      salt: string;
      data: string;
      hmacSignature: string;
    };

  if (!sessionId || !encryptedAesKey || !iv || !tag || !salt || !data || !hmacSignature) {
    sendRespone(res, {
      success: false,
      statusCode: httpStatus.BAD_REQUEST,
      message:
        "'sessionId', 'encryptedAesKey', 'iv', 'tag', 'salt', 'data', and 'hmacSignature' are all required",
      data: null,
    });
    return;
  }

  const decrypted = ChainLockServices.decryptData({
    sessionId,
    encryptedAesKey,
    iv,
    tag,
    salt,
    data,
    hmacSignature,
  });

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Data decrypted successfully",
    data: decrypted,
  });
});

// ─── GET /health ──────────────────────────────────────────────────────────────
export const healthCheck: RequestHandler = catchAsync(async (_req, res) => {

    const result=await ChainLockServices.chainLockHmacSignature()

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "ChainLock™ is running",
    data: result,
  });
});


const encrypt:RequestHandler=catchAsync(async(req,res)=>{

     if (!req.cryptoSecret) {
    throw new Error("Crypto secret is missing");
  }

    const result=await ChainLockServices.encryptIntoDb(req.body, req.cryptoSecret);


  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Data encrypted into DB successfully",
    data: result,
  });
});


const decrypt:RequestHandler=catchAsync(async(req,res)=>{

   if (!req.cryptoSecret) {
    throw new Error("Crypto secret is missing");
  }
    const result=await ChainLockServices.decryptFromDb(req.body, req.cryptoSecret);
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Data decrypted from DB successfully",
    data: result,
  });
});


const ChainLockController = {
  generateKeys,
  encryptProfile,
  decryptProfile,
  healthCheck,
  encrypt,
  decrypt
};

export default ChainLockController;