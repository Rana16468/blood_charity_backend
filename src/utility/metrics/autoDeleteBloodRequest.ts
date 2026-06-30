import catchError from "../../app/error/catchError";
import blood_requests from "../../module/blood_request/blood_request.model";

const autoDeleteBloodRequest = async () => {
  try {
    const currentTime = new Date();
    const timeThreshold = new Date(currentTime);
    
    
    timeThreshold.setDate(timeThreshold.getDate() - 3);

    
    const result = await blood_requests.deleteMany({
      createdAt: { $lt: timeThreshold },
      isDonorFind: false, 
    });

    return result; 
  } catch (error) {
    throw catchError(error);
  }
};

export default autoDeleteBloodRequest;