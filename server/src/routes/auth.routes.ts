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
import {
    beginPasskeyAuthentication,
    beginPasskeyRegistration,
    deletePasskey,
    listPasskeys,
    verifyPasskeyAuthentication,
    verifyPasskeyRegistration,
} from "../controller/webauthn.controller";
import { authenticateRefreshToken, authenticateToken } from "../middleware/jwt";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import {
    beginPasskeyAuthenticationSchema,
    changePasswordSchema,
    loginSchema,
    signupSchema,
    switchBusinessSchema,
    updateProfileSchema,
    verifyPasskeyAuthenticationSchema,
    verifyPasskeyRegistrationSchema,
} from "../validators/auth.validator";

const authRouter = Router();

authRouter.post("/signup", validate(signupSchema), asyncHandler(signup));
authRouter.post("/login", validate(loginSchema), asyncHandler(login));
authRouter.post(
    "/passkeys/login/options",
    validate(beginPasskeyAuthenticationSchema),
    asyncHandler(beginPasskeyAuthentication)
);
authRouter.post(
    "/passkeys/login/verify",
    validate(verifyPasskeyAuthenticationSchema),
    asyncHandler(verifyPasskeyAuthentication)
);
authRouter.post("/refresh", authenticateRefreshToken, asyncHandler(refreshToken));
authRouter.get("/me", authenticateToken, asyncHandler(me));
authRouter.patch("/me", authenticateToken, validate(updateProfileSchema), asyncHandler(updateMe));
authRouter.post("/change-password", authenticateToken, validate(changePasswordSchema), asyncHandler(changePassword));
authRouter.post("/switch-business", authenticateToken, validate(switchBusinessSchema), asyncHandler(switchBusiness));
authRouter.post("/passkeys/register/options", authenticateToken, asyncHandler(beginPasskeyRegistration));
authRouter.post(
    "/passkeys/register/verify",
    authenticateToken,
    validate(verifyPasskeyRegistrationSchema),
    asyncHandler(verifyPasskeyRegistration)
);
authRouter.get("/passkeys", authenticateToken, asyncHandler(listPasskeys));
authRouter.delete("/passkeys/:credential_id", authenticateToken, asyncHandler(deletePasskey));
authRouter.post("/logout", authenticateToken, asyncHandler(logout));

export default authRouter;
