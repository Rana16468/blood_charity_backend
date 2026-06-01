import httpStatus from "http-status";
import { TErrorSources, TGenericResponse } from "../../interface/error.interface";




// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handelDuplicateError=(err:any):TGenericResponse=>{

    const match =err.message.match(/"([^"]*)"/);

    // Extracted value or null if not found
    const extractedMessage = match ? match[1] : null;
    const errorSources:TErrorSources=[
        {path:'',message:extractedMessage}
    
    ]


    const statusCode=Number(httpStatus.NOT_FOUND);
    return{
        statusCode,
        message:' InValidate id',
        errorSources 
    }

}

export default handelDuplicateError


