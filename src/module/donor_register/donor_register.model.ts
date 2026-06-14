import { Model, Schema, model } from "mongoose";
import { BloodDonorModel, TLocationData, TUserLocation } from "./donor_register.interface";
import { BloodRequestType } from "../blood_request/blood_request.constant";


const locationSchema = new Schema<TLocationData,  BloodDonorModel>(
  {
    lat: {
      type: Number,
      required: true,
      index: true 
    },
    lng: {
      type: Number,
      required: true,
      index: true 
    },
    accuracy: {
      type: Number,
      required: true,
      index: true 
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const bloodDonorSchema = new Schema<
  TUserLocation,
  BloodDonorModel
>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true 
    },
    blood: {
      type: String,
      required: true,
      trim: true,
      index: true 
    },
    locationData: {
      type: locationSchema,
      required: true,
    },
    bloodRequestType: {
      type: String,
      enum: [BloodRequestType.request, BloodRequestType.volunteer],
      required: true,
      index: true 
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

bloodDonorSchema.statics.isBloodRequestByCustomId =
  async function (id: string) {
    return await this.findOne({
      userId: id,
      isDelete: false,
    });
  };

 const blood_donor = model<
  TUserLocation,
  BloodDonorModel
>("blood_donor", bloodDonorSchema);

export default blood_donor;