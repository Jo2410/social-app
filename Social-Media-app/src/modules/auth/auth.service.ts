import type { Request, Response } from "express";
import {
  IConfirmEmailBodyInputDTO,
  IGmail,
  ILoginBodyInputDTO,
  IResetForgotPasswordBodyInputsDTO,
  ISendForgotCodeBodyInputsDTO,
  ISignupBodyInputDTO,
  IVerifyForgotPasswordBodyInputsDTO,
} from "./auth.dto";
import { ProviderEnum, UserModel } from "../../DB/model/User.model";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "../../utils/response/error.response";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { emailEvent } from "../../utils/email/email.event";
import { generateNumberOtp } from "../../utils/otp";
import { createLoginCredentials } from "../../utils/security/token.security";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { UserRepository } from "../../DB/repository";

class AuthenticationService {
  private userModel = new UserRepository(UserModel);

  constructor() {}

  /**
   *
   * @param req -Express.Request
   * @param res -Express.Response
   * @returns Promise<Response>
   * @example ({{ username, email, password}: ISignupBodyInputDTO })
   * return {message:"Done", statusCode:201}
   */

  private async verifyGmailAccount(idToken: string): Promise<TokenPayload> {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.WEB_CLIENT_ID?.split(",") || [],
    });
    const payload = ticket.getPayload();
    if (!payload?.email_verified) {
      throw new BadRequestException("Fail To Verify This Google Account");
    }
    return payload;
  }

  loginWithGmail = async (req: Request, res: Response): Promise<Response> => {
    const { idToken }: IGmail = req.body;
    const { email } = await this.verifyGmailAccount(idToken);

    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.GOOGLE,
      },
    });
    if (!user) {
      throw new NotFoundException(
        "Not Register Account Or Registered with Another Provider"
      );
    }

    const credentials = await createLoginCredentials(user);
    return res.json({ message: "Done", data: { credentials } });
  };

  signupWithGmail = async (req: Request, res: Response): Promise<Response> => {
    const { idToken }: IGmail = req.body;
    const { email, family_name, given_name, picture } =
      await this.verifyGmailAccount(idToken);

    const user = await this.userModel.findOne({
      filter: {
        email,
      },
    });
    if (user) {
      if (user.provider === ProviderEnum.GOOGLE) {
        return await this.loginWithGmail(req, res);
      }
      throw new ConflictException(
        `Email Exist With Another Provider :: ${user.provider}`
      );
    }

    const [newUser] =
      (await this.userModel.create({
        data: [
          {
            firstName: given_name as string,
            lastName: family_name as string,
            profileImage: picture as string,
            confirmedAt: new Date(),
          },
        ],
      })) || [];
    if (!newUser) {
      throw new BadRequestException(
        "Fail To Signup With Gmail Please Try Again Later"
      );
    }
    const credentials = await createLoginCredentials(newUser);
    return res.status(201).json({ message: "Done", data: { credentials } });
  };

  signup = async (req: Request, res: Response): Promise<Response> => {
    let { username, email, password }: ISignupBodyInputDTO = req.body;
    console.log({ username, email, password });

    const checkUserExist = await this.userModel.findOne({
      filter: { email },
      select: "email",
      options: {
        lean: false,
        // populate: [{path: "username"}]
      },
    });
    if (checkUserExist?._id) {
      throw new ConflictException("Email Exist");
    }
    const otp = generateNumberOtp();

    const user = await this.userModel.createUser({
      data: [
        {
          username,
          email,
          password,
          confirmEmailOtp:`${otp}`,
        },
      ],
    });

    return res.status(201).json({ message: "Done", data: { user } });
  };

  confirmEmail = async (req: Request, res: Response): Promise<Response> => {
    const { email, otp }: IConfirmEmailBodyInputDTO = req.body;

    const user = await this.userModel.findOne({
      filter: {
        email,
        confirmEmailOtp: { $exists: true },
        confirmedAt: { $exists: false },
      },
    });
    if (!user) {
      throw new NotFoundException("In-valid Account");
    }

    if (!(await compareHash(otp, user.confirmEmailOtp as string))) {
      throw new ConflictException("in-valid Confirmation Code");
    }

    await this.userModel.updateOne({
      filter: { email },
      update: {
        confirmedAt: new Date(),
        $unset: { confirmEmailOtp: true },
      },
    });
    return res.status(200).json({ message: "Done", data: req.body });
  };

  login = async (req: Request, res: Response): Promise<Response> => {
    const { email, password }: ILoginBodyInputDTO = req.body;
    const user = await this.userModel.findOne({
      filter: { email, provider: ProviderEnum.SYSTEM },
    });
    if (!user) {
      throw new NotFoundException("In-valid Login");
    }
    if (!user.confirmedAt) {
      throw new BadRequestException("Verify Your Account First");
    }
    if (!(await compareHash(password, user.password))) {
      throw new NotFoundException("In-valid Login");
    }

    const credentials = await createLoginCredentials(user);

    return res.status(200).json({ message: "Done", data: { credentials } });
  };

  sendForgotCode = async (req: Request, res: Response): Promise<Response> => {
    const { email }: ISendForgotCodeBodyInputsDTO = req.body;
    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        confirmedAt: { $exists: true },
      },
    });
    if (!user) {
      throw new NotFoundException("In-valid Account");
    }

    const otp = generateNumberOtp();
    const result = await this.userModel.updateOne({
      filter: { email },
      update: {
        resetPasswordOtp: await generateHash(String(otp)),
      },
    });
    if (!result.matchedCount) {
      throw new BadRequestException(
        "Fail To send The Reset Code Please Try Again "
      );
    }
    emailEvent.emit("resetPassword", { to: email, otp });
    return res.status(200).json({ message: "Done" });
  };

  verifyForgotPassword = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { email, otp }: IVerifyForgotPasswordBodyInputsDTO = req.body;
    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        resetPasswordOtp: { $exists: true },
      },
    });
    if (!user) {
      throw new NotFoundException(
        "in-valid account due to one of the following reasons [not register, invalid provider , not confirmed account]"
      );
    }

    if (!(await compareHash(otp, user.resetPasswordOtp as string))) {
      throw new ConflictException("in-valid otp");
    }

    return res.status(200).json({ message: "Done" });
  };

  resetForgotPassword = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { email, otp, password }: IResetForgotPasswordBodyInputsDTO =
      req.body;
    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        resetPasswordOtp: { $exists: true },
      },
    });
    if (!user) {
      throw new NotFoundException(
        "in-valid account due to one of the following reasons [not register, invalid provider , not confirmed account]"
      );
    }

    if (!(await compareHash(otp, user.resetPasswordOtp as string))) {
      throw new ConflictException("in-valid otp");
    }
    const result = await this.userModel.updateOne({
      filter: { email },
      update: {
        password: await generateHash(password),
        changeCredentialsTime: new Date(),
        $unset: { resetPasswordOtp: 1 },
      },
    });
    if (!result.matchedCount) {
      throw new BadRequestException(
        "Fail To send The Reset Code Please Try Again "
      );
    }

    return res.status(200).json({ message: "Done" });
  };
}

export default new AuthenticationService();
