import type { NextFunction, Request, Response } from "express";
import { userRepository } from "../repository/user.repository";
import type { UserRole } from "../types/user";
import { ERROR_CODES } from "../constants/errorCodes";

export const authorizeRoles = (allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        void (async () => {
            if (!req.user?.id) {
                return res.status(401).json({
                    success: false,
                    error: { code: ERROR_CODES.UNAUTHORIZED, message: "Authentication required" },
                });
            }

            const businessId = req.user.business_id;
            if (!businessId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: ERROR_CODES.BUSINESS_CONTEXT_REQUIRED,
                        message: "Select a business before accessing this route",
                    },
                });
            }

            let role = req.user.role as UserRole | undefined;
            if (!role) {
                role = await userRepository.getBusinessMemberRole(businessId, req.user.id) ?? undefined;
            }

            if (!role) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: ERROR_CODES.BUSINESS_ACCESS_DENIED,
                        message: "You are not an active member of this business",
                    },
                });
            }

            req.user.role = role;

            if (!allowedRoles.includes(role)) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
                        message: "Insufficient permissions",
                        details: {
                            required_roles: allowedRoles,
                            current_role: role,
                        },
                    },
                });
            }

            next();
        })().catch((err: any) => {
            return res.status(500).json({
                success: false,
                error: {
                    code: ERROR_CODES.INTERNAL_ERROR,
                    message: err?.message || "Authorization failed",
                },
            });
        });
    };
};
