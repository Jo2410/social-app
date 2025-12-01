import type { Request, Response } from "express";
import { PostRepository, UserRepository } from "../../DB/repository";
import {
  AvailabilityEnum,
  HPostDocument,
  LikeActionEnum,
  PostModel,
} from "../../DB/model/Post.model";
import { RoleEnum, UserModel } from "../../DB/model/User.model";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "../../utils/response/error.response";
import { deleteFiles, uploadFiles } from "../../utils/multer/s3.config";
import { v4 as uuid } from "uuid";
import { LikePostQueryInputsDto } from "./post.dto";
import { Types, UpdateQuery } from "mongoose";
import { IFreezeAccountDto } from "../user/user.dto";

export const postAvailability = (req: Request) => {
  return [
    { availability: AvailabilityEnum.public },
    { availability: AvailabilityEnum.onlyMe, createdBy: req.user?._id },
    {
      availability: AvailabilityEnum.friends,
      createdBy: { $in: [...(req.user?.friends || []), req.user?._id] },
    },
    {
      availability: { $ne: AvailabilityEnum.onlyMe },
      tags: { $in: req.user?._id },
    },
  ];
};

class PostService {
  private userModel = new UserRepository(UserModel);
  private postModel = new PostRepository(PostModel);
  constructor() {}

