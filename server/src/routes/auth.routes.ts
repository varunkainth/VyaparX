import { Router } from "express";
import {
    changePassword,
    login,
    logout,
    me,
    refreshToken,
    signup,
    switchBusiness,
    updateMe,
} from "../controller/auth.controller";
import { authenticateRefreshToken, authenticateToken } from "../middleware/jwt";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import {
    changePasswordSchema,
    loginSchema,
    signupSchema,
    switchBusinessSchema,
    updateProfileSchema,
} from "../validators/auth.validator";

const authRouter = Router();

authRouter.post("/signup", validate(signupSchema), asyncHandler(signup));
authRouter.post("/login", validate(loginSchema), asyncHandler(login));
authRouter.post("/refresh", authenticateRefreshToken, asyncHandler(refreshToken));
authRouter.get("/me", authenticateToken, asyncHandler(me));
authRouter.patch("/me", authenticateToken, validate(updateProfileSchema), asyncHandler(updateMe));
authRouter.post("/change-password", authenticateToken, validate(changePasswordSchema), asyncHandler(changePassword));
authRouter.post("/switch-business", authenticateToken, validate(switchBusinessSchema), asyncHandler(switchBusiness));
authRouter.post("/logout", authenticateToken, asyncHandler(logout));

export default authRouter;
