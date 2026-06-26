import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import DonorRegisterController from './donor_register.controller';
import validationRequest from '../../middleware/validationRequest';
import DonorRegisterValidation from './donor_register.validation';

const router=express.Router();

router.get("/find_my_nearest_blood_donor", auth(USER_ROLE.donor),DonorRegisterController.findMyLocationNearestBloodDonor );
router.patch("/change_location",
     auth(USER_ROLE.donor), 
     validationRequest(DonorRegisterValidation.LocationDataSchema),
      DonorRegisterController.changeLocation)

router.get("/find_my_current_location",
     auth(USER_ROLE.donor),
     DonorRegisterController.findMyCurrentLocation
);

router.patch("/is_blood_donated/:id", 
     auth(USER_ROLE.donor),
      validationRequest(DonorRegisterValidation.IsBloodDonatedSchema),
     DonorRegisterController.IsBloodDonated)

const DonorRequestRoute=router;
export  default DonorRequestRoute;
