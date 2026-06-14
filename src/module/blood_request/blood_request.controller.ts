import { RequestHandler } from "express";
import catchAsync from "../../utility/catchAsync";
import BloodRequestServices from "./blood_request.services";
import httpStatus from "http-status";
import sendResponse from "../../utility/sendRespone";



const findMyLocationNearestBloodRequest:RequestHandler=catchAsync(async(req , res)=>{

      const result=await BloodRequestServices.findMyLocationNearestBloodRequestIntoDb(req.query, req.user.generate_secret_key);
        sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Login',
    data: result,
  });


});
const BloodRequestController={
    findMyLocationNearestBloodRequest
};

export default BloodRequestController;


