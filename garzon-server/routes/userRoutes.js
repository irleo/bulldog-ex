import { Router } from "express";
import { UserRole } from "../config/constants.js";
import {
  changeMyPassword,
  deleteUser,
  getSession,
  getMyProfile,
  getUser,
  listUsers,
  login,
  logout,
  register,
  setUserStatus,
  updateMyProfile,
  updateUser,
} from "../controllers/userController.js";
import { authenticate } from "../middleware/authentication.js";
import { authorize } from "../middleware/authorization.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import {
  registerValidation,
  validateRequest,
} from "../middleware/validationMiddleware.js";
import {
  loginLimiter,
  loginProtectionMiddleware,

  registrationLimiter,
  passwordLimiter,
} from "../middleware/rateLimiterMiddleware.js";

const router = Router();

router.post("/register", registrationLimiter, registerValidation, register);
router.post(
  "/login",
  loginLimiter,
  validateRequest,
  loginProtectionMiddleware,
  login,
);
router.use(validateRequest, authenticate);
router.post("/logout", logout);
router.get("/me/session", getSession);
router.route("/me").get(getMyProfile).patch(updateMyProfile);
router.patch("/me/password", passwordLimiter, changeMyPassword);

router.get("/", authorize(UserRole.ADMIN), listUsers);
router.route("/:id").all(validateObjectId()).get(getUser).patch(updateUser);
router.use(authorize(UserRole.ADMIN));
router.patch("/:id/status", validateObjectId(), setUserStatus);
router.delete("/:id", validateObjectId(), deleteUser);

export default router;
