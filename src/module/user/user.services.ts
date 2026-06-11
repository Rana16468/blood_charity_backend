import mongoose from "mongoose";
import users from "./user.model";
import { TUser } from "./user.interface";
import { USER_ACCESSIBILITY } from "./user.constant";
import { jwtHelpers } from "../../app/helper/jwtHelpers";
import config from "../../app/config";
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

    // 🔐 1. Generate secret key FIRST
    const newSecretKey = generateKey(64);

    // 🔍 2. Check existing user
    let existingUser = await users.findOne(
      {
        email: payload.email,
        isDelete: false,
      },
      { _id: 1, role: 1, email: 1 },
      { session }
    );

    let userId: string;
    let userRole: string = payload.role || "user";

    // 👤 3. Create user if not exists
    if (!existingUser) {
      const newUser = new users({
        ...payload,
        generate_secret_key: newSecretKey, // ✅ FIXED HERE
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

    // 🔄 4. Update session/device info (NO duplicate secret key generation)
    await users.findOneAndUpdate(
      { email: payload.email },
      {
        $set: {
          browsername: payload.browsername,
          device: payload.device,
          engine: payload.engine,
          ipaddress: payload.ipaddress,
          os: payload.os,
          platform: payload.platform,
        },
      },
      { new: true, upsert: true, session }
    );

    // 🔐 5. JWT payload
    const jwtPayload: TJwtPayload = {
      id: userId,
      role: userRole,
      email: payload.email,
      generate_secret_key: newSecretKey,
    };

    // 🔐 6. Generate tokens
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

    // ✅ 7. Commit transaction
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