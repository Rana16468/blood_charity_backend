import express from 'express';
import validationRequest from '../../middleware/validationRequest';
import UserValidationSchema from './user.validation';
import UserController from './user.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from './user.constant';

const router = express.Router();

router.post(
  '/social_media_auth',
  validationRequest(UserValidationSchema.socialMediaAuthSchema),
  UserController.createUser,
);

router.get("/is_donor_register", auth(USER_ROLE.donor),UserController.isDonorRegister);


const UserRouters = router;
export default UserRouters;
