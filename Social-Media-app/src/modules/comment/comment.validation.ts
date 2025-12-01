import { z } from "zod";
import { generalFields } from "../../middleware/validation.middleware";
import { fileValidation } from "../../utils/multer/cloud.multer";
import { Types } from "mongoose";

export const createComment = {
    params:z.strictObject({postId:generalFields.id}),
  body: z
    .strictObject({
      content: z.string().min(2).max(500000).optional(),
      attachments: z
        .array(generalFields.file(fileValidation.image))
        .max(2)
        .optional(),
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


export const freezeComment = {
  params: z.object({
    commentId: z.string().refine((val) => Types.ObjectId.isValid(val), {
      message: "Invalid objectId format",
    }),
  }),
};



export const getComment = {
  params: z.object({
    commentId: z.string().refine((val) => Types.ObjectId.isValid(val), {
      message: "Invalid objectId format",
    }),
  }),
};



export const deleteComment = {
  params: z.object({
    commentId: z.string().refine((val) => Types.ObjectId.isValid(val), {
      message: "Invalid objectId format",
    }),
  }),
};



export const replyOnComment = {
  params:createComment.params.extend({
    commentId:generalFields.id
  }),
  body:createComment.body
}




export const updateComment = {
  params: z.object({
    commentId: z.string().refine((val) => Types.ObjectId.isValid(val), {
      message: "Invalid objectId format",
    }),
  }),
    body: z
    .strictObject({
      content: z.string().min(2).max(500000).optional(),
      attachments: z
        .array(generalFields.file(fileValidation.image))
        .max(2)
        .optional(),
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
}

