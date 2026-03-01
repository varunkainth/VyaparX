import ExcelJS from "exceljs";
import { format } from "fast-csv";
import type { Readable } from "node:stream";

export type ExportFormat = "csv" | "excel";

type ExportRow = Record<string, unknown>;

const normalizeCell = (value: unknown): string | number | boolean => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
    }
    return JSON.stringify(value);
};

const collectHeaders = (rows: ExportRow[]): string[] => {
    const set = new Set<string>();
    for (const row of rows) {
        for (const key of Object.keys(row)) set.add(key);
    }
    return [...set];
};

export const toCsvStream = (rows: ExportRow[]): Readable => {
    const headers = collectHeaders(rows);
    const csvStream = format({ headers, writeHeaders: true });

    for (const row of rows) {
        const normalizedRow = headers.reduce<Record<string, string | number | boolean>>((acc, header) => {
            acc[header] = normalizeCell(row[header]);
            return acc;
        }, {});
        csvStream.write(normalizedRow);
    }
    csvStream.end();

    return csvStream;
};

export const toExcelBuffer = async (rows: ExportRow[], worksheetName: string): Promise<Buffer> => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(worksheetName);
    const headers = collectHeaders(rows);
    worksheet.columns = headers.map((header) => ({
        header,
        key: header,
        width: Math.max(16, header.length + 2),
    }));

    for (const row of rows) {
        const normalizedRow = headers.reduce<Record<string, string | number | boolean>>((acc, header) => {
            acc[header] = normalizeCell(row[header]);
            return acc;
        }, {});
        worksheet.addRow(normalizedRow);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
};

export const buildExportFilename = (baseName: string, format: ExportFormat): string => {
    const ext = format === "csv" ? "csv" : "xlsx";
    const stamp = new Date().toISOString().slice(0, 10);
    return `${baseName}-${stamp}.${ext}`;
};
