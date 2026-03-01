import { Router } from "express";
import {
    sendVerificationEmailHandler,
    verifyEmailHandler,
    resendVerificationEmailHandler,
} from "../controller/email-verification.controller";
import { asyncHandler } from "../middleware/asyncHandler";
import { authenticateToken } from "../middleware/jwt";
import { validate } from "../middleware/validate";
import {
    sendVerificationEmailSchema,
    verifyEmailSchema,
} from "../validators/email-verification.validator";

const emailVerificationRouter = Router();

// Send verification email (public - for initial signup)
emailVerificationRouter.post(
    "/auth/send-verification-email",
    validate(sendVerificationEmailSchema),
    asyncHandler(sendVerificationEmailHandler)
);

// Verify email with token (public)
emailVerificationRouter.post(
    "/auth/verify-email",
    validate(verifyEmailSchema),
    asyncHandler(verifyEmailHandler)
);

// Resend verification email (authenticated)
emailVerificationRouter.post(
    "/auth/resend-verification-email",
    authenticateToken,
    asyncHandler(resendVerificationEmailHandler)
);

export default emailVerificationRouter;
