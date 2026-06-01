import express from 'express';
import { ContructRouter } from '../module/contract/contract.routes';
import UserRouters from '../module/user/user.routes';
import ChainLockRouter from '../module/Chainlock/Chainlock.routes';


const router = express.Router();
const moduleRouth = [
  { path: '/contract', route: ContructRouter },
  { path: '/user', route: UserRouters },
  {path:"/blood_charity", route: ChainLockRouter}
];

moduleRouth.forEach((v) => router.use(v.path, v.route));

export default router;
