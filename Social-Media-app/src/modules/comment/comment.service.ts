import type { Request, Response } from "express";
import {
  PostRepository,
  UserRepository,
  CommentRepository,
} from "../../DB/repository";
import {
  AllowCommentsEnum,
  CommentModel,
  HPostDocument,
  PostModel,
  RoleEnum,
  UserModel,
} from "../../DB/model";
import { Types } from "mongoose";
import { postAvailability } from "../post";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "../../utils/response/error.response";
import { deleteFiles, uploadFiles } from "../../utils/multer/s3.config";


class CommentService {
  constructor() {}
  private userModel = new UserRepository(UserModel);
  private postModel = new PostRepository(PostModel);
  private commentModel = new CommentRepository(CommentModel);

  createComment = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as unknown as { postId: Types.ObjectId };
    const post = await this.postModel.findOne({
      filter: {
        _id: postId,
        allowComments: AllowCommentsEnum.allow,
        $or: postAvailability(req),
      },
    });
    if (!post) {
      throw new NotFoundException("fail to find matching result ");
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
    if (req.files?.length) {
      attachments = await uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
      });
    }
    const [comment] =
      (await this.commentModel.create({
        data: [
          {
            ...req.body,
            attachments,
            postId,
            createdBy: req.user?._id,
          },
        ],
      })) || [];
    if (!comment) {
      if (attachments.length) {
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException("Fail to Create this comment");
    }
    return res.status(201).json({ message: "Done" });
  };



  updateComment = async (req: Request, res: Response): Promise<Response> => {
   const { commentId } = req.params as unknown as { commentId: Types.ObjectId };
  const { content } = req.body;

  const comment = await this.commentModel.findOne({
    filter: { _id: commentId, createdBy: req.user?._id },
  });

  if (!comment) {
    throw new NotFoundException("Fail to find matching result");
  }

  const post = await this.postModel.findOne({
    filter: { _id: comment.postId },
  });

  if (!post) {
    throw new NotFoundException("Post not found for this comment");
  }

  let attachments: string[] = [];

  if (req.files?.length) {
    attachments = await uploadFiles({
      files: req.files as Express.Multer.File[],
      path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
    });
  }

  const updatedComment = await this.commentModel.findOneAndUpdate({
    filter: { _id: commentId, createdBy: req.user?._id },
    update: {
      ...(content && { content }),
      ...(attachments.length && { attachments }),
      updatedAt: new Date(),
      changeCredentialsTime: new Date(),
    },
  });

  if (!updatedComment) {
    if (attachments.length) {
      await deleteFiles({ urls: attachments });
    }
    throw new BadRequestException("Fail to update this comment");
  }

  return res.status(200).json({ message: "Updated successfully", data: updatedComment });

  };



  getComment = async (req: Request, res: Response): Promise<Response> => {
   const { commentId } = req.params as unknown as { commentId: Types.ObjectId };

  const comment = await this.commentModel.findById({
    id:commentId,
  })

  if (!comment) {
    throw new NotFoundException("Fail to find matching result");
  }

  return res.status(200).json({ message: "Done", data: comment });

  };




  freezeComment = async (req: Request, res: Response): Promise<Response> => {
    const { commentId } = req.params as unknown as {
      commentId: Types.ObjectId;
    };

    if (!commentId) {
      throw new BadRequestException("Fail to comment");
    }

    if (req.user?.role !== RoleEnum.admin) {
      throw new ForbiddenException("Not Authorized User");
    }

    const comment = await this.commentModel.updateOne({
      filter: {
        _id: commentId,
        freezedAt: { $exists: false },
      },
      update: {
        freezedBy: req.user?._id,
        freezedAt: new Date(),
        changeCredentialsTime: new Date(),
        $unset: {
          restoredAt: 1,
          restoredBy: 1,
        },
      },
    });

    if (!comment) {
      throw new NotFoundException("Comment not found");
    }
    return res.status(201).json({ message: "Done" });
  };

  deleteComment = async (req: Request, res: Response): Promise<Response> => {
    const { commentId } = req.params as unknown as {
      commentId: Types.ObjectId;
    };

    if (!commentId) {
      throw new BadRequestException("Fail to comment");
    }

    if (req.user?.role !== RoleEnum.admin) {
      throw new ForbiddenException("Not Authorized User");
    }

    const comment = await this.commentModel.deleteOne({
      filter: {
        _id: commentId,
        freezedAt: { $exists: false },
      },
    });

    if (!comment) {
      throw new NotFoundException("Comment not found");
    }
    return res.status(201).json({ message: "Done" });
  };

  replyOnComment = async (req: Request, res: Response): Promise<Response> => {
    const { postId, commentId } = req.params as unknown as {
      postId: Types.ObjectId;
      commentId: Types.ObjectId;
    };
    const comment = await this.commentModel.findOne({
      filter: {
        _id: commentId,
        postId,
      },
      options: {
        populate: [
          {
            path: "postId",
            match: {
              allowComments: AllowCommentsEnum.allow,
              $or: postAvailability(req),
            },
          },
        ],
      },
    });

    if (!comment?.postId) {
      throw new NotFoundException("fail to find matching result ");
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
    if (req.files?.length) {
      const post = comment.postId as Partial<HPostDocument>;
      attachments = await uploadFiles({
        files: req.files as Express.Multer.File[],
        path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
      });
    }
    const [reply] =
      (await this.commentModel.create({
        data: [
          {
            ...req.body,
            attachments,
            postId,
            commentId,
            createdBy: req.user?._id,
          },
        ],
      })) || [];
    if (!reply) {
      if (attachments.length) {
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException("Fail to Create this comment");
    }
    return res.status(201).json({ message: "Done" });
  };
}

export default new CommentService();
