import { z } from 'zod';

 const LocationDataSchema = z.object({
   body:z.object({
    lat: z.number({ required_error: "Latitude is required" }),
  lng: z.number({ required_error: "Longitude is required" }),
  accuracy: z.number({ required_error: "Accuracy is required" }),
  address: z.string({ required_error: "Address is required" }).min(1, "Address cannot be empty"),
   })
});

const IsBloodDonatedSchema=z.object({
  body: z.object({
    isBloodDonated: z.boolean({required_error:"IS Blood Donated Required"})
  })
})

const DonorRegisterValidation={
    LocationDataSchema,
    IsBloodDonatedSchema
}

export default DonorRegisterValidation;