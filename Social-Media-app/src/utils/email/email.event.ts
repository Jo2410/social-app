import { EventEmitter } from "node:events"
import Mail from "nodemailer/lib/mailer";
import { sendEmail } from "./send.email";
import { verifyEmail } from "./verify.template.email";
export const emailEvent = new EventEmitter();

interface IEmail extends Mail.Options {
    otp: number
}

emailEvent.on("confirmEmail", async(data:IEmail)=>{

    try {
        data.subject = "confirmEmail",
        data.html = verifyEmail({otp:data.otp, title:"Email Confirmed"})
        await sendEmail(data)
    } catch (error) {
        console.log(`Fail To Send Email`, error);
        
    }
})


emailEvent.on("resetPassword", async(data:IEmail)=>{

    try {
        data.subject = "Reset-Account-Password",
        data.html = verifyEmail({otp:data.otp, title:"Reset Code "})
        await sendEmail(data)
    } catch (error) {
        console.log(`Fail To Send Email`, error);
        
    }
})