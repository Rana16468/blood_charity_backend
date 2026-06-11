import { RequestHandler } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utility/catchAsync";
import ChainLockServices from "./Chainlock.services";
import sendRespone from "../../utility/sendRespone";


const CRYPTO_SECRET =
  "mySuperSecret123kDFHkjhj4";

// POST /api/chainlock/encrypt
// Body: any JSON object or array
export const encryptData: RequestHandler = catchAsync(async (req, res) => {
  const result = await ChainLockServices.encryptIntoDb(
    req.body,
    CRYPTO_SECRET
  );

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Data encrypted successfully",
    data: result,
  });
});

// POST /api/chainlock/decrypt
// Body: { "encrypted": "salt:iv:tag:ciphertext" }
export const decryptData: RequestHandler = catchAsync(async (req, res) => {
  const { encrypted } = req.body as { encrypted: string };

  if (!encrypted) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: "Request body must contain an 'encrypted' field",
    });
  }

  const result = await ChainLockServices.decryptFromDb(
    encrypted,   // ← pass the string directly, not the whole body
    CRYPTO_SECRET
  );

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Data decrypted successfully",
    data: result,
  });
});

const ChainLockController={
  encryptData,
  decryptData
}

export default ChainLockController