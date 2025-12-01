import type { Request, Response } from "express";
import {
  BadRequestException,
  NotFoundException,
} from "../../utils/response/error.response";
import { ICreateChattingGroupParamsDTO, IGetChatParamsDTO, IGetChatQueryParamsDTO, ISayHiDTO, ISendMessageDTO } from "./chat.dto";
import { ChatRepository, UserRepository } from "../../DB/repository";
import { ChatModel, UserModel } from "../../DB/model";
import { Types } from "mongoose";
import { connectedSockets } from "../gateway";
import { deleteFile, uploadFile } from "../../utils/multer/s3.config";
import {v4 as uuid } from "uuid";
export class ChatService {
  private chatModel: ChatRepository = new ChatRepository(ChatModel);
  private userModel: UserRepository = new UserRepository(UserModel);
  constructor() {}

  //REST
  getChat = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params as IGetChatParamsDTO;
    const { page, size }: IGetChatQueryParamsDTO = req.query ;

    const chat = await this.chatModel.findOneChat({
      filter: {
        participants: {
          $all: [
            req.user?._id as Types.ObjectId,
            Types.ObjectId.createFromHexString(userId),
          ],
        },
        group: { $exists: false },
      },
      options: {
        populate: [
          {
            path: "participants",
            select: "firstName lastName email gender profilePicture",
          },
        ],
      },
      page,
      size,
    });

    if (!chat) {
      throw new BadRequestException("Fail to find matching instance");
    }
    return res.status(200).json({ message: "Done", data: { chat } });
  };


  createChattingGroup = async (req: Request, res: Response): Promise<Response> => {
    
    const {group, participants}:ICreateChattingGroupParamsDTO = req.body;
    const dbParticipants = participants.map((participant:string)=>{
      return Types.ObjectId.createFromHexString(participant)
    })
    const users = await this.userModel.find({
      filter:{
        _id:{$in: dbParticipants},
        friends:{$in: req.user?._id as Types.ObjectId},
      }
    })
    if (participants.length != users.length) {
      throw new NotFoundException("some or all recipient all invalid")
    }
    let group_image:string|undefined=undefined;
    const roomId = group.replaceAll(/\s+/g , "_")+"_"+uuid()
    if (req.file) {
      group_image = await uploadFile({file:req.file as Express.Multer.File, path:`chat/${roomId}`})
    }
    dbParticipants.push(req.user?._id as Types.ObjectId)
    const [newGroup] = await this.chatModel.create({
      data:[{
        createdBy:req.user?._id as Types.ObjectId,
        group,
        roomId,
        group_image:group_image as string,
        messages:[],
        participants:dbParticipants

      }]
    })||[]
    if(!newGroup){
      if (group_image) {
        await deleteFile({Key: group_image })
      }
      throw new BadRequestException("Fail to generate this group")
    }
    return res.status(201).json({ message: "Done", data: { group:newGroup } });
  };


  //IO
  sayHi = ({ message, socket, callback, io }: ISayHiDTO) => {
    try {
      console.log({ message });
      throw new BadRequestException("some error");
      callback ? callback("Hello BE to FE") : undefined;
    } catch (error) {
      socket.emit("custom_error", error);
    }
  };
  //send OVO message
  sendMessage = async ({
    content,
    sendTo,
    socket,
    callback,
    io,
  }: ISendMessageDTO) => {
    try {
      const createdBy = socket.credentials?.user._id as Types.ObjectId;
      console.log({ content, sendTo, createdBy });
      const user = await this.userModel.findOne({
        filter: {
          _id: Types.ObjectId.createFromHexString(sendTo),
          friends: { $in: createdBy },
        },
      });
      if (!user) {
        throw new NotFoundException("Invalid recipient friend");
      }
      const chat = await this.chatModel.findOneAndUpdate({
        filter: {
          participants: {
            $all: [
              createdBy as Types.ObjectId,
              Types.ObjectId.createFromHexString(sendTo),
            ],
          },
          group: { $exists: false },
        },
        update: {
          $addToSet: { messages: { content, createdBy } },
        },
      });
      if (!chat) {
        const [newChat] =
          (await this.chatModel.create({
            data: [
              {
                createdBy,
                messages: [{ content, createdBy }],
                participants: [
                  createdBy as Types.ObjectId,
                  Types.ObjectId.createFromHexString(sendTo),
                ],
              },
            ],
          })) || [];
        if (!newChat) {
          throw new BadRequestException("Fail to create this chat instance");
        }
      }

      const socketIds = connectedSockets.get(createdBy.toString());
      if (socketIds && io) {
        io.to(socketIds).emit("successMessage", { content });
      }
      //   io?.to(
      //     connectedSockets.get(createdBy.toString() as string) as string[]
      //   ).emit("successMessage", { content });



        const recipientSocketId = connectedSockets.get(sendTo);
        if (recipientSocketId && io) {
        io.to(recipientSocketId).emit("newMessage", { content, from: socket.credentials?.user });
    }

    } catch (error) {
      socket.emit("custom_error", error);
    }
  };
}
