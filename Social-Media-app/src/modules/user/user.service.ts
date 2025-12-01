import type { Request, Response } from "express";
import { IFreezeAccountDto, ILogoutDto } from "./user.dto";
import {
  createLoginCredentials,
  createRevokeToken,
  LogoutEnum,
} from "../../utils/security/token.security";
import { Types, UpdateQuery } from "mongoose";
import {
  HUserDocument,
  IUser,
  RoleEnum,
  UserModel,
} from "../../DB/model/User.model";
import { UserRepository } from "../../DB/repository/user.repository";
import { JwtPayload } from "jsonwebtoken";
import {
  createPreSignedUploadLink,
  deleteFiles,
  uploadFiles,
} from "../../utils/multer/s3.config";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "../../utils/response/error.response";
import { s3Event } from "../../utils/multer/s3.event";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { ChatRepository, FriendRequestRepository, PostRepository } from "../../DB/repository";
import { ChatModel, PostModel } from "../../DB/model";
import { FriendRequestModel } from "./../../DB/model/FriendRequest.model";

class UserService {
  private userModel = new UserRepository(UserModel);
  private postModel = new PostRepository(PostModel);
  private chatModel = new ChatRepository(ChatModel)
  private friendRequestModel = new FriendRequestRepository(FriendRequestModel);
  constructor() {}

  profileImage = async (req: Request, res: Response): Promise<Response> => {
    // const key = await uploadLargeFile({
    //     file:req.file as Express.Multer.File,
    //     path:`users/${req.decoded?._id}`
    // })
    // return res.json({message:"Done", data:{key}})

    const {
      ContentType,
      originalname,
    }: { ContentType: string; originalname: string } = req.body;
    const { url, key } = await createPreSignedUploadLink({
      ContentType,
      originalname,
      path: `users/${req.decoded?._id}`,
      
    });
    const user = await this.userModel.findByIdAndUpdate({
      id: req.user?._id as Types.ObjectId,
      update: {
        profileImage: key,
        temProfileImage: req.user?.profileImage,
      },
    });
    if (!user) {
      throw new BadRequestException("Fail To Update User Profile Image");
    }

    s3Event.emit("trackProfileImageUpload", {
      userId: req.user?._id,
      oldKey: req.user?.profileImage,
      key,
      expiresIn: 30000,
    });
    return res.json({ message: "Done", data: { url, key } });
  };

