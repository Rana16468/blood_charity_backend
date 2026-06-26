import { Model, Types } from "mongoose";

export interface TLocationData {
  lat: number;
  lng: number;
  accuracy: number;
  address: string;
}

export interface TUserLocation {
  userId: Types.ObjectId;
  name: string;
  phone: string;
  blood: string;
  locationData: TLocationData;
  bloodRequestType :"volunteer" | "request"
  isBloodDonated: boolean;
   donatedCount: number;
   isDelete: false
}

export interface BloodDonorModel extends Model<TUserLocation> {

  isBloodRequestByCustomId(id: string): Promise<TUserLocation>;

 
}