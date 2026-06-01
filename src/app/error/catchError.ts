import httpStatus from "http-status";
import ApiError from "./ApiError";




/**
 * Handles errors in a type-safe way and always throws an ApiError.
 * @param error - The caught error
 * @param errorMessage - Fallback error message if unknown error is thrown
 */
const catchError = (error: unknown, errorMessage = "Service temporarily unavailable"): never => {
  if (error instanceof ApiError) {
    throw error; 
  }

  if (error instanceof Error) {
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, error.message, "");
  }

  throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, errorMessage, "");
};

export default catchError;