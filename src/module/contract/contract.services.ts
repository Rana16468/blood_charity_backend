import httpStatus from "http-status";

import { TContract } from "./contract.interface"
import { Contract } from "./contract.model";
import ApiError from "../../app/error/ApiError";



const createContractIntoDb=async(payload:TContract)=>{

    const buildInShoes= new Contract(payload);
    const result=await buildInShoes.save();
    return result;

   

}

const AllContractIntoDb=async()=>{
    const result = await Contract.find({}).sort({ isfavorite: -1 });
    return result;
}

const SpecificContractIdIntoDb=async(id:string)=>{

    const result=await Contract.findById(id);
    return result;

}

const UpdateContractFromDb=async(id:string,payload:Partial<TContract>)=>{

    const isExistUser=await Contract.findById(id);
    if(!isExistUser){
        throw new ApiError(httpStatus.NOT_FOUND,"User Not Exist in System","");
    }
    const result=await Contract.findByIdAndUpdate(id,payload,{new:true,runValidators:true});
    return result

    
}
const DeleteContractFromDb=async(id:string)=>{

    const isExistUser=await Contract.findById(id);
    if(!isExistUser){
        throw new ApiError(httpStatus.NOT_FOUND,"User Not Exist in the System","");
    }

    const result=await Contract.updateOne({ _id:id }, { isDelete: true });
    return result;
}

const FavoriteContrcatFromDb=async(id:string)=>{
    const isExistUser=await Contract.findById(id);
    if(!isExistUser){
        throw new ApiError(httpStatus.NOT_FOUND,"User Not Exist in the System","");
    }
    const result=await Contract.updateOne({ _id:id }, {isfavorite:(isExistUser?.isfavorite)?false:true });
    return result;
}

export const ContractService={
    createContractIntoDb,
    AllContractIntoDb,
    SpecificContractIdIntoDb,
    UpdateContractFromDb,
    DeleteContractFromDb,
    FavoriteContrcatFromDb
}