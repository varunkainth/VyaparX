import type { PoolClient } from "pg";
import { businessRepository } from "../repository/business.repository";
import { notificationRepository } from "../repository/notification.repository";
import type { LowStockAlertContext } from "../types/notification";
import { emailService } from "../config/email";

type BusinessMemberRecipient = {
    id?: string | null;
    role?: string | null;
    email?: string | null;
    is_active?: boolean | null;
};

const roundStock = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;

const getLowStockDedupeKey = (itemId: string) => `low-stock:${itemId}`;

const isLowStock = (stock: number, threshold: number) => threshold > 0 && stock <= threshold;

const formatStockValue = (value: number) => {
    if (Number.isInteger(value)) {
        return String(value);
    }

    return roundStock(value).toFixed(3).replace(/\.?0+$/, "");
};

async function getLowStockEmailRecipient(businessId: string) {
    const business = await businessRepository.getBusinessById(businessId);
    if (business?.email) {
        return {
            email: String(business.email),
            businessName: String(business.name ?? "VyaparX"),
        };
    }

    const members = await businessRepository.getBusinessMembers(businessId);
    const fallbackMember = members.find((member: BusinessMemberRecipient) =>
        member.is_active && ["owner", "admin"].includes(String(member.role))
    ) ?? members.find((member: BusinessMemberRecipient) => member.is_active);

    if (!fallbackMember?.email) {
        return null;
    }

    return {
        email: String(fallbackMember.email),
        businessName: String(business?.name ?? "VyaparX"),
    };
}

async function sendLowStockEmail(context: LowStockAlertContext) {
    if (!emailService.isReady()) {
        return;
    }

    const recipient = await getLowStockEmailRecipient(context.businessId);
    if (!recipient?.email) {
        return;
    }

    const unitSuffix = context.itemUnit ? ` ${context.itemUnit}` : "";
    const currentStock = `${formatStockValue(context.currentStock)}${unitSuffix}`;
    const threshold = `${formatStockValue(context.threshold)}${unitSuffix}`;

    await emailService.sendEmail({
        to: recipient.email,
        subject: `Low stock alert: ${context.itemName}`,
        text: [
            `Low stock alert for ${recipient.businessName}`,
            "",
            `${context.itemName} has reached its low stock threshold.`,
            `Current stock: ${currentStock}`,
            `Threshold: ${threshold}`,
            "",
            "Please replenish this item soon.",
        ].join("\n"),
        html: `
            <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
                <h2 style="margin: 0 0 16px; color: #d97706;">Low Stock Alert</h2>
                <p style="margin: 0 0 16px;">${context.itemName} has reached its low stock threshold.</p>
                <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #fff7ed;">
                    <p style="margin: 0 0 8px;"><strong>Current stock:</strong> ${currentStock}</p>
                    <p style="margin: 0;"><strong>Threshold:</strong> ${threshold}</p>
                </div>
                <p style="margin: 16px 0 0; color: #4b5563;">Please replenish this item soon.</p>
            </div>
        `,
    });
}

export async function listNotificationsForUser(businessId: string, userId: string) {
    return notificationRepository.listActiveForUser(businessId, userId);
}

export async function markNotificationAsRead(businessId: string, userId: string, notificationId: string) {
    return notificationRepository.markAsRead(businessId, userId, notificationId);
}

export async function markAllNotificationsAsRead(businessId: string, userId: string) {
    await notificationRepository.markAllAsRead(businessId, userId);
}

export async function clearNotificationForUser(businessId: string, userId: string, notificationId: string) {
    return notificationRepository.clearNotification(businessId, userId, notificationId);
}

export async function handleLowStockTransition(
    context: LowStockAlertContext,
    client?: PoolClient
) {
    const dedupeKey = getLowStockDedupeKey(context.itemId);
    const wasLow = isLowStock(context.previousStock, context.threshold);
    const isNowLow = isLowStock(context.currentStock, context.threshold);

    if (!isNowLow) {
        if (wasLow) {
            await notificationRepository.resolveByDedupeKey(context.businessId, dedupeKey, client);
        }
        return { shouldSendEmail: false };
    }

    if (wasLow) {
        return { shouldSendEmail: false };
    }

    const members = await businessRepository.getBusinessMembers(context.businessId);
    const activeMembers = members.filter(
        (member: BusinessMemberRecipient) => member.is_active && member.id
    );

    const type = context.currentStock <= 0 ? "out_of_stock" : "low_stock";
    const priority = context.currentStock <= 0 ? "urgent" : "high";
    const title = context.currentStock <= 0 ? "Out of Stock" : "Low Stock Alert";
    const currentStockText = formatStockValue(context.currentStock);
    const unitSuffix = context.itemUnit ? ` ${context.itemUnit}` : "";
    const message =
        context.currentStock <= 0
            ? `${context.itemName} is out of stock`
            : `${context.itemName} is running low (${currentStockText}${unitSuffix} remaining)`;

    for (const member of activeMembers) {
        const existing = await notificationRepository.findActiveByDedupeKey(
            context.businessId,
            String(member.id),
            dedupeKey,
            client
        );

        if (existing) {
            continue;
        }

        await notificationRepository.createNotification(
            {
                business_id: context.businessId,
                user_id: String(member.id),
                type,
                priority,
                title,
                message,
                link: `/inventory/${context.itemId}`,
                metadata: {
                    item_id: context.itemId,
                    item_name: context.itemName,
                    current_stock: roundStock(context.currentStock),
                    threshold: roundStock(context.threshold),
                    unit: context.itemUnit,
                },
                dedupe_key: dedupeKey,
            },
            client
        );
    }

    return { shouldSendEmail: activeMembers.length > 0 };
}

export async function maybeSendLowStockEmail(context: LowStockAlertContext, shouldSendEmail: boolean) {
    if (!shouldSendEmail) {
        return;
    }

    try {
        await sendLowStockEmail(context);
    } catch (error) {
        console.error("Failed to send low stock email alert:", error);
    }
}
