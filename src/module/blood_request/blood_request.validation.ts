import { z } from "zod";


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
  .enum(["volunteer", "request"])
  .default("request"), 
  isDelete: z.boolean().optional(),
});

const BloodRequestValidation={
   BloodRequestZodSchema
};

export default BloodRequestValidation;

