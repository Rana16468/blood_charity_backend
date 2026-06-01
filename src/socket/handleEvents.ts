import { Server as IOServer, Socket } from "socket.io";
import users from "../module/user/user.model";
import httpStatus from "http-status";
import { emitResponse, errorResponse, successResponse } from "../utility/socketSendRespone";
import { USER_ROLE } from "../module/user/user.constant";



const handleEvents = (io: IOServer, socket: Socket, currentUserId: string) => {
  
  socket.on("my_profile", async (_, callback) => {
    try {
      const user = await users.findById(currentUserId);

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

};

export default handleEvents;