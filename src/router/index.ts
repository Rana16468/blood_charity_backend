import express from 'express';
import { ContructRouter } from '../module/contract/contract.routes';
import UserRouters from '../module/user/user.routes';
import ChainLockRouter from '../module/Chainlock/Chainlock.routes';
import BloodRequestRouter from '../module/blood_request/blood_request.route';


const router = express.Router();
const moduleRouter = [
  { path: '/contract', route: ContructRouter },
  { path: '/user', route: UserRouters },
  {path:"/blood_charity", route: ChainLockRouter},
  {path:"/blood_request", route: BloodRequestRouter}
];

moduleRouter.forEach((v) => router.use(v.path, v.route));

export default router;
