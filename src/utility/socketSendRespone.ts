import httpStatus from "http-status";
import { Socket } from "socket.io";

export const successResponse = <T>(message: string, data: T, status = httpStatus.OK) => {
  return {
    success: true,
    message,
    status,
    data,
  };
};


export const errorResponse = (message: string, status :any) => {
  return {
    success: false,
    message,
    status,
  };
};


export const emitResponse = (socket: Socket, event: string, data: any, callback?: Function) => {
  if (callback) return callback(data);
  socket.emit(event, data);
};