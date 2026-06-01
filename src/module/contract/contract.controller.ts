import { RequestHandler } from "express";

import { ContractService } from "./contract.services";

import httpStatus from "http-status";
import catchAsync from "../../utility/catchAsync";
import sendRespone from "../../utility/sendRespone";



const createContract:RequestHandler=catchAsync(async(req,res)=>{

    

    const result=await ContractService.createContractIntoDb(req.body);
    sendRespone(res,{success:true,statusCode:httpStatus.CREATED,message:"Sucessfulled Added Contract",data:result});


});


const AllContract:RequestHandler=catchAsync(async(req,res)=>{

    const result=await ContractService.AllContractIntoDb();
    sendRespone(res,{success:true,statusCode:httpStatus.OK,message:"Successfully Find All Conreact",data:result});

});

const  SpecificContractId:RequestHandler=catchAsync(async(req,res)=>{
    const {id}=req.params;
    const result=await ContractService.SpecificContractIdIntoDb(id);
    sendRespone(res,{success:true,statusCode:httpStatus.OK,message:"Successfully Get Specific Contract",data:result});
});

const UpdateContract:RequestHandler=catchAsync(async(req,res)=>{

    const {id}=req.params;
    const result=await ContractService.UpdateContractFromDb(id,req.body);
    sendRespone(res,{success:true,statusCode:httpStatus.OK,message:"Successfully Updated Contract Information",data:result});

});

const DeleteContract:RequestHandler=catchAsync(async(req,res)=>{

    const {id}=req.params;
    const result=await ContractService.DeleteContractFromDb(id);
    sendRespone(res,{success:true,statusCode:httpStatus.OK,message:"Successfully Delete Contrcat Info",data:result});

});
const FavoriteContrcat:RequestHandler=catchAsync(async(req,res)=>{
    const {id}=req.params;
    const result=await ContractService.FavoriteContrcatFromDb(id);
    sendRespone(res,{success:true,statusCode:httpStatus.OK,message:"Successfully Recorded Fevorite",data:result});
})

export const ContractController={
    createContract,
    AllContract,
    SpecificContractId,
    UpdateContract,
    DeleteContract,
    FavoriteContrcat
}
