import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import DonorRegisterController from './donor_register.controller';

const router=express.Router();

router.get("/find_my_nearest_blood_donor", auth(USER_ROLE.donor),DonorRegisterController.findMyLocationNearestBloodDonor );

const DonorRequestRoute=router;
export  default DonorRequestRoute;
