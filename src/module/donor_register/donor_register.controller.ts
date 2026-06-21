import { RequestHandler } from "express";
import catchAsync from "../../utility/catchAsync";
import DonorRegisterServices from "./donor_register.services";
import sendResponse from "../../utility/sendRespone";
import httpStatus from "http-status";


const findMyLocationNearestBloodDonor:RequestHandler=catchAsync(async(req, res)=>{

    const result=await DonorRegisterServices.findMyLocationNearestBloodDonorIntoDb(req.query, req.user.generate_secret_key);
    sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully My Nearest Donor',
    data: result,
  });
});

const DonorRegisterController={
    findMyLocationNearestBloodDonor
}
export default DonorRegisterController;