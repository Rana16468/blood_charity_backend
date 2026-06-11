import mongoose from "mongoose";
import users from "./user.model";
import { TUser } from "./user.interface";
import { USER_ACCESSIBILITY } from "./user.constant";
import { jwtHelpers } from "../../app/helper/jwtHelpers";
import config from "../../app/config";
import ApiError from "../../app/error/ApiError";
import httpStatus from "http-status";
import catchError from "../../app/error/catchError";
import generateKey from "../../utility/generateKey ";

type TJwtPayload = {
  id: string;
  role: string;
  email: string;
  generate_secret_key: string;
};

const socialMediaAuthIntoDb = async (payload: TUser) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 🔍 ১. প্রথমে চেক করুন ইউজার অলরেডি আছেন কি না
    const existingUser = await users.findOne(
      {
        email: payload.email,
        isDelete: false,
      },
      { _id: 1, role: 1, email: 1, isVerify: 1 },
      { session }
    );

    let userId: string;
    let userRole: string = payload.role || "user"; // ডিফল্ট রোল যদি পে-লোডে না থাকে

    if (!existingUser) {
      // 👤 নতুন ইউজার তৈরি
      const newUser = new users({
        ...payload,
        isVerify: true,
        status: USER_ACCESSIBILITY.isProgress,
      });
      const savedUser = await newUser.save({ session });
      userId = savedUser._id.toString();
      if (savedUser.role) userRole = savedUser.role;
    } else {
      userId = existingUser._id.toString();
      userRole = existingUser.role;
    }

   
    const newSecretKey = generateKey(64); 

    
    const updatedUser = await users.findOneAndUpdate(
      { email: payload.email },
      {
        $set: {
          browsername: payload.browsername,
          device: payload.device,
          engine: payload.engine,
          ipaddress: payload.ipaddress,
          os: payload.os,
          platform: payload.platform, 
          generate_secret_key: newSecretKey, 
        },
      },
      { new: true, upsert: true, session }
    );

    if (!updatedUser) {
      throw new ApiError(
        httpStatus.NOT_ACCEPTABLE,
        "Failed to update user session info", ""
      );
    }

    // 🔐 ৪. এখন সেইম নতুন কি দিয়ে JWT payload তৈরি করুন
    const jwtPayload: TJwtPayload = {
      id: userId,
      role: userRole,
      email: payload.email,
      generate_secret_key: newSecretKey, // ✅ টোকেনেও একদম লেটেস্ট কি চলে গেল
    };

    // 🔐 ৫. টোকেনগুলো জেনারেট করুন
    const accessToken = jwtHelpers.generateToken(
      jwtPayload,
      config.jwt_access_secret as string,
      config.expires_in as string
    );

    const refreshToken = jwtHelpers.generateToken(
      jwtPayload,
      config.jwt_refresh_secret as string,
      config.refresh_expires_in as string
    );

    await session.commitTransaction();
    session.endSession();

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw catchError(error);
  }
};

export const UserServices = {
  socialMediaAuthIntoDb,
};