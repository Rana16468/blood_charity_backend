
// handeller

import { ZodError, ZodIssue } from "zod";
import { TErrorSources, TGenericResponse } from "../../interface/error.interface";
import httpStatus from "http-status";


const handelZodError=(err:ZodError):TGenericResponse=>{

    const errorSources:TErrorSources=err.issues.map((issue:ZodIssue)=>{
      return {
        path:issue.path[issue.path.length -1],
        message:issue.message
      }
    })
  const   statusCode=Number(httpStatus.NOT_FOUND);
   return {
    statusCode,
    message:'Zod Validation error',
    errorSources }

  }

  export default handelZodError
