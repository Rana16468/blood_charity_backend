import { Schema, model } from "mongoose";
import { BloodRequest, BloodRequestModel } from "./blood_request.interface";
import { BloodRequestType} from "./blood_request.constant";




const LocationSchema = new Schema(
  {
    lat: { type: Number, required: true, index: true  },
    lng: { type: Number, required: true , index: true },
    accuracy: { type: Number, required: true, index: true  },
    address: { type: String, required: true },
  },
  { _id: false }
);


const BloodRequestSchema = new Schema<
  BloodRequest,
  BloodRequestModel
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true 
    },
    blood: {
      type: String,
      required: true,
      index: true 
    },
    phone: {
      type: String,
      required: true,
      index: true 
    },
    hospital: {
      type: String,
      required: true,
    },
    urgency: {
      type: String,
      required: true,
      index: true 
    },
    locationData: {
      type: LocationSchema,
      required: true,
    },
    bloodResuestType: {
  type: String,
  enum: {
    values: [BloodRequestType.volunteer, BloodRequestType.request],
    message: "{VALUE} is not a valid request type",
  },
  required: [true, "Blood Request Type is required"],
  trim: true,
  index: true 
},
    isDelete:{
        type:Boolean,
        required: false
    }
  },
  {
    timestamps: true,
  }
);

BloodRequestSchema.pre("find", function (next) {
  this.where({
    isDelete: { $ne: true },
  });

  next();
});

BloodRequestSchema.pre("findOne", function (next) {
  this.where({
    isDelete: { $ne: true },
  });

  next();
});

// Hide deleted users in aggregate()
BloodRequestSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({
    $match: {
      isDelete: { $ne: true },
    },
  });

  next();
});


BloodRequestSchema.statics.isBloodRequestByCustomId = async function (
  id: string
) {
  return await this.findOne({ _id: id });
};


 const blood_requests = model<
  BloodRequest,
  BloodRequestModel
>("blood_requests", BloodRequestSchema);
export default blood_requests;