  profileCoverImage = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const urls = await uploadFiles({
      files: req.files as Express.Multer.File[],
      path: `users/${req.decoded?._id}/cover`,
      useLarge: true,
    });
    const user = await this.userModel.findByIdAndUpdate({
      id: req.user?._id as Types.ObjectId,
      update: {
        coverImages: urls,
      },
    });
    if (!user) {
      throw new BadRequestException("Fail To Update Profile Cover");
    }
    if (req.user?.coverImages) {
      await deleteFiles({ urls: req.user.coverImages });
    }
    return res.json({ message: "Done", data: { urls } });
  };

  profile = async (req: Request, res: Response): Promise<Response> => {
    
    const profile = await this.userModel.findById({
        id:req.user?._id as Types.ObjectId,
        options:{
            populate:[
                {
                    path:"friends",
                    select: "firstName lastName gender email profileImage"
                },
            ],
        },
    });
    if (!profile) {
        throw new NotFoundException("fail to find user profile")
    }
    const groups = await this.chatModel.find({
      filter:{
        participants:{$in:req.user?._id as Types.ObjectId},
        group:{$exists:true}
      }
    })
    return res.json({
      message: "Done",
      data: { user: profile, decoded: req.decoded?.iat , groups},
    });
  };

  dashboard = async (req: Request, res: Response): Promise<Response> => {
    const results = await Promise.allSettled([
      await this.userModel.find({ filter: {} }),
      await this.postModel.find({ filter: {} }),
    ]);
    return res.json({ message: "Done", data: { results } });
  };

  changeRole = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params as unknown as { userId: Types.ObjectId };
    const { role }: { role: RoleEnum } = req.body;
    const denyRoles: RoleEnum[] = [role, RoleEnum.superAdmin];
    if (req.user?.role === RoleEnum.admin) {
      denyRoles.push(RoleEnum.admin);
    }
    const user = await this.userModel.findOneAndUpdate({
      filter: {
        _id: userId as Types.ObjectId,
        role: { $nin: denyRoles },
      },
      update: {
        role,
      },
    });
    if (!user) {
      throw new NotFoundException("fail to matching result");
    }
    return res.json({ message: "Done", data: { user } });
  };

  sendFriendRequest = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { userId } = req.params as unknown as { userId: Types.ObjectId };
    const checkFriendRequest = await this.friendRequestModel.findOne({
      filter: {
        createdBy: { $in: [req.user?._id, userId] },
        sendTo: { $in: [req.user?._id, userId] },
      },
    });
    if (checkFriendRequest) {
      throw new ConflictException("Friend Request already exists");
    }

    const user = await this.userModel.findOne({ filter: { _id: userId } });
    if (!user) {
      throw new NotFoundException("Invalid recipient");
    }

    const [friendRequest] = await this.friendRequestModel.create({
      data: [
        {
          createdBy: req.user?._id as Types.ObjectId,
          sendTo: userId,
        },
      ],
    }) || [];
    if (!friendRequest) {
        throw new BadRequestException("Something went wrong")
    }

    return res.json({ message: "Done" });
  };

  acceptFriendRequest = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { requestId } = req.params as unknown as { requestId: Types.ObjectId };
    const friendRequest = await this.friendRequestModel.findOneAndUpdate({
      filter: {
        _id:requestId,
        sendTo: req.user?._id,
        acceptedAt:{$exists: false}
      },
      update:{
        acceptedAt: new Date()
      },
    });
    console.log({
  requestId,
  currentUser: req.user?._id
});
    if (!friendRequest) {
      throw new NotFoundException("Fail to find matching result");
    }
    await Promise.all([
        await this.userModel.updateOne({
            filter: {_id: friendRequest.createdBy},
            update: {
                $addToSet: {friends: friendRequest.sendTo}
            },
        }),
         await this.userModel.updateOne({
            filter: {_id: friendRequest.sendTo},
            update: {
                $addToSet: {friends: friendRequest.createdBy},
            }
        }),
    ]);
       

    return res.json({ message: "Done" });
  };


  freezeAccount = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = (req.params as IFreezeAccountDto) || {};
    if (userId && req.user?.role !== RoleEnum.admin) {
      throw new ForbiddenException("Not Authorized User");
    }
    const user = await this.userModel.updateOne({
      filter: {
        _id: userId || req.user?._id,
        freezedAt: { $exists: false },
      },
      update: {
        freezedAt: new Date(),
        freezedBy: req.user?._id,
        changeCredentialsTime: new Date(),
        $unset: {
          restoredAt: 1,
          restoredBy: 1,
        },
      },
    });
    if (!user) {
      throw new NotFoundException(
        "User Not Found or Fail To Delete This Resources"
      );
    }
    return res.json({ message: "Done" });
  };

  logout = async (req: Request, res: Response): Promise<Response> => {
    const { flag }: ILogoutDto = req.body;
    let statusCode: number = 200;
    const update: UpdateQuery<IUser> = {};

    switch (flag) {
      case LogoutEnum.all:
        update.changeCredentialsTime = new Date();
        break;
      default:
        await createRevokeToken(req.decoded as JwtPayload);

        statusCode = 201;
        break;
    }

    await this.userModel.updateOne({
      filter: { _id: req.decoded?._id },
      update,
    });
    return res.status(statusCode).json({ message: "Done" });
  };

  refreshToken = async (req: Request, res: Response): Promise<Response> => {
    const credentials = await createLoginCredentials(req.user as HUserDocument);
    await createRevokeToken(req.decoded as JwtPayload);
    return res.status(201).json({ message: "Done", data: { credentials } });
  };

  updatePassword = async (req: Request, res: Response): Promise<Response> => {
    const { oldPassword, password } = req.body;

    if (
      !(await compareHash(oldPassword, req.user?.password as unknown as string))
    ) {
      throw new BadRequestException("In-valid Old Password");
    }

    if (req.user?.oldPassword?.length) {
      for (const hash of req.user?.oldPassword) {
        if (await compareHash(password, hash as unknown as string)) {
          throw new BadRequestException("This Password was used before");
        }
      }
    }

    const user = await this.userModel.findOneAndUpdate({
      filter: {
        _id: req.user?._id,
      },
      update: {
        password: await generateHash(password),
        $push: { oldPassword: req.user?.password },
      },
    });

    return res.json({ message: "Done", data: user });
  };

  updateEmail = async (req: Request, res: Response): Promise<Response> => {
    const {
      oldEmail,
      email,
      confirmEmail,
    }: { oldEmail: string; email: string; confirmEmail: string } = req.body;

    if (req.user?.email !== oldEmail) {
      throw new BadRequestException("Invalid old Email ");
    }

    if (email !== confirmEmail) {
      throw new BadRequestException("Email confirmation doesn't match");
    }

    const emailExists = await this.userModel.findOne({
      filter: { email },
    });

    if (emailExists) {
      throw new BadRequestException("Email already exists");
    }

    const user = await this.userModel.findOneAndUpdate({
      filter: {
        _id: req.user?._id,
        email: oldEmail,
      },
      update: {
        $set: { email: email },
        $push: { oldEmail: req.user?.email },
      },
    });

    return res.json({ message: "Done", data: user });
  };
}

export default new UserService();
