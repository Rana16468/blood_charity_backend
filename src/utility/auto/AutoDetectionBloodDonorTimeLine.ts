import catchError from "../../app/error/catchError";
import blood_donor from "../../module/donor_register/donor_register.model";

/**
 * @returns {Promise<Object>} 
 */
const AutoDetectionBloodDonorTimeLine = async () => {
  try {
  const currentTime = new Date();
  const timeThreshold = new Date(currentTime);
  timeThreshold.setMonth(timeThreshold.getMonth() - 3);

    
    const updateResult = await blood_donor.updateMany(
      {
        isBloodDonated: true,
        createdAt: { $lt: timeThreshold },
      },
      { 
        $set: { isBloodDonated: false } 
      }
    );

    return {
      success: true,
      modifiedCount: updateResult.modifiedCount,
      message: updateResult.modifiedCount > 0 
        ? `${updateResult.modifiedCount} donor records updated successfully.`
        : "No eligible donors found for update.",
    };

  } catch (error) {
    throw catchError(error);
  }
};

export default AutoDetectionBloodDonorTimeLine;