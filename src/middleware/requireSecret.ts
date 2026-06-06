import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      cryptoSecret?: string;
    }
  }
}


export function requireSecret(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secret = req.headers["x-crypto-secret"];

  if (!secret || typeof secret !== "string") {
    res.status(401).json({
      success: false,
      error: "Missing required header: X-Crypto-Secret",
    });
    return;
  }

  if (secret.length < 8) {
    res.status(401).json({
      success: false,
      error: "X-Crypto-Secret must be at least 8 characters long.",
    });
    return;
  }

  req.cryptoSecret = secret;
  next();
}