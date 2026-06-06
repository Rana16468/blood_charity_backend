import express from "express";
import ChainLockController from "./Chainlock.controller";
import { requireSecret } from "../../middleware/requireSecret";


const router = express.Router();


router.post("/generate-keys", ChainLockController.generateKeys);


router.post("/encrypt", ChainLockController.encryptProfile);


router.post("/decrypt", ChainLockController.decryptProfile);


router.get("/health", ChainLockController.healthCheck);

router.post("/encrypt-db",requireSecret, ChainLockController.encrypt);
router.post("/decrypt-db",requireSecret, ChainLockController.decrypt);

const ChainLockRouter=router

export default ChainLockRouter;