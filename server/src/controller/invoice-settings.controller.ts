import type { Request, Response } from "express";
import { getInvoiceSettings, updateInvoiceSettings, resetInvoiceSettings } from "../services/invoice-settings.service";
import { sendSuccess } from "../utils/responseHandler";

export async function getInvoiceSettingsHandler(req: Request, res: Response) {
    const { business_id } = req.params;

    const settings = await getInvoiceSettings(business_id);

    sendSuccess(res, {
        message: "Invoice settings fetched successfully",
        data: settings,
    });
}

export async function updateInvoiceSettingsHandler(req: Request, res: Response) {
    const { business_id } = req.params;
    const data = req.body;

    const settings = await updateInvoiceSettings(business_id, data);

    sendSuccess(res, {
        message: "Invoice settings updated successfully",
        data: settings,
    });
}

export async function resetInvoiceSettingsHandler(req: Request, res: Response) {
    const { business_id } = req.params;

    const settings = await resetInvoiceSettings(business_id);

    sendSuccess(res, {
        message: "Invoice settings reset to defaults",
        data: settings,
    });
}
