import { Router } from "express";
import { ChatService } from "./chat.service";
import { Authentication } from "../../middleware/authentication.middleware";
import { validation } from "../../middleware/validation.middleware";
import * as validators from "./chat.validation";
import {
  cloudFileUpload,
  fileValidation,
} from "../../utils/multer/cloud.multer";
const router = Router({ mergeParams: true });
const chatService: ChatService = new ChatService();

router.get(
  "/",
  Authentication(),
  validation(validators.getChat),
  chatService.getChat
);
router.post(
  "/group",
  Authentication(),
  cloudFileUpload({ validation: fileValidation.image }).single("attachment"),
  validation(validators.createChattingGroup),
  chatService.createChattingGroup
);

export default router;
