import { z } from 'zod';

const ContractValidationSchema=z.object({
    body:z.object({
        name: z.string({required_error:"Name is Required"}).min(1, 'name is Required'),
        email: z.string({required_error:"Email is Optional"}).email().optional(),
        phoneNumber: z.string({required_error:"phone Number is Required"}).min(1, 'phone Number is Required'),
        address: z.string({required_error:"Address is Required"}).min(1, 'address is Required'),
        photo: z.string({required_error:"profile picture is required"}).min(1, 'profile picture is required').optional(),
        isfavorite:z.boolean().default(false),
        isDelete: z.boolean().default(false),
    })
});

const UpdateContractValidationSchema=z.object({
    body:z.object({
        name: z.string({required_error:"Name is Required"}).min(1, 'name is Required').optional(),
        email: z.string({required_error:"Email is Optional"}).optional(),
        phoneNumber: z.string({required_error:"phone Number is Required"}).min(1, 'phone Number is Required').optional(),
        address: z.string({required_error:"Address is Required"}).min(1, 'address is Required').optional(),
        photo: z.string({required_error:"profile picture is required"}).min(1, 'profile picture is required').optional(),
        isfavorite:z.boolean().default(false),
        isDelete: z.boolean().default(false),
    })
});

export  const ContractValidation={
    ContractValidationSchema,
    UpdateContractValidationSchema
}
