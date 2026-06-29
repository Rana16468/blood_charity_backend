import { RequestHandler } from "express";
import catchAsync from "../../utility/catchAsync";
import NotificationServices from "./notification.services";
import sendResponse from "../../utility/sendRespone";
import httpStatus from "http-status";



const findByAllNotification:RequestHandler=catchAsync(async(req , res)=>{

    const result=await NotificationServices.findByAllNotificationIntoDb(req.user.id, req.query);
     sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "successfully  find by all notification",
    data: result,
  });
});

const NotificationController={
    findByAllNotification
};
export default NotificationController;