  createPost = async (req: Request, res: Response): Promise<Response> => {
    if (
      req.body.tags?.length &&
      (
        await this.userModel.find({
          filter: { _id: { $in: req.body.tags, $ne: req.user?._id } },
        })
      ).length !== req.body.tags.length
    ) {
      throw new NotFoundException("some of the mentioned users are not exists");
    }

    let attachments: string[] = [];
    let assetsFolderId: string = uuid();
    if (req.files?.length) {
      attachments = await uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${req.user?._id}/post/${assetsFolderId}`,
      });
    }
    const [post] =
      (await this.postModel.create({
        data: [
          {
            ...req.body,
            attachments,
            assetsFolderId,
            createdBy: req.user?._id,
          },
        ],
      })) || [];
    if (!post) {
      if (attachments.length) {
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException("Fail to Create this Post");
    }
    return res.status(201).json({ message: "Done" });
  };

  updatePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as unknown as { postId: Types.ObjectId };
    const post = await this.postModel.findOne({
      filter: {
        _id: postId,
        createdBy: req.user?._id,
      },
    });
    if (!post) {
      throw new NotFoundException("Fail to find matching result ");
    }

    if (
      req.body.tags?.length &&
      (
        await this.userModel.find({
          filter: { _id: { $in: req.body.tags, $ne: req.user?._id } },
        })
      ).length !== req.body.tags.length
    ) {
      throw new NotFoundException("some of the mentioned users are not exists");
    }

    let attachments: string[] = [];
    let assetsFolderId: string = uuid();
    if (req.files?.length) {
      attachments = await uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
      });
    }
    const updatePost = await this.postModel.updateOne({
      filter: { _id: post._id },
      update: [
        {
          $set: {
            content: req.body.content,
            allowComments: req.body.AllowComments || post.allowComments,
            availability: req.body.availability || post.availability,
            attachments: {
              $setUnion: [
                {
                  $setDifference: [
                    "$attachments",
                    req.body.removedAttachments || [],
                  ],
                },
                attachments,
              ],
            },

            tags: {
              $setUnion: [
                {
                  $setDifference: [
                    "$tags",
                    (req.body.removedTags || []).map((tag: string) => {
                      return Types.ObjectId.createFromHexString(tag);
                    }),
                  ],
                },
                (req.body.tags || []).map((tag: string) => {
                  return Types.ObjectId.createFromHexString(tag);
                }),
              ],
            },
          },
        },
      ],
    });
    if (!updatePost.matchedCount) {
      if (attachments.length) {
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException("Fail to Create this Post");
    } else {
      if (req.body.removedAttachments.length) {
        await deleteFiles({ urls: req.body.removedAttachments });
      }
    }
    return res.status(201).json({ message: "Done" });
  };

  likePost = async (req: Request, res: Response): Promise<any> => {
    const { postId } = req.params as { postId: string };
    const { action } = req.query as LikePostQueryInputsDto;
    let update: UpdateQuery<HPostDocument> = {
      $addToSet: { likes: req.user?._id },
    };

    if (action === LikeActionEnum.unlike) {
      update = { $pull: { likes: req.user?._id } };
    }

    const post = await this.postModel.findOneAndUpdate({
      filter: {
        _id: postId,
        $or: postAvailability(req),
      },
      update,
    });
    if (!post) {
      throw new NotFoundException("in-valid postId or post not exists");
    }

    res.status(200).json({ message: "Done" });
  };

  postList = async (req: Request, res: Response): Promise<any> => {
    let { page, size } = req.query as unknown as { page: number; size: number };

    const posts = await this.postModel.paginate({
      filter: {
        $or: postAvailability(req),
      },
      options: {
        populate: [
          {
            path: "comments",
            match: {
              commentId: { $exists: false },
              freezedAt: { $exists: false },
            },
            populate: [
              {
                path: "reply",
                match: {
                  commentId: { $exists: false },
                  freezedAt: { $exists: false },
                },
                populate: [
                  {
                    path: "reply",
                    match: {
                      commentId: { $exists: false },
                      freezedAt: { $exists: false },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      page,
      size,
    });
    // let result = [];
    // for (const post of posts.result) {
    //   const comments = await this.commentModel.find({    //in memory
    //     filter:{
    //       postId:post._id,
    //       commentId:{$exists:false}
    //     }
    //   });
    //   result.push({post, comments})
    // }
    // posts.result = result

    // const posts = await this.postModel.findCursor({          //mongoose stream
    //     filter:{
    //       $or: postAvailability(req)
    //     }
    // })

    // console.log({s:posts.length});
    res.status(200).json({ message: "Done", data: { posts } });
  };


  getPost = async (req: Request, res: Response): Promise<any> => {
    const {postId} = req.params as unknown as {postId:Types.ObjectId};

    const post  =await this.postModel.findById({
      id:postId,
       options: {
        populate: [
          {
            path: "comments",
            match: {
              commentId: { $exists: false },
              freezedAt: { $exists: false },
            },
          }
        ]
      }
    })
    if (!post) {
      throw new NotFoundException("Fail to find post")
    }

    res.status(200).json({ message: "Done", data:{post}});
  };

  freezePost = async (req: Request, res: Response): Promise<any> => {
    const { userId } = (req.params as IFreezeAccountDto) || {};
    if (userId && req.user?.role !== RoleEnum.admin) {
      throw new ForbiddenException("Not Authorized User");
    }

    const { postId } = req.params as unknown as { postId: Types.ObjectId };
    if (!postId) {
      throw new NotFoundException("Not Found Post");
    }

    const post = await this.postModel.updateOne({
      filter: {
        _id: postId,
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
    if (!post) {
      throw new NotFoundException("Post not found");
    }

    res.status(200).json({ message: "Done" });
  };

  deletePost = async (req: Request, res: Response): Promise<any> => {
    const { userId } = (req.params as IFreezeAccountDto) || {};

    if (userId && req.user?.role !== RoleEnum.admin) {
      throw new ForbiddenException("Not Authorized User");
    }

    const { postId } = req.params as unknown as { postId: Types.ObjectId };
    if (!postId) {
      throw new NotFoundException("Not Found Post");
    }

    const post = await this.postModel.deleteOne({
      filter: {
        _id: postId,
        freezedAt: { $exists: false },
      },
    });
    if (!post.deletedCount) {
      throw new NotFoundException("Post not found");
    }

    res.status(200).json({ message: "Done" });
  };
}

export const postService = new PostService();
