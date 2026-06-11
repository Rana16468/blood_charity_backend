import { Server as IOServer, Socket } from "socket.io";
import users from "../module/user/user.model";
import httpStatus from "http-status";
import { emitResponse, errorResponse, successResponse } from "../utility/socketSendRespone";
import { USER_ROLE } from "../module/user/user.constant";
import { decrypt } from "../utility/encryptionHelper/CeyptoSecurity";
import BloodRequestValidation from "../module/blood_request/blood_request.validation";
import blood_requests from "../module/blood_request/blood_request.model";



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
  socket.join(role); 

  console.log(`User joined role room: ${role}`);
});

socket.on(
  "blood_request",
  async (data, callback) => {
    try {

      if (!currentUserId) {
        return callback?.({
          success: false,
          message: "Unauthorized user",
        });
      }


      const decryptData = await decrypt(
        data.encrypted,
        generate_secret_key
      );

 
      const validation =
        await BloodRequestValidation.BloodRequestZodSchema.parseAsync(
          decryptData.decrypted
        );


      const bloodRequestBuilder = new blood_requests(validation);
      const result = await bloodRequestBuilder.save();

      if (!result) {
        return callback?.({
          success: false,
          message: "Something went wrong while saving request",
        });
      }

      
      const notificationPayload = {
        type: "BLOOD_REQUEST",
        message: "New blood request created",
        data: result,
        createdAt: new Date(),
      };

    
      io.to("donor").emit(
        "blood_request_notification",
        notificationPayload
      );

     
      io.to("admin").emit(
        "blood_request_notification",
        notificationPayload
      );

    
      return callback?.({
        success: true,
        message: "Blood request created successfully",
        data: result,
      });
    } catch (error) {
      console.error("Blood request socket error:", error);

      return callback?.({
        success: false,
        message: "Something went wrong",
      });
    }
  }
);

};

export default handleEvents;