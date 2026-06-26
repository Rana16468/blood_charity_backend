import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import BloodRequestController from './blood_request.controller';
import validationRequest from '../../middleware/validationRequest';
import BloodRequestValidation from './blood_request.validation';

const router=express.Router();


router.get("/find_my_location_nearest_blood_request", auth(USER_ROLE.donor), BloodRequestController.findMyLocationNearestBloodRequest);
router.get("/find_my_blood_requst_history", auth(USER_ROLE.donor), BloodRequestController.findByRequestHistory);
router.patch("/is_donor_find/:id", auth(USER_ROLE.donor), validationRequest(BloodRequestValidation.IsDonorFindSchema), BloodRequestController.IsBloodDonorFind);
router.delete("/delete_blood_request/:id", auth(USER_ROLE.donor), BloodRequestController.deleteBloodRequest);


const BloodRequestRouter= router;
export default BloodRequestRouter;

