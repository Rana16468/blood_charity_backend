import { Model, Types } from "mongoose";

export interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
  address: string;
}

export interface BloodRequest {
  userId: Types.ObjectId;
  blood: string;
  phone: string;
  hospital: string;
  urgency:string;
  locationData: LocationData;
  isDelete:boolean
}

export interface BloodRequestModel extends Model<BloodRequest> {

  isBloodRequestByCustomId(id: string): Promise<BloodRequest>;

 
}