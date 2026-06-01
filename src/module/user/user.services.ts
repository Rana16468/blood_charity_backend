import mongoose from "mongoose";
import users from "./user.model";
import { TUser } from "./user.interface";
import { USER_ACCESSIBILITY } from "./user.constant";
import { jwtHelpers } from "../../app/helper/jwtHelpers";
import config from "../../app/config";
import ApiError from "../../app/error/ApiError";
import httpStatus from "http-status";
import catchError from "../../app/error/catchError";

type TJwtPayload = {
  id: string;
  role: string;
  email: string;
};

const socialMediaAuthIntoDb = async (payload: TUser) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 🔍 Check user
    const existingUser = await users.findOne(
      {
        email: payload.email,
        isDelete: false,
      },
      { _id: 1, role: 1, email: 1, isVerify: 1 },
      { session }
    );

    let user;

    // 👤 Create user if not exists
    if (!existingUser) {
      const newUser = new users({
        ...payload,
        isVerify: true,
        status: USER_ACCESSIBILITY.isProgress,
      });

      user = await newUser.save({ session });
    } else {
      user = existingUser;
    }

    // 🔐 JWT payload (FIX ObjectId issue)
    const jwtPayload: TJwtPayload = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    // 🔐 Generate tokens
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

    // 📱 Update device / browser info
    const updatedUser = await users.findOneAndUpdate(
      { email: payload.email },
      {
        $set: {
          browsername: payload.browsername,
          device: payload.device,
          engine: payload.engine,
          ipaddress: payload.ipaddress,
          os: payload.os,
          platform: payload.platform, // ✅ FIXED (was payload.os)
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