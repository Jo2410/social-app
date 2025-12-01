import { z } from "zod";
import { AllowCommentsEnum, AvailabilityEnum, LikeActionEnum } from "../../DB/model/Post.model";
import { generalFields } from "../../middleware/validation.middleware";
import { fileValidation } from "../../utils/multer/cloud.multer";
import { Types } from "mongoose";

export const createPost = {
  body: z
    .strictObject({
      content: z.string().min(2).max(500000).optional(),
      attachments: z
        .array(generalFields.file(fileValidation.image))
        .max(2)
        .optional(),

      availability: z.enum(AvailabilityEnum).default(AvailabilityEnum.public),
      allowComments: z.enum(AllowCommentsEnum).default(AllowCommentsEnum.allow),

      tags: z
        .array(
            generalFields.id
        )
        .max(10)
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.content?.length && !data.attachments?.length) {
        ctx.addIssue({
          code: "custom",
          path: ["content"],
          message: "Sorry we cannot make post without content and attachment",
        });
      }

      if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
          ctx.addIssue({
            code:"custom",
            path:["tags"],
            message:"Duplicated tagged user "
          })
      }
    }),
};



export const getPost = {
  params:z.strictObject({
    postId:generalFields.id,
  }).refine((data) => Types.ObjectId.isValid(data.postId),{
    error:"Invalid object format",
    path:["postId"]
  })
}

export const freezePost = {
  params: z.strictObject({
    postId: z.string()
  }).refine((data) => Types.ObjectId.isValid(data.postId), {
    message: "Invalid objectId format",
    path: ["postId"]
  })
}

export const deletePost = {
  params: z.strictObject({
    postId: z.string()
  }).refine((data) => Types.ObjectId.isValid(data.postId), {
    message: "Invalid objectId format",
    path: ["postId"]
  })
}



export const updatePost = {
  params:z.strictObject({
    postId:generalFields.id
  }),
  body: z
    .strictObject({
      content: z.string().min(2).max(500000).optional(),
  

      availability: z.enum(AvailabilityEnum).optional(),
      allowComments: z.enum(AllowCommentsEnum).optional(),

      tags: z
        .array(
            generalFields.id
        )
        .max(10)
        .optional(),
        removedTags: z
        .array(
            generalFields.id
        )
        .max(10)
        .optional(),

        attachments: z
        .array(generalFields.file(fileValidation.image))
        .max(2)
        .optional(),

        removedAttachments: z
        .array(z.string())
        .max(2)
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (!Object.values(data)?.length) {
        ctx.addIssue({
          code: "custom",
          path: ["content"],
          message: "all fields are empty",
        });
      }

      if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
          ctx.addIssue({
            code:"custom",
            path:["tags"],
            message:"Duplicated tagged user "
          })
      }

            if (data.removedTags?.length && data.removedTags.length !== [...new Set(data.removedTags)].length) {
          ctx.addIssue({
            code:"custom",
            path:["removedTags"],
            message:"Duplicated RemovedTagged user "
          })
      }
    }),
};




export const likePost = {
  params:z.strictObject({
    postId:generalFields.id,
  }),
  query:z.strictObject({
    action:z.enum(LikeActionEnum).default(LikeActionEnum.like)
  })
}