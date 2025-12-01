import { Router } from "express";
import { Authentication } from "../../middleware/authentication.middleware";
import {
  cloudFileUpload,
  fileValidation,
} from "../../utils/multer/cloud.multer";
import commentService from "./comment.service";
import * as validators from './comment.validation'
import { validation } from "../../middleware/validation.middleware";
const router = Router({mergeParams:true});

router.post(
  "/",
  Authentication(),
  cloudFileUpload({ validation: fileValidation.image }).array("attachments", 2),
  validation(validators.createComment),
  commentService.createComment
);


router.get(
  "/:commentId",
  Authentication(),
  validation(validators.getComment),
  commentService.getComment
);



router.patch(
  "/:commentId",
  Authentication(),
  cloudFileUpload({ validation: fileValidation.image }).array("attachments", 2),
  validation(validators.updateComment),
  commentService.updateComment
);


router.post(
  "/:commentId/reply",
  Authentication(),
  cloudFileUpload({ validation: fileValidation.image }).array("attachments", 2),
  validation(validators.replyOnComment),
  commentService.replyOnComment
);

router.delete(
  "/:commentId/freeze-comment",
  Authentication(),
  validation(validators.freezeComment),
  commentService.freezeComment
);


router.delete(
  "/:commentId/delete-comment",
  Authentication(),
  validation(validators.deleteComment),
  commentService.deleteComment
);




export default router;
