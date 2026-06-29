import express  from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import NotificationController from './notification.controller';

const router=express.Router();

 router.get("/find_by_all_notification",
     auth(USER_ROLE.donor),NotificationController.findByAllNotification );

const NotificationRouter=router;
export default NotificationRouter;
