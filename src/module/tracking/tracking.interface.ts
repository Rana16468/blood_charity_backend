import { Model, Types } from "mongoose";

export interface TTimeZone {
  visitorId: Types.ObjectId;
  timezoneCoord: (string | number)[];
  isDelete?:Boolean;
};

export interface TimeZoneModal extends Model<TTimeZone> {
   
    // eslint-disable-next-line no-unused-vars
    IsTimeZoneExist(id:string):Promise<TTimeZone>,

  }

