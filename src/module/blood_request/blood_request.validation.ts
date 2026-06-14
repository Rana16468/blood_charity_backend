import { z } from "zod";
import { BloodRequestType } from "./blood_request.constant";


const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number(),
  address: z.string(),
});


 const BloodRequestZodSchema = z.object({
  userId: z.string(), 
  blood: z.string().min(1, "Blood group is required"),
  phone: z.string().min(10, "Phone number is too short"),
  hospital: z.string().min(1, "Hospital is required"),
  urgency: z.string().min(1, "Urgency is required"),
  locationData: LocationSchema,
  bloodResuestType: z
  .enum([BloodRequestType.volunteer, BloodRequestType.request])
  .default( BloodRequestType.request), 
  isDelete: z.boolean().optional(),
});

const DonorRegisterValidation= z.object({
  userId: z.string({required_error:"userId is required"}),
  name: z.string({required_error:"name is required"}),
  phone: z.string().min(10, "Phone number is too short").max(15,"Phone number is too large"),
  blood: z.string().min(1, "Blood group is required"),
  lat : z.number(),
  lng: z.number(),
  accuracy: z.number(),
  address: z.string(),



})

const BloodRequestValidation={
   BloodRequestZodSchema,
   DonorRegisterValidation
};

export default BloodRequestValidation;

