import {z} from "zod";
import { LogoutEnum } from "../../utils/security/token.security";
import { Types } from "mongoose";
import { generalFields } from "../../middleware/validation.middleware";
import { RoleEnum } from "../../DB/model";

export const logout ={
    body:z.strictObject({
        flag:z.enum(LogoutEnum).default(LogoutEnum.only)
    })
}

export const sendFriendRequest = {
    params:z.strictObject({
        userId:generalFields.id,
    }),
}


export const acceptFriendRequest = {
    params:z.strictObject({
        requestId:generalFields.id,
    }),
}

export const changeRole = {
    params:z.strictObject({
        userId:generalFields.id,
    }),
    body:z.strictObject({
        role:z.enum(RoleEnum)
    })
}

export const freezeAccount = {
    params:z.object({
        userId:z.string().optional()
    }).optional().refine((data)=>{
        return data?.userId ? Types.ObjectId.isValid(data.userId) : true 
    }, {error:"In-valid objectId Format", path:['userId']})
}




export const updatePassword = {
    body: z.strictObject({
        oldPassword: generalFields.password,
        password: generalFields.password,
        confirmPassword: generalFields.confirmPassword,
    }).refine((data) => data.password !== data.oldPassword, {
        path: ["password"], 
        message: "New password must be different from old password"
    })
    .refine((data) => data.password === data.confirmPassword, { 
        path: ["confirmPassword"],  
        message: "Passwords do not match"  
    })
} 


export const updateEmail = {
    body: z.strictObject({
        oldEmail:generalFields.email,
        email:generalFields.email,
        confirmEmail:generalFields.email
    }).refine((data) => data.email !== data.oldEmail ,{
        path:["email"],
        message:"New email must be different from old email"
    })
    .refine((data) => data.email === data.confirmEmail ,{
        path:["confirmEmail"],
        message:"Email don't match"
    })
} 

