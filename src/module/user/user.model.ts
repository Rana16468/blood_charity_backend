
import { Schema, model } from "mongoose";
import { TUser, UserModel } from "./user.interface";
import { USER_ACCESSIBILITY, USER_ROLE } from "./user.constant";

const userSchema = new Schema<TUser, UserModel>(
  {
    browsername: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    device: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },





    engine: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    ipaddress: {
      type: String,
      required: true,
      index: true,
    },

    isVerify: {
      type: Boolean,
      default: false,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    os: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    picture: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      required: true,
      enum: [
        USER_ACCESSIBILITY.isProgress,
        USER_ACCESSIBILITY.blocked,
      ],
      default: USER_ACCESSIBILITY.isProgress,
    },

    role: {
      type: String,
      required: true,
      enum: [
        USER_ROLE.donor,
        USER_ROLE.admin,
      ],
      default: USER_ROLE.donor,
    },

    platform: {
      type: String,
      required: true,
      trim: true,
    },

    isOnline: {
      type: Boolean,
      default: true,
    },
    generate_secret_key:{
      type: String,
      required:[true , 'generate_secret_key is required']

    },
    isDonorRegister:{
      type: Boolean,
      required: false,
    default: false

    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    virtuals: true,
  }
);

// Hide deleted users in find()
userSchema.pre("find", function (next) {
  this.where({
    isDelete: { $ne: true },
  });

  next();
});

// Hide deleted users in findOne()
userSchema.pre("findOne", function (next) {
  this.where({
    isDelete: { $ne: true },
  });

  next();
});

// Hide deleted users in aggregate()
userSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({
    $match: {
      isDelete: { $ne: true },
    },
  });

  next();
});

const users = model<TUser, UserModel>("users", userSchema);

export default users;

