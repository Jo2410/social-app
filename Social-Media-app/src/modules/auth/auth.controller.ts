import * as validators  from './auth.validation'
import {validation} from '../../middleware/validation.middleware'
import { Router } from "express";
import authService from "./auth.service";

const router = Router();


router.post("/signup", validation(validators.signup) ,authService.signup)
router.patch("/confirm-Email", validation(validators.confirmEmail) ,authService.confirmEmail)

router.post("/signup-gmail", validation(validators.signupWithGmail), authService.signupWithGmail)
router.post("/login-gmail", validation(validators.signupWithGmail), authService.loginWithGmail)

router.post("/login", validation(validators.login) ,authService.login)
router.patch("/send-forgot-password", validation(validators.sendForgotPasswordCode) ,authService.sendForgotCode)
router.patch("/verify-forgot-password", validation(validators.verifyForgotPassword) ,authService.verifyForgotPassword)
router.patch("/reset-forgot-password", validation(validators.resetForgotPassword) ,authService.resetForgotPassword)


export default router