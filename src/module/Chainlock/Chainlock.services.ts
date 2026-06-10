import { decrypt, encrypt } from "../../utility/encryptionHelper/CeyptoSecurity";


const CRYPTO_SECRET = process.env.CRYPTO_SECRET!; // move secret to env

export const encryptIntoDb = async (payload: any, cryptoSecret: string) => {
  const result = encrypt(payload, cryptoSecret);
  // result = { encrypted: "salt:iv:tag:cipher", type: "object" | "array" }
  return {
    originalPayload: payload,
    encryptedPayload: result.encrypted,  // store this string in DB
    type: result.type,
  };
};

export const decryptFromDb = async (
  encryptedString: string,
  cryptoSecret: string
) => {
  const result = decrypt(encryptedString, cryptoSecret);
  return {
    decrypted: result.decrypted,
    type: result.type,
  };
};

const   ChainLockServices={
  decryptFromDb,
  encryptIntoDb

}
export default ChainLockServices;
