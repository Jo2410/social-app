// export interface ISignupBodyInputDTO{
//     username: string;
//     email: string;
//     password: string;
// }


import * as validators from "./auth.validation";
import {z} from "zod";
export type ISignupBodyInputDTO = z.infer<typeof validators.signup.body>
export type IConfirmEmailBodyInputDTO = z.infer<typeof validators.confirmEmail.body>
export type ILoginBodyInputDTO = z.infer<typeof validators.login.body>
export type ISendForgotCodeBodyInputsDTO = z.infer<typeof validators.sendForgotPasswordCode.body>
export type IVerifyForgotPasswordBodyInputsDTO = z.infer<typeof validators.verifyForgotPassword.body>
export type IResetForgotPasswordBodyInputsDTO = z.infer<typeof validators.resetForgotPassword.body>
export type IGmail = z.infer<typeof validators.signupWithGmail.body>