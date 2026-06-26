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


const findByRequestHistory:RequestHandler=catchAsync(async(req , res)=>{

    const result=await BloodRequestServices.findByRequestHistoryIntoDb(req.user.id, req.query);
      sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Find By Request History',
    data: result,
  });
});

const IsBloodDonorFind:RequestHandler=catchAsync(async(req , res)=>{

    const result=await BloodRequestServices.IsBloodDonorFindIntoDb(req.params.id, req.body);
    sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully  Find Donor',
    data: result,
  });
});

const deleteBloodRequest:RequestHandler=catchAsync(async(req , res)=>{

   const result=await BloodRequestServices.deleteBloodRequestIntoDb(req.params.id);
   sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully  Delete Blood Request',
    data: result,
  });
})

const BloodRequestController={
    findMyLocationNearestBloodRequest,
    findByRequestHistory,
    IsBloodDonorFind,
    deleteBloodRequest
};

export default BloodRequestController;


