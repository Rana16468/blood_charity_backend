import { Schema, model, Model, Types, Document } from "mongoose";
import {TTimeZone,TimeZoneModal} from './tracking.interface'
// 3. Schema definition
const TTimeZoneSchema = new Schema<TTimeZone,TimeZoneModal >({
  visitorId: {
    type: Schema.Types.ObjectId,
    required: [true ,'visitorId is required'],
    
  },
  timezoneCoord: {
    type: [Schema.Types.Mixed], 
    required: [true, 'time xone coord is required'],
  },
  isDelete:{
    type:Boolean,
     required:[true ,'is Delete not required']
    
  }
}, {
  timestamps: true
});

//middlewere 
TTimeZoneSchema .pre('find',function(next){
    this.find({ isDelete:{$ne:true}})
    next();
  });
  TTimeZoneSchema.pre('aggregate',function(next){

    this.pipeline().unshift({$match:{isDelete:{$ne:true}}})
    next();
  });
 TTimeZoneSchema.pre('findOne',function(next){
  
    this.find({ isDelete:{$ne:true}})
  
    next();
  })


// 4. Static method implementation
TTimeZoneSchema.statics.IsTimeZoneExist = async function (
  id: string
): Promise<TTimeZone | null> {
  return this.findOne({ visitorId: id });
};

// 5. Model export
const timezones = model<TTimeZone, TimeZoneModal>('timezones ', TTimeZoneSchema);

export default timezones ;