
import { Schema, Types, model } from "mongoose";
import { TContract } from "./contract.interface";
// Define the TSales schema
const TContractSchema = new Schema({
    name: {
        type: String,
        required: [true,'name is Required']
    },
    email: {
        type: String,
        required: [false,'Email is Not Required']
    },
    phoneNumber: {
        type: String,
        required: [true,'phone Number is Required']
    },
    address: {
        type: String,
        required: [true,'address is Required']
    },
    photo: {
        type: String,
        required: [false,'profile picture is required']
    },
    isfavorite:{
        type: Boolean,
        required: true,
        default: false
    },
    isDelete: {
        type: Boolean,
        required: true,
        default: false
    }
   
},{
    timestamps:true
});

// midlewere 
TContractSchema .pre('find',function(next){
    this.find({ isDelete:{$ne:true}})
    next();
  });
  TContractSchema.pre('aggregate',function(next){

    this.pipeline().unshift({$match:{isDelete:{$ne:true}}})
    next();
  });
 TContractSchema.pre('findOne',function(next){
  
    this.find({ isDelete:{$ne:true}})
  
    next();
  })

// Export the model
export const Contract=model<TContract>('contract',TContractSchema)
