import { Model } from "mongoose";

export interface TLocationData {
  lat: number;
  lng: number;
  accuracy: number;
  address: string;
}

export interface TUserLocation {
  userId: string;
  name: string;
  phone: string;
  blood: string;
  locationData: TLocationData;
   bloodRequestType :"volunteer" | "request"
   isDelete: false
}

export interface BloodDonorModel extends Model<TUserLocation> {

  isBloodRequestByCustomId(id: string): Promise<TUserLocation>;

 
}