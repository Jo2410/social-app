import {z} from "zod";
import { generalFields } from "../../middleware/validation.middleware";


export const login = {
    body:z.object({
        email:generalFields.email,
        password:generalFields.password,
    })
}


export const signup = {
    body:login.body.extend({
        username:generalFields.username,
        confirmPassword:generalFields.confirmPassword,
    })
    .superRefine((data,ctx)=>{
        // console.log({data, ctx});

        if (data.confirmPassword !== data.password) {
            ctx.addIssue({
                code:"custom",
                path:['confirmEmail'],
                message: "password misMatch confirmPassword"
            })
        }
        

        if (data.username?.split(" ")?.length !=2) {
            ctx.addIssue({
                code:"custom",
                path:['username'],
                message: "username must consist of 2 parts like ex:JONE DOE"
            })
        }

    })
}


export const confirmEmail = {
    body:z.strictObject({
        email:generalFields.email,
        otp:generalFields.otp,
    })
}




export const signupWithGmail = {
    body:z.strictObject({
        idToken:z.string(),
        otp:generalFields.otp,
    })
}


export const sendForgotPasswordCode = {
    body:z.strictObject({
        email:generalFields.email,
    })
}


export const verifyForgotPassword = {
    body:sendForgotPasswordCode.body.extend({
        otp:generalFields.otp,
    })
}


export const resetForgotPassword = {
    body:verifyForgotPassword.body.extend({
        otp:generalFields.otp,
        password:generalFields.password,
        confirmPassword:generalFields.password,        
    }).refine((data)=>{
        return data.password === data.confirmPassword;
    }, {message:"password Mismatch confirmPassword", path:["confirmPassword"]})
}

