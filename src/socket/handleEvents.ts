import { Server as IOServer, Socket } from "socket.io";
import users from "../module/user/user.model";
import httpStatus from "http-status";
import { emitResponse, errorResponse, successResponse } from "../utility/socketSendRespone";
import { USER_ACCESSIBILITY, USER_ROLE } from "../module/user/user.constant";
import { decrypt } from "../utility/encryptionHelper/CeyptoSecurity";
import BloodRequestValidation from "../module/blood_request/blood_request.validation";
import blood_requests from "../module/blood_request/blood_request.model";
import notifications from "../module/notification/notification.model";
import mongoose from "mongoose";
import ApiError from "../app/error/ApiError";
import { BloodRequestType } from "../module/blood_request/blood_request.constant";
import blood_donor from "../module/donor_register/donor_register.model";



const handleEvents = (io: IOServer, socket: Socket, currentUserId: string, generate_secret_key: string, role: string) => {
  
  socket.on("my_profile", async (_, callback) => {
    try {
      const user = await users.findById(currentUserId).select("-generate_secret_key");

      if (!user) {
        const error = errorResponse("User not found in database", httpStatus.NOT_FOUND,);

        return emitResponse(socket, "my_profile_error", error, callback);
      }

      const response = successResponse(
        "Successfully fetched profile",
        user,
        httpStatus.OK
      );

      return emitResponse(socket, "my_profile_success", response, callback);

    } catch (err: any) {
      const error = errorResponse(
        err?.message || "Internal server error",
        httpStatus.INTERNAL_SERVER_ERROR
      );

      return emitResponse(socket, "my_profile_error", error, callback);
    }
  });

  socket.on("navigation_profile", async (_, callback) => {
  try {
   
    const user = await users
      .findById(currentUserId)
      .select("_id name picture role");

    if (!user) {
      const error = errorResponse(
        "Navigation profile not found",
        httpStatus.NOT_FOUND
      );

      return emitResponse(socket, "navigation_profile_error", error, callback);
    }

    const response = successResponse(
      "Navigation profile fetched successfully",
      user,
      httpStatus.OK
    );

    return emitResponse(socket, "navigation_profile_success", response, callback);

  } catch (err: any) {
    const error = errorResponse(
      err?.message || "Internal server error",
      httpStatus.INTERNAL_SERVER_ERROR
    );

    return emitResponse(socket, "navigation_profile_error", error, callback);
  }
});


socket.on("update_profile", async (data, callback) => {
  try {
    if (!currentUserId) {
      return callback?.({
        success: false,
        message: "Unauthorized user",
      });
    }
    const isExistProfile = await users
      .findById(currentUserId)
      .select("_id role");

    if (!isExistProfile) {
      return callback?.({
        success: false,
        message: "User not found",
      });
    }

    const updateData = {} as any;

    if (data.name) updateData.name = data.name;
    if (data.picture) updateData.picture = data.picture;
    if (data.email) updateData.email = data.email;

    const result = await users.findByIdAndUpdate(
      currentUserId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

   
    io.to(currentUserId).emit("profile_updated", {
      userId: currentUserId,
      data: result,
    });

  
    socket.emit("update_profile_success", {
      success: true,
      data: result,
    });

    callback?.({
      success: true,
      message: "Profile update successful",
      data: result,
    });

  } catch (error) {
    console.error("Update profile error:", error);

    callback?.({
      success: false,
      message: "Something went wrong",
    });
  }
});


socket.on("join", ({  role }) => {
  console.log("joining room:", role); 
    socket.join(role);
    

});
socket.on("blood_request", async (data, callback) => {
  if (!currentUserId) {
    return callback?.({
      success: false,
      message: "Unauthorized user",
    });
  }

  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);


    const todaysRequestCount = await blood_requests.countDocuments({
      userId: currentUserId, 
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    });

    if (todaysRequestCount >= 3) {
      return callback?.({
        success: false,
        message: "Daily request limit reached. You can only create 3 blood requests per day.",
      });
    }
  } catch (countError) {
    console.error("Error checking daily limit:", countError);
    return callback?.({
      success: false,
      message: "Server error while verifying request limits.",
    });
  }

  const session = await mongoose.startSession();
  let transactionCommitted = false;
  let savedResult = null;

  try {
    session.startTransaction();

    const decryptData = await decrypt(data.encrypted, generate_secret_key);
    const validatedData = await BloodRequestValidation.BloodRequestZodSchema.parseAsync(
      decryptData.decrypted
    );

    const requestData = { ...validatedData, userId: currentUserId };

    const [result] = await blood_requests.create([requestData], { session });

    if (!result) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Failed to save blood request", "");
    }

    await notifications.create(
      [
        {
          userId: currentUserId,
          title: "Blood Request",
          content: "New blood request created",
          route: `/blood-request/${result._id}`,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    transactionCommitted = true;
    savedResult = result;

  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }


    if (error?.name === "ZodError") {
      return callback?.({
        success: false,
        message: "Validation failed",
        errors: error.errors,
      });
    }

    return callback?.({
      success: false,
      message: error instanceof ApiError ? error.message : "Something went wrong",
    });
  } finally {
    await session.endSession();
  }

  if (transactionCommitted && savedResult) {
    const notificationPayload = {
      type: "BLOOD_REQUEST",
      message: "New blood request created",
      data: savedResult,
      createdAt: new Date(),
    };
io.to(USER_ROLE.donor.toLowerCase()).emit("blood_request_notification", notificationPayload);
io.to(USER_ROLE.admin.toLowerCase()).emit("blood_request_notification", notificationPayload);

    socket.emit("blood_request", {
      success: true,
      data: savedResult,
    });

    return callback?.({
      success: true,
      message: "Blood request created successfully",
      data: savedResult,
    });
  }
});

socket.on("donor_register", async (data, callback) => {
  const session = await mongoose.startSession();

  try {
    if (!currentUserId) {
      return callback?.({
        success: false,
        message: "Unauthorized user",
      });
    }

    session.startTransaction();

   
    const decryptData = await decrypt(data.encrypted, generate_secret_key);

    if (!decryptData?.decrypted) {
      throw new Error("Invalid encrypted data");
    }

   
    const validation =
      await BloodRequestValidation.DonorRegisterValidation.parseAsync(
        decryptData.decrypted
      );

   
    if (validation.userId !== currentUserId.toString()) {
      throw new Error("Invalid user access");
    }

   
    const isExistAlreadyRegister = await users.findOne(
      {
        _id: currentUserId,
        isDonorRegister: true,
        isVerify: true,
        status: USER_ACCESSIBILITY.isProgress,
      },
      null,
      { session }
    );

    if (isExistAlreadyRegister) {
      throw new Error("User already registered as donor");
    }

    
    const existingDonor = await blood_donor.findOne(
      {
        userId: currentUserId,
        isDelete: false,
      },
      null,
      { session }
    );

    if (existingDonor) {
      throw new Error("User is already registered as a donor");
    }

    
    const volunteerRequest = await blood_donor.create(
      [
        {
          userId: currentUserId,
          name: validation.name,
          phone: validation.phone,
          blood: validation.blood,
          locationData: {
            lat: validation.lat,
            lng: validation.lng,
            accuracy: validation.accuracy,
            address: validation.address,
          },
          bloodRequestType: BloodRequestType.volunteer,
        },
      ],
      { session }
    );

    const donor = volunteerRequest[0];

    // 7. update user
    await users.findByIdAndUpdate(
      currentUserId,
      {
        $set: {
          isDonorRegister: true,
        },
      },
      {
        new: true,
        session,
      }
    );

    await notifications.create(
      [
        {
          userId: currentUserId,
          title: "Blood Donor Registration Successful",
          content: "You have successfully registered as a blood donor.",
          route: `/blood-donor/${donor._id}`,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const notificationPayload = {
      type: "BLOOD_DONOR_REGISTER",
      message: "New blood donor registered",
      data: donor,
      createdAt: new Date(),
    };

    io.to(USER_ROLE.donor.toLowerCase()).emit(
      "blood_donor_notification",
      notificationPayload
    );

    io.to(USER_ROLE.admin.toLowerCase()).emit(
      "blood_donor_notification",
      notificationPayload
    );

    socket.emit("donor_register", {
      success: true,
      data: donor,
    });

    return callback?.({
      success: true,
      message: "Blood donor registered successfully.",
      data: donor,
    });
  } catch (error: any) {
    await session.abortTransaction();

    console.error("Donor registration error:", error);

    return callback?.({
      success: false,
      message: error.message || "Failed to register donor.",
    });
  } finally {
    session.endSession();
  }
});




};





export default handleEvents;