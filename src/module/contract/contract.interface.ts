import { Types } from "mongoose";



export type TContract={

    name:string;
    email?:string;
    phoneNumber:string;
    address:string;
    photo:string;
    isDelete:boolean;
    isfavorite:Boolean;
    ContractId:Types.ObjectId;
}

