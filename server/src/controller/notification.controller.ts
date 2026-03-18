import type { Request, Response } from "express";
import { ERROR_CODES } from "../constants/errorCodes";
import {
    clearNotificationForUser,
    listNotificationsForUser,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from "../services/notification.service";
import { AppError } from "../utils/appError";
import { sendSuccess } from "../utils/responseHandler";

const getBusinessId = (req: Request<{ business_id: string }>) => {
    const businessId = req.params.business_id;
    if (!businessId) {
        throw new AppError("Business ID missing in route", 400, ERROR_CODES.BAD_REQUEST);
    }
    return businessId;
};

const getNotificationId = (req: Request<{ business_id: string; notification_id: string }>) => {
    const notificationId = req.params.notification_id;
    if (!notificationId) {
        throw new AppError("Notification ID missing in route", 400, ERROR_CODES.BAD_REQUEST);
    }
    return notificationId;
};

export async function listNotificationsHandler(req: Request<{ business_id: string }>, res: Response) {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const businessId = getBusinessId(req);
    const notifications = await listNotificationsForUser(businessId, req.user.id);

    return sendSuccess(res, {
        message: "Notifications fetched",
        data: notifications,
    });
}

export async function markNotificationAsReadHandler(
    req: Request<{ business_id: string; notification_id: string }>,
    res: Response
) {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const businessId = getBusinessId(req);
    const notificationId = getNotificationId(req);
    const notification = await markNotificationAsRead(businessId, req.user.id, notificationId);

    if (!notification) {
        throw new AppError("Notification not found", 404, ERROR_CODES.NOT_FOUND);
    }

    return sendSuccess(res, {
        message: "Notification marked as read",
        data: notification,
    });
}

export async function markAllNotificationsAsReadHandler(
    req: Request<{ business_id: string }>,
    res: Response
) {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const businessId = getBusinessId(req);
    await markAllNotificationsAsRead(businessId, req.user.id);

    return sendSuccess(res, {
        message: "All notifications marked as read",
        data: { success: true },
    });
}

export async function clearNotificationHandler(
    req: Request<{ business_id: string; notification_id: string }>,
    res: Response
) {
    if (!req.user?.id) {
        throw new AppError("Authentication required", 401, ERROR_CODES.UNAUTHORIZED);
    }

    const businessId = getBusinessId(req);
    const notificationId = getNotificationId(req);
    const notification = await clearNotificationForUser(businessId, req.user.id, notificationId);

    if (!notification) {
        throw new AppError("Notification not found", 404, ERROR_CODES.NOT_FOUND);
    }

    return sendSuccess(res, {
        message: "Notification cleared",
        data: notification,
    });
}
