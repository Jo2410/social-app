import { Router } from "express";
import userService from "./user.service";
import { Authentication, Authorization } from "../../middleware/authentication.middleware";
import { validation } from "../../middleware/validation.middleware";
import * as validators from "./user.validation";
import { TokenEnum } from "../../utils/security/token.security";
import {
  cloudFileUpload,
  fileValidation,
  StorageEnum,
} from "../../utils/multer/cloud.multer";
import { endPoint } from "./user.authorization";
import { chatRouter } from "../chat";

const router = Router();
router.use("/:userId/chat", chatRouter)

router.get("/", Authentication(), userService.profile);
router.get("/:userId/change-role", Authentication(), validation(validators.changeRole) ,userService.changeRole);
router.get("/dashboard", Authorization(endPoint.dashboard), userService.dashboard);
router.post("/:userId/send-friend-request",Authentication(),validation(validators.sendFriendRequest) ,userService.sendFriendRequest);
router.patch("/accept-friend-request/:requestId",Authentication(),validation(validators.acceptFriendRequest) ,userService.acceptFriendRequest);

router.delete("{/:userId}/freeze-account", Authentication(), validation(validators.freezeAccount), userService.freezeAccount)

router.patch(
  "/profile-image",
  Authentication(),
  cloudFileUpload({
    validation: fileValidation.image,
    storageApproach: StorageEnum.disk,
  }).single("image"),
  userService.profileImage
);
router.patch(
  "/profile-cover-image",
  Authentication(),
  cloudFileUpload({
    validation: fileValidation.image,
    storageApproach: StorageEnum.disk,
  }).array("images", 2),
  userService.profileCoverImage
);
router.post(
  "/refresh-token",
  Authentication(TokenEnum.refresh),
  userService.refreshToken
);
router.post(
  "/logout",
  Authentication(),
  validation(validators.logout),
  userService.logout
);

router.patch(
  "/update-password",
  Authentication(),
  validation(validators.updatePassword),
  userService.updatePassword
);


router.patch(
  "/update-email",
  Authentication(),
  validation(validators.updateEmail),
  userService.updateEmail
);

export default router;
