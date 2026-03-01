import { Router } from "express";
import {
    forgotPasswordHandler,
    verifyResetTokenHandler,
    resetPasswordHandler,
} from "../controller/password-reset.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import {
    forgotPasswordSchema,
    verifyTokenSchema,
    resetPasswordSchema,
} from "../validators/password-reset.validator";

const passwordResetRouter = Router();

// Request password reset (sends email)
passwordResetRouter.post(
    "/auth/forgot-password",
    validate(forgotPasswordSchema),
    asyncHandler(forgotPasswordHandler)
);

// Verify reset token
passwordResetRouter.post(
    "/auth/verify-reset-token",
    validate(verifyTokenSchema),
    asyncHandler(verifyResetTokenHandler)
);

// Reset password with token
passwordResetRouter.post(
    "/auth/reset-password",
    validate(resetPasswordSchema),
    asyncHandler(resetPasswordHandler)
);

export default passwordResetRouter;
