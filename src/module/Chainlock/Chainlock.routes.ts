import express from "express";
import ChainLockController from "./Chainlock.controller";


const router = express.Router();


router.post("/generate-keys", ChainLockController.generateKeys);


router.post("/encrypt", ChainLockController.encryptProfile);


router.post("/decrypt", ChainLockController.decryptProfile);


router.get("/health", ChainLockController.healthCheck);

const ChainLockRouter=router

export default ChainLockRouter;