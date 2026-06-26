import { RequestHandler } from "express";
import catchAsync from "../../utility/catchAsync";
import DonorRegisterServices from "./donor_register.services";
import sendResponse from "../../utility/sendRespone";
import httpStatus from "http-status";


const findMyLocationNearestBloodDonor:RequestHandler=catchAsync(async(req, res)=>{

    const result=await DonorRegisterServices.findMyLocationNearestBloodDonorIntoDb(req.query);
    sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully My Nearest Donor',
    data: result,
  });
});

const changeLocation: RequestHandler=catchAsync(async(req , res)=>{
 const result=await DonorRegisterServices.changeLocationIntoDb(req.user.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: result,
  });

});

const findMyCurrentLocation:RequestHandler=catchAsync(async(req , res)=>{


      const result= await DonorRegisterServices.findMyCurrentLocationIntoDb(req.user.id);
       sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "successfully find my current location",
    data: result,
  });
})

const DonorRegisterController={
    findMyLocationNearestBloodDonor,
    changeLocation,
    findMyCurrentLocation
}
export default DonorRegisterController;