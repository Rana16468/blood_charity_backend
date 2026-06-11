import { decrypt, encrypt } from "../../utility/encryptionHelper/CeyptoSecurity";




export const encryptIntoDb = async (payload: any, cryptoSecret: string) => {
  const result = encrypt(payload, cryptoSecret);
  // result = { encrypted: "salt:iv:tag:cipher", type: "object" | "array" }
  return  result
};

export const decryptFromDb = async (
  encryptedString: string,
  cryptoSecret: string
) => {
  const result = decrypt(encryptedString, cryptoSecret);
  return  result;

};

const   ChainLockServices={
  decryptFromDb,
  encryptIntoDb

}
export default ChainLockServices;
