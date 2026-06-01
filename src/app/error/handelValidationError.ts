import mongoose from "mongoose";
import { TErrorSources, TGenericResponse } from "../../interface/error.interface";
import httpStatus from "http-status";



const handelValidationError=(err: mongoose.Error.ValidationError):TGenericResponse=>{

const errorSources:TErrorSources =Object.values(err.errors).map((val:mongoose.Error.ValidatorError | mongoose.Error.CastError)=>{

    return{
        path:val?.path,
        message:val?.message,
        

    }
});

const statusCode=Number(httpStatus.NOT_FOUND);
    return{
        statusCode,
        message:' Validation error',
        errorSources 
    }
}

export default handelValidationError