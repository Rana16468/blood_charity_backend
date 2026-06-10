import express from "express";
import ChainLockController from "./Chainlock.controller";



const router = express.Router();




router.post("/encrypt-db", ChainLockController.encryptData);
router.post("/decrypt-db", ChainLockController.decryptData);

const ChainLockRouter=router

export default ChainLockRouter;