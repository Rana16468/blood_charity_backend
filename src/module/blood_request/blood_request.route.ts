import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import BloodRequestController from './blood_request.controller';

const router=express.Router();


router.get("/find_my_location_nearest_blood_request", auth(USER_ROLE.donor), BloodRequestController.findMyLocationNearestBloodRequest);


const BloodRequestRouter= router;
export default BloodRequestRouter;

