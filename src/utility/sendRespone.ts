import { Response } from "express";


 type TResponeData<T>={
    statusCode:number;
    success:boolean;
    message:string;
    data:T
}

const sendRespone=<T>(res:Response,data:TResponeData<T>)=>{
res.status(data.statusCode).send({success:data.success,message:data.message,data:data.data});


}

export default sendRespone;