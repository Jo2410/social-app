import {postService} from "./post.service";
import * as validators from './post.validation'
import { Authentication } from "../../middleware/authentication.middleware";
import { Router } from "express";
import {
  cloudFileUpload,
  fileValidation,
} from "../../utils/multer/cloud.multer";
import { validation } from './../../middleware/validation.middleware';
import { commentRouter } from "../comment";
const router = Router();

router.use("/:postId/comment", commentRouter)

router.get(
  "/",
  Authentication(),
  postService.postList
);


router.post(
  "/",
  Authentication(),
  cloudFileUpload({ validation: fileValidation.image }).array("attachments", 2),
  validation(validators.createPost),
  postService.createPost
);

router.get(
  "/:postId",
  Authentication(),
  validation(validators.getPost),
  postService.getPost
);


router.delete(
  "/:postId/freeze-post", 
  Authentication(),
  validation(validators.freezePost),
  postService.freezePost
);




router.delete(
  "/:postId/delete-post", 
  Authentication(),
  validation(validators.deletePost),
  postService.deletePost
);



router.patch(
  "/:postId",
  Authentication(),
  cloudFileUpload({ validation: fileValidation.image }).array("attachments", 2),
  validation(validators.updatePost),
  postService.updatePost
);

router.patch(
  "/:postId/like",
  Authentication(),
  validation(validators.likePost),
  postService.likePost
);





export default router;
