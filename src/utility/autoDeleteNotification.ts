import catchError from "../app/error/catchError";
import notifications from "../module/notification/notification.model";

/**
 
 * @returns {Promise<object>} 
 */
const autoDeleteNotification = async () => {
    try {
        const currentTime = new Date();
        
        
        const timeThreshold = new Date(currentTime);
        timeThreshold.setDate(timeThreshold.getDate() - 3);
        const result = await notifications.deleteMany({
            createdAt: { $lt: timeThreshold },
        });

        

        return result; 
    } catch (error) {
        
        throw catchError(error);
    }
};

export default autoDeleteNotification;