import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { ERROR_CODES } from "../constants/errorCodes";

const getRouteBusinessId = (req: Request): string | undefined => {
    const fromParams = (req.params.businessId || req.params.business_id) as string | undefined;
    const fromBody = req.body?.business_id as string | undefined;
    const fromQuery = req.query?.business_id as string | undefined;
    const fromToken = req.user?.business_id as string | undefined;

    return fromParams || fromBody || fromQuery || fromToken;
};

export const businessGuard = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: { code: ERROR_CODES.UNAUTHORIZED, message: "Authentication required" },
            });
        }

        const routeBusinessId = getRouteBusinessId(req);

        if (!routeBusinessId) {
            return res.status(400).json({
                success: false,
                error: { code: ERROR_CODES.BAD_REQUEST, message: "Business ID missing in request" },
            });
        }

        if (req.user.business_id !== routeBusinessId) {
            logger.warn(
                {
                    userId: req.user.id,
                    tokenBusinessId: req.user.business_id,
                    routeBusinessId,
                    requestId: req.id,
                },
                "Business isolation violation attempt"
            );

            return res.status(403).json({
                success: false,
                error: {
                    code: ERROR_CODES.BUSINESS_ACCESS_DENIED,
                    message: "You do not have access to this business",
                },
            });
        }

        next();
    } catch (error: any) {
        logger.error(
            {
                error: error.message,
                requestId: req.id,
            },
            "Business guard error"
        );

        return res.status(500).json({
            success: false,
            error: { code: ERROR_CODES.INTERNAL_ERROR, message: "Authorization failed" },
        });
    }
};
