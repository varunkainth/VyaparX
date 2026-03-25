import PDFDocument from "pdfkit";
import type { InvoicePdfData } from "../types/invoice";
import type { InvoicePdfTemplate } from "../types/invoice";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// --- Utility Functions ---

const asNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const money = (value: unknown): string => asNumber(value).toFixed(2);
const getDisplayRate = (item: {
  quantity: unknown;
  unit_price: unknown;
  taxable_value?: unknown;
  discount_amount?: unknown;
}): number => {
  const quantity = asNumber(item.quantity);
  if (quantity <= 0) return asNumber(item.unit_price);

  const taxableValue = asNumber(item.taxable_value);
  const discountAmount = asNumber(item.discount_amount);
  const computedRate = (taxableValue + discountAmount) / quantity;

  return Number.isFinite(computedRate)
    ? computedRate
    : asNumber(item.unit_price);
};

// Custom Indian number formatter that prevents the PDFKit wrapping/glyph bug
const formatIndianNumber = (num: number): string => {
  const fixed = num.toFixed(2);
  const [whole, decimal] = fixed.split(".");
  const w = whole ?? "0";
  const d = decimal ?? "00";
  if (w.length <= 3) return `${w}.${d}`;
  const last3 = w.slice(-3);
  let rest = w.slice(0, -3);
  const groups: string[] = [];
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest.length > 0) groups.unshift(rest);
  return `${groups.join(",")},${last3}.${d}`;
};

// Use "Rs." since PDFKit's default Helvetica font supports it natively
const rs = (value: unknown): string =>
  `Rs. ${formatIndianNumber(asNumber(value))}`;

const getInvoiceRoundedTotals = (invoice: InvoicePdfData["invoice"]) => {
  const finalTotal = asNumber(invoice.grand_total);
  const roundOff = asNumber(invoice.round_off);
  const totalBeforeRounding = round2(finalTotal - roundOff);

  return {
    totalBeforeRounding,
    roundOff,
    finalTotal,
  };
};

// Robust Date Formatter to strictly output DD/MM/YYYY
const formatDate = (dateValue: unknown): string => {
  if (!dateValue) return "-";

  // Parse the value into a Date object
  const date = new Date(dateValue as string | number | Date);

  // Check if it's a valid date
  if (isNaN(date.getTime())) {
    return String(dateValue); // Fallback to raw string if invalid
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

const getText = (value: unknown, fallback = "-"): string => {
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  return str.length > 0 ? str : fallback;
};

const numberToWords = (num: number): string => {
  if (!Number.isFinite(num)) return "Zero";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const twoDigits = (n: number) => {
    if (n < 20) return ones[n] ?? "";
    const t = Math.floor(n / 10);
    const o = n % 10;
    return `${tens[t] ?? ""}${o ? ` ${ones[o]}` : ""}`.trim();
  };
  const threeDigits = (n: number) => {
    const h = Math.floor(n / 100);
    const r = n % 100;
    if (!h) return twoDigits(r);
    return `${ones[h]} Hundred${r ? ` ${twoDigits(r)}` : ""}`;
  };

  const whole = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - whole) * 100);
  const crore = Math.floor(whole / 10000000);
  const lakh = Math.floor((whole % 10000000) / 100000);
  const thousand = Math.floor((whole % 100000) / 1000);
  const hundred = whole % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  if (parts.length === 0) parts.push("Zero");

  const rupees = `${parts.join(" ").replace(/\s+/g, " ")} Rupees`;
  const paiseText = paise ? ` and ${twoDigits(paise)} Paise` : "";
  return `${rupees}${paiseText} Only`;
};

// --- Config & Schemas ---

const templateSchema = z.object({
  layout: z.enum([
    "classic",
    "modern",
    "compact",
    "bill_pro",
    "bill_pro_legacy",
  ]),
  title: z.string().min(1),
  titleAlign: z.enum(["left", "center", "right"]),
  headerBackgroundColor: z.string().min(4),
  headerTextColor: z.string().min(4),
  metaFontSize: z.number().min(7).max(20),
  sectionFontSize: z.number().min(7).max(20),
  itemFontSize: z.number().min(7).max(20),
  totalFontSize: z.number().min(7).max(24),
  showPlaceOfSupply: z.boolean(),
});

const templatesConfigSchema = z.object({
  defaultTemplate: z.enum([
    "classic",
    "modern",
    "compact",
    "bill_pro",
    "bill_pro_legacy",
  ]),
  templates: z.object({
    classic: templateSchema,
    modern: templateSchema,
    compact: templateSchema,
    bill_pro: templateSchema,
    bill_pro_legacy: templateSchema,
  }),
});

type TemplateConfig = z.infer<typeof templateSchema>;
type TemplatesConfig = z.infer<typeof templatesConfigSchema>;

const loadTemplatesConfig = (): TemplatesConfig => {
  const filePath = fileURLToPath(
    new URL("../config/invoice-templates.json", import.meta.url),
  );
  const raw = readFileSync(filePath, "utf-8");
  const parsed = templatesConfigSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(
      `Invalid invoice templates config: ${parsed.error.message}`,
    );
  }
  return parsed.data;
};

const templatesConfig = loadTemplatesConfig();

const getTemplateConfig = (template: InvoicePdfTemplate): TemplateConfig => {
  const selected = templatesConfig.templates[template];
  if (selected) return selected;
  return templatesConfig.templates[templatesConfig.defaultTemplate];
};

// --- Renderers ---

const renderItems = (
  doc: PDFKit.PDFDocument,
  data: InvoicePdfData,
  config: TemplateConfig,
) => {
  const fontSize = config.itemFontSize;
  doc.fontSize(fontSize).text("Name | Qty | Unit Price | GST% | Total");
  doc.moveDown(0.2);
  for (const item of data.invoice.items) {
    doc.text(
      `${item.item_name} | ${item.quantity} ${item.unit} | ${money(getDisplayRate(item))} | ${item.gst_rate} | ${money(item.total_amount)}`,
    );
  }
};

// ════════════════════════════════════════════════════════════════════════════
// NEW DESIGN: CLASSIC (Elegant, Minimalist, Horizontal Lines Only)
// ════════════════════════════════════════════════════════════════════════════
const renderClassic = (
  doc: PDFKit.PDFDocument,
  data: InvoicePdfData,
  config: TemplateConfig,
) => {
  const x = 50;
  const width = doc.page.width - 100;
  const rightX = x + width;
  let y = 50;

  // Header: Business Name (Left) & INVOICE (Right)
  doc
    .font("Helvetica-Bold")
    .fontSize(24)
    .text(getText(data.businessName).toUpperCase(), x, y);
  doc
    .fillColor("#555555")
    .fontSize(10)
    .text(getText(data.business?.address_line1), x, y + 28);
  doc.text(
    `${getText(data.business?.city)}, ${getText(data.business?.state)}`,
    x,
    y + 40,
  );

  doc
    .fillColor(config.headerBackgroundColor || "#000000")
    .font("Helvetica-Bold")
    .fontSize(28)
    .text(config.title.toUpperCase(), x, y, { width, align: "right" });

  doc.fillColor("#000000"); // Reset
  y += 70;

  // Divider
  doc
    .moveTo(x, y)
    .lineTo(rightX, y)
    .lineWidth(1)
    .strokeColor("#DDDDDD")
    .stroke();
  y += 15;

  // Meta: Bill To & Invoice Info
  doc.font("Helvetica-Bold").fontSize(10).text("BILL TO:", x, y);
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(getText(data.partyName).toUpperCase(), x, y + 15);
  doc
    .fillColor("#555555")
    .fontSize(9)
    .text(getText(data.party?.address), x, y + 28)
    .text(`GSTIN: ${getText(data.party?.gstin)}`, x, y + 40);

  doc.fillColor("#000000");
  const infoX = x + 300;
  doc.font("Helvetica-Bold").fontSize(9).text("Invoice Number:", infoX, y);
  doc
    .font("Helvetica")
    .text(getText(data.invoice.invoice_number), infoX + 90, y);

  doc.font("Helvetica-Bold").text("Invoice Date:", infoX, y + 15);
  doc
    .font("Helvetica")
    .text(formatDate(data.invoice.invoice_date), infoX + 90, y + 15);

  doc.font("Helvetica-Bold").text("Status:", infoX, y + 30);
  doc
    .font("Helvetica")
    .text(
      getText(data.invoice.payment_status).toUpperCase(),
      infoX + 90,
      y + 30,
    );

  y += 70;

  // Table Header
  doc
    .moveTo(x, y)
    .lineTo(rightX, y)
    .lineWidth(2)
    .strokeColor("#000000")
    .stroke();
  y += 8;

  const colX = [x, x + 220, x + 290, x + 370, rightX]; // Desc, Qty, Rate, Total
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Description", colX[0]!, y);
  doc.text("Qty", colX[1]!, y, { width: colX[2]! - colX[1]!, align: "center" });
  doc.text("Rate", colX[2]!, y, { width: colX[3]! - colX[2]!, align: "right" });
  doc.text("Amount", colX[3]!, y, {
    width: colX[4]! - colX[3]!,
    align: "right",
  });

  y += 15;
  doc
    .moveTo(x, y)
    .lineTo(rightX, y)
    .lineWidth(1)
    .strokeColor("#EEEEEE")
    .stroke();
  y += 10;

  // Table Items
  doc.font("Helvetica").fontSize(9);
  data.invoice.items.forEach((item) => {
    const name = getText(item.item_name);
    const itemH = doc.heightOfString(name, { width: 200 });

    doc.text(name, colX[0]!, y, { width: 200 });
    doc.text(`${item.quantity} ${item.unit}`, colX[1]!, y, {
      width: colX[2]! - colX[1]!,
      align: "center",
    });
    doc.text(rs(getDisplayRate(item)), colX[2]!, y, {
      width: colX[3]! - colX[2]!,
      align: "right",
    });
    doc.text(rs(item.taxable_value ?? item.total_amount), colX[3]!, y, {
      width: colX[4]! - colX[3]!,
      align: "right",
    });

    y += itemH + 10;
    doc
      .moveTo(x, y)
      .lineTo(rightX, y)
      .lineWidth(1)
      .strokeColor("#EEEEEE")
      .stroke();
    y += 10;
  });

  // Totals
  y += 10;
  const totalsX = x + 250;
  const totalsW = rightX - totalsX;
  const roundedTotals = getInvoiceRoundedTotals(data.invoice);

  doc.font("Helvetica").text("Taxable Amount:", totalsX, y);
  doc.text(rs(data.invoice.taxable_amount), totalsX, y, {
    width: totalsW,
    align: "right",
  });
  y += 15;

  doc.text("Total Tax:", totalsX, y);
  doc.text(rs(data.invoice.total_tax), totalsX, y, {
    width: totalsW,
    align: "right",
  });
  y += 15;

  doc.text("Total Before Rounding:", totalsX, y);
  doc.text(rs(roundedTotals.totalBeforeRounding), totalsX, y, {
    width: totalsW,
    align: "right",
  });
  y += 15;

  doc.text("Round Off:", totalsX, y);
  doc.text(rs(roundedTotals.roundOff), totalsX, y, {
    width: totalsW,
    align: "right",
  });
  y += 15;

  doc
    .moveTo(totalsX, y)
    .lineTo(rightX, y)
    .lineWidth(2)
    .strokeColor("#000000")
    .stroke();
  y += 8;

  doc.font("Helvetica-Bold").fontSize(11).text("Final Total:", totalsX, y);
  doc.text(rs(roundedTotals.finalTotal), totalsX, y, {
    width: totalsW,
    align: "right",
  });
};

// ════════════════════════════════════════════════════════════════════════════
// NEW DESIGN: MODERN (Sleek Corporate, Colored Banners, Highlighted Totals)
// ════════════════════════════════════════════════════════════════════════════
const renderModern = (
  doc: PDFKit.PDFDocument,
  data: InvoicePdfData,
  config: TemplateConfig,
) => {
  const bgColor = config.headerBackgroundColor || "#2563EB"; // Default Blue
  const txtColor = config.headerTextColor || "#FFFFFF";

  // Top Banner
  doc.rect(0, 0, doc.page.width, 110).fill(bgColor);

  doc
    .fillColor(txtColor)
    .font("Helvetica-Bold")
    .fontSize(28)
    .text(config.title.toUpperCase(), 40, 40);
  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`Invoice No: ${getText(data.invoice.invoice_number)}`, 40, 75)
    .text(`Date: ${formatDate(data.invoice.invoice_date)}`, 160, 75);

  // Business Details (Right aligned in header)
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(getText(data.businessName).toUpperCase(), 40, 40, {
      width: doc.page.width - 80,
      align: "right",
    });
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(getText(data.business?.address_line1), 40, 60, {
      width: doc.page.width - 80,
      align: "right",
    });
  doc.text(`GSTIN: ${getText(data.business?.gstin)}`, 40, 75, {
    width: doc.page.width - 80,
    align: "right",
  });

  doc.fillColor("#000000");
  let y = 140;
  const x = 40;
  const rightX = doc.page.width - 40;

  // Bill To
  doc
    .fillColor("#666666")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("INVOICE TO", x, y);
  doc
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(getText(data.partyName).toUpperCase(), x, y + 15);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#555555")
    .text(getText(data.party?.address), x, y + 30)
    .text(
      `${getText(data.party?.city)}, ${getText(data.party?.state)}`,
      x,
      y + 42,
    )
    .text(`GSTIN: ${getText(data.party?.gstin)}`, x, y + 54);

  y += 90;

  // Table Header (Colored Background)
  doc.rect(x, y, rightX - x, 25).fill(bgColor);
  doc.fillColor(txtColor).font("Helvetica-Bold").fontSize(9);

  const colX = [x + 10, x + 240, x + 310, x + 390, rightX - 10];
  const headerY = y + 7;
  doc.text("Item Description", colX[0]!, headerY);
  doc.text("Quantity", colX[1]!, headerY, {
    width: colX[2]! - colX[1]!,
    align: "center",
  });
  doc.text("Price", colX[2]!, headerY, {
    width: colX[3]! - colX[2]!,
    align: "right",
  });
  doc.text("Amount", colX[3]!, headerY, {
    width: colX[4]! - colX[3]!,
    align: "right",
  });

  y += 35;
  doc.fillColor("#000000");

  // Table Items
  data.invoice.items.forEach((item, index) => {
    const name = getText(item.item_name);
    const itemH = doc.heightOfString(name, { width: 220 });

    // Zebra striping
    if (index % 2 === 1)
      doc.rect(x, y - 5, rightX - x, itemH + 10).fill("#F9FAFB");
    doc.fillColor("#000000").font("Helvetica").fontSize(9);

    doc.text(name, colX[0]!, y, { width: 220 });
    doc.text(`${item.quantity} ${item.unit}`, colX[1]!, y, {
      width: colX[2]! - colX[1]!,
      align: "center",
    });
    doc.text(rs(getDisplayRate(item)), colX[2]!, y, {
      width: colX[3]! - colX[2]!,
      align: "right",
    });
    doc.text(rs(item.taxable_value ?? item.total_amount), colX[3]!, y, {
      width: colX[4]! - colX[3]!,
      align: "right",
    });

    y += itemH + 15;
  });

  // Summary Box
  y += 20;
  const boxW = 220;
  const boxX = rightX - boxW;
  const roundedTotals = getInvoiceRoundedTotals(data.invoice);

  doc.rect(boxX, y, boxW, 115).lineWidth(1).strokeColor("#E5E7EB").stroke();

  doc
    .font("Helvetica")
    .fontSize(9)
    .text("Subtotal", boxX + 15, y + 15);
  doc.text(rs(data.invoice.taxable_amount), boxX + 15, y + 15, {
    width: boxW - 30,
    align: "right",
  });

  doc.text("Tax Amount", boxX + 15, y + 35);
  doc.text(rs(data.invoice.total_tax), boxX + 15, y + 35, {
    width: boxW - 30,
    align: "right",
  });

  doc.text("Before Rounding", boxX + 15, y + 55);
  doc.text(rs(roundedTotals.totalBeforeRounding), boxX + 15, y + 55, {
    width: boxW - 30,
    align: "right",
  });

  doc.text("Round Off", boxX + 15, y + 75);
  doc.text(rs(roundedTotals.roundOff), boxX + 15, y + 75, {
    width: boxW - 30,
    align: "right",
  });

  // Grand Total Highlight Bar
  doc.rect(boxX, y + 95, boxW, 20).fill(bgColor);
  doc
    .fillColor(txtColor)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Final Total", boxX + 15, y + 101);
  doc.text(rs(roundedTotals.finalTotal), boxX + 15, y + 101, {
    width: boxW - 30,
    align: "right",
  });
};

// ════════════════════════════════════════════════════════════════════════════
// NEW DESIGN: COMPACT (Receipt Style, Centered, Narrow, Dashed Lines)
// ════════════════════════════════════════════════════════════════════════════
const renderCompact = (
  doc: PDFKit.PDFDocument,
  data: InvoicePdfData,
  config: TemplateConfig,
) => {
  // Treat as a narrow receipt centered on the page
  const width = 300;
  const x = (doc.page.width - width) / 2;
  let y = 40;

  const drawDashedLine = (yPos: number) => {
    doc
      .moveTo(x, yPos)
      .lineTo(x + width, yPos)
      .lineWidth(1)
      .strokeColor("#AAAAAA")
      .dash(3, { space: 3 })
      .stroke();
    doc.undash(); // Reset dash so it doesn't break other lines
  };

  // Header
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(getText(data.businessName).toUpperCase(), x, y, {
      width,
      align: "center",
    });
  y += 20;
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#555555")
    .text(getText(data.business?.address_line1), x, y, {
      width,
      align: "center",
    })
    .text(getText(data.business?.city), x, y + 10, { width, align: "center" })
    .text(`GSTIN: ${getText(data.business?.gstin)}`, x, y + 20, {
      width,
      align: "center",
    });

  y += 40;
  drawDashedLine(y);
  y += 10;

  // Invoice Meta
  doc
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(config.title.toUpperCase(), x, y, { width, align: "center" });
  y += 20;
  doc.font("Helvetica").fontSize(9);
  doc.text(`No: ${data.invoice.invoice_number}`, x, y);
  doc.text(formatDate(data.invoice.invoice_date), x, y, {
    width,
    align: "right",
  });

  y += 15;
  doc.text(`Bill To: ${getText(data.partyName)}`, x, y);

  y += 15;
  drawDashedLine(y);
  y += 10;

  // Items
  doc.font("Helvetica-Bold").fontSize(8);
  doc.text("ITEM", x, y);
  doc.text("AMT", x, y, { width, align: "right" });
  y += 15;

  doc.font("Helvetica").fontSize(9);
  data.invoice.items.forEach((item) => {
    const name = getText(item.item_name);
    doc.text(name, x, y, { width: width - 60 });
    doc.text(rs(item.taxable_value ?? item.total_amount), x, y, {
      width,
      align: "right",
    });
    y += doc.heightOfString(name, { width: width - 60 }) + 2;

    doc.fillColor("#777777").fontSize(8);
    doc.text(`${item.quantity} x ${rs(getDisplayRate(item))}`, x, y);
    doc.fillColor("#000000").fontSize(9);
    y += 15;
  });

  y += 5;
  drawDashedLine(y);
  y += 10;

  // Totals
  doc.font("Helvetica").fontSize(9);
  const roundedTotals = getInvoiceRoundedTotals(data.invoice);
  doc.text("Subtotal", x, y);
  doc.text(rs(data.invoice.taxable_amount), x, y, { width, align: "right" });
  y += 15;

  doc.text("Tax", x, y);
  doc.text(rs(data.invoice.total_tax), x, y, { width, align: "right" });
  y += 15;

  doc.text("Before Rounding", x, y);
  doc.text(rs(roundedTotals.totalBeforeRounding), x, y, {
    width,
    align: "right",
  });
  y += 15;

  doc.text("Round Off", x, y);
  doc.text(rs(roundedTotals.roundOff), x, y, { width, align: "right" });
  y += 15;

  drawDashedLine(y);
  y += 10;

  doc.font("Helvetica-Bold").fontSize(12);
  doc.text("FINAL TOTAL", x, y);
  doc.text(rs(roundedTotals.finalTotal), x, y, { width, align: "right" });

  y += 30;
  doc
    .font("Helvetica-Oblique")
    .fontSize(8)
    .fillColor("#777777")
    .text("Thank you for your business!", x, y, { width, align: "center" });
};

// ════════════════════════════════════════════════════════════════════════════
// BILL PRO DESIGN (Standard Tally-Like Professional Structure)
// ════════════════════════════════════════════════════════════════════════════
const renderBillPro = (
  doc: PDFKit.PDFDocument,
  data: InvoicePdfData,
  config: TemplateConfig,
) => {
  const x = 40;
  const width = doc.page.width - 80; // 515 on A4
  const totalX = x + width;
  let currentY = 30;
  const startY = currentY;

  doc.lineWidth(0.5);

  // ════════════════════════════════════
  // 1. HEADER: TAX INVOICE
  // ════════════════════════════════════
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text("TAX INVOICE", x, currentY + 4, { width, align: "center" });
  currentY += 18;
  doc.moveTo(x, currentY).lineTo(totalX, currentY).stroke("#000000");

  // ════════════════════════════════════
  // 2. BUSINESS DETAILS
  // ════════════════════════════════════
  doc.font("Helvetica-Bold").fontSize(14);
  doc.text(getText(data.businessName).toUpperCase(), x, currentY + 6, {
    width,
    align: "center",
  });
  currentY += 22;

  doc.font("Helvetica").fontSize(8);
  const addr1 = getText(data.business?.address_line1, "");
  if (addr1 && addr1 !== "-") {
    doc.text(addr1, x, currentY, { width, align: "center" });
    currentY += 10;
  }

  const cityParts = [
    getText(data.business?.city, ""),
    getText(data.business?.state, ""),
  ].filter((s) => s.length > 0 && s !== "-");
  const pin = getText(data.business?.pincode, "");
  if (cityParts.length > 0) {
    let line = cityParts.join(", ");
    if (pin && pin !== "-") line += `, India Pin Code-${pin}`;
    doc.text(line, x, currentY, { width, align: "center" });
    currentY += 10;
  }

  // Bold Business GSTIN
  doc
    .font("Helvetica-Bold")
    .text(`GSTIN No ${getText(data.business?.gstin)}`, x, currentY, {
      width,
      align: "center",
    });
  currentY += 14;
  doc.moveTo(x, currentY).lineTo(totalX, currentY).stroke("#000000");

  // ════════════════════════════════════
  // 3. META SECTION (Bill To, POS, Dates)
  // ════════════════════════════════════
  const metaY = currentY;
  const metaH = 80;

  // Define column widths for Meta section
  const mCol1W = 240; // Bill To
  const mCol2W = 135; // Place of Supply
  const mCol3W = 70; // Invoice No
  const mCol4W = 70; // Dated

  const mCol1X = x + mCol1W;
  const mCol2X = mCol1X + mCol2W;
  const mCol3X = mCol2X + mCol3W;

  // Vertical lines inside Meta
  doc
    .moveTo(mCol1X, metaY)
    .lineTo(mCol1X, metaY + metaH)
    .stroke("#000000");
  doc
    .moveTo(mCol2X, metaY)
    .lineTo(mCol2X, metaY + metaH)
    .stroke("#000000");
  doc
    .moveTo(mCol3X, metaY)
    .lineTo(mCol3X, metaY + metaH)
    .stroke("#000000");

  // Horizontal split for Invoice No & Dated
  doc
    .moveTo(mCol2X, metaY + 28)
    .lineTo(totalX, metaY + 28)
    .stroke("#000000");

  // --- Bill To ---
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .text("Bill to", x + 4, metaY + 4);
  doc
    .fontSize(9)
    .text(getText(data.partyName).toUpperCase(), x + 4, metaY + 16, {
      width: mCol1W - 8,
    });
  doc.font("Helvetica").fontSize(8);

  let bY = metaY + 30;
  const pAddr = getText(data.party?.address, "");
  if (pAddr && pAddr !== "-") {
    doc.text(pAddr, x + 4, bY, { width: mCol1W - 8 });
    bY += 10;
  }
  const pCity = [getText(data.party?.city, ""), getText(data.party?.state, "")]
    .filter((s) => s.length > 0 && s !== "-")
    .join(", ");
  const pPin = getText(data.party?.pincode, "");
  if (pCity.length > 0) {
    const pLine =
      pPin.length > 0 && pPin !== "-" ? `${pCity} - ${pPin}` : pCity;
    doc.text(pLine, x + 4, bY, { width: mCol1W - 8 });
    bY += 10;
  }

  // Bold Party GSTIN
  doc
    .font("Helvetica-Bold")
    .text(`GSTIN NO. ${getText(data.party?.gstin)}`, x + 4, bY, {
      width: mCol1W - 8,
    });

  // --- Place of Supply (Updated to show Name and Address) ---
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .text("Place of Supply", mCol1X + 4, metaY + 4);
  doc
    .fontSize(9)
    .text(getText(data.partyName).toUpperCase(), mCol1X + 4, metaY + 16, {
      width: mCol2W - 8,
    });

  doc.font("Helvetica").fontSize(8);
  let posAddrY = metaY + 30;
  if (pAddr && pAddr !== "-") {
    doc.text(pAddr, mCol1X + 4, posAddrY, { width: mCol2W - 8 });
    posAddrY += 10;
  }
  if (pCity.length > 0) {
    const pLine =
      pPin.length > 0 && pPin !== "-" ? `${pCity} - ${pPin}` : pCity;
    doc.text(pLine, mCol1X + 4, posAddrY + 10, { width: mCol2W - 8 });
    posAddrY += 10;
  }

  // // Original state code added at the bottom
  // const posText = getText(data.invoice.place_of_supply, "");
  // if (posText && posText !== "-") {
  //     doc.font("Helvetica-Bold").text(`State/POS: ${posText}`, mCol1X + 4, posAddrY + 4, { width: mCol2W - 8 });
  // }

  // --- Invoice No ---
  doc
    .font("Helvetica")
    .fontSize(7)
    .text("INVOICE No", mCol2X + 4, metaY + 4, {
      align: "center",
      width: mCol3W - 8,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(getText(data.invoice.invoice_number), mCol2X + 4, metaY + 45, {
      align: "center",
      width: mCol3W - 8,
    });

  // --- Dated ---
  doc
    .font("Helvetica")
    .fontSize(7)
    .text("Dated", mCol3X + 4, metaY + 4, {
      align: "center",
      width: mCol4W - 8,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(formatDate(data.invoice.invoice_date), mCol3X + 4, metaY + 45, {
      align: "center",
      width: mCol4W - 8,
    });

  currentY += metaH;
  doc.moveTo(x, currentY).lineTo(totalX, currentY).stroke("#000000");

  // ════════════════════════════════════
  // 4. ITEMS TABLE
  // ════════════════════════════════════
  const tableY = currentY;

  // Column widths
  const tColW = [210, 60, 45, 40, 75, 85];
  const tColX = [x, x + 210, x + 270, x + 315, x + 355, x + 430, x + 515];

  // Table Header
  const hdrH = 20;
  doc.font("Helvetica-Bold").fontSize(8);
  const headers = [
    "Description of Goods",
    "HSN CODE",
    "QTY",
    "Units",
    "RATE",
    "Amount",
  ];
  headers.forEach((h, i) => {
    const isAmountCol = i >= 4;
    doc.text(h, tColX[i]! + 4, currentY + 6, {
      width: tColW[i]! - (isAmountCol ? 14 : 8),
      align: i === 0 ? "left" : isAmountCol ? "right" : "center",
    });
  });

  currentY += hdrH;
  doc.moveTo(x, currentY).lineTo(totalX, currentY).stroke("#000000");

  // Items List
  let iy = currentY + 10;
  data.invoice.items.forEach((item) => {
    const name = getText(item.item_name).toUpperCase();
    const textH = doc.heightOfString(name, { width: tColW[0]! - 8 });

    doc.font("Helvetica-Bold").fontSize(9);
    doc.text(name, tColX[0]! + 4, iy, { width: tColW[0]! - 8 });

    doc.font("Helvetica").fontSize(9);
    doc.text(getText(item.hsn_code), tColX[1]! + 4, iy, {
      width: tColW[1]! - 8,
      align: "center",
    });
    doc.text(
      String(
        asNumber(item.quantity).toFixed(
          item.unit?.toLowerCase() === "pcs" ? 0 : 3,
        ),
      ),
      tColX[2]! + 4,
      iy,
      { width: tColW[2]! - 8, align: "center" },
    );
    doc.text(getText(item.unit).toUpperCase(), tColX[3]! + 4, iy, {
      width: tColW[3]! - 8,
      align: "center",
    });

    doc.text(rs(getDisplayRate(item)), tColX[4]! + 4, iy, {
      width: tColW[4]! - 14,
      align: "right",
    });
    doc.text(rs(item.taxable_value ?? item.total_amount), tColX[5]! + 4, iy, {
      width: tColW[5]! - 14,
      align: "right",
    });

    iy += Math.max(textH, 15) + 12;
  });

  // ════════════════════════════════════
  // 5. TAXES SECTION (Shifted to Bottom)
  // ════════════════════════════════════
  const cgstTotal = data.invoice.items.reduce(
    (s, r) => s + asNumber(r.cgst_amount),
    0,
  );
  const sgstTotal = data.invoice.items.reduce(
    (s, r) => s + asNumber(r.sgst_amount),
    0,
  );
  const igstTotal = data.invoice.items.reduce(
    (s, r) => s + asNumber(r.igst_amount),
    0,
  );
  const cgstPct = asNumber(data.invoice.items[0]?.cgst_rate || 0);
  const sgstPct = asNumber(data.invoice.items[0]?.sgst_rate || 0);
  const igstPct = asNumber(data.invoice.items[0]?.igst_rate || 0);

  const taxes: [string, number][] = [
    ["Taxable Value", asNumber(data.invoice.taxable_amount)],
  ];
  if (cgstTotal > 0 || cgstPct > 0)
    taxes.push([`ADD CGST ${cgstPct.toFixed(1)}%`, cgstTotal]);
  if (sgstTotal > 0 || sgstPct > 0)
    taxes.push([`ADD SGST ${sgstPct.toFixed(1)}%`, sgstTotal]);
  if (igstTotal > 0 || igstPct > 0)
    taxes.push([`ADD IGST ${igstPct.toFixed(1)}%`, igstTotal]);
  const roundedTotals = getInvoiceRoundedTotals(data.invoice);
  taxes.push(["Total Before Rounding", roundedTotals.totalBeforeRounding]);
  taxes.push(["Round Off", roundedTotals.roundOff]);

  const taxSectionHeight = taxes.length * 16;

  // Compute bottom Y for the table to enforce a consistent height (making room for items + gap + taxes)
  const minTableHeight = 280;
  const finalTableBottomY = Math.max(
    currentY + minTableHeight,
    iy + taxSectionHeight + 30,
  );

  // Position taxes exactly at the bottom of the table bounds
  let taxY = finalTableBottomY - taxSectionHeight - 8;

  taxes.forEach(([label, amount]) => {
    doc
      .font(label.startsWith("ADD") ? "Helvetica-Bold" : "Helvetica")
      .fontSize(9);
    doc.text(label, tColX[0]! + 4, taxY, { width: tColW[0]! - 8 });
    doc.text(rs(amount), tColX[5]! + 4, taxY, {
      width: tColW[5]! - 14,
      align: "right",
    });
    taxY += 16;
  });

  // Draw inner vertical columns strictly inside the Items table bounds
  for (let i = 1; i < tColX.length - 1; i++) {
    doc
      .moveTo(tColX[i]!, tableY)
      .lineTo(tColX[i]!, finalTableBottomY)
      .stroke("#000000");
  }

  currentY = finalTableBottomY;
  doc.moveTo(x, currentY).lineTo(totalX, currentY).stroke("#000000");

  // ════════════════════════════════════
  // 6. TOTAL ROW
  // ════════════════════════════════════
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text("Final Total", x + 4, currentY + 4);
  doc.text(rs(roundedTotals.finalTotal), tColX[5]! + 4, currentY + 4, {
    width: tColW[5]! - 14,
    align: "right",
  });

  currentY += 20;
  doc.moveTo(x, currentY).lineTo(totalX, currentY).stroke("#000000");

  // ════════════════════════════════════
  // 7. FOOTER (Words & Signature)
  // ════════════════════════════════════
  const footerH = 45;
  const signX = x + 300;

  // Vertical split between Words and Signature block
  doc
    .moveTo(signX, currentY)
    .lineTo(signX, currentY + footerH)
    .stroke("#000000");

  // Left side: Words
  doc
    .font("Helvetica")
    .fontSize(7)
    .text("Amount Chargeable (in words)", x + 4, currentY + 4);
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(
      numberToWords(roundedTotals.finalTotal).toUpperCase(),
      x + 4,
      currentY + 16,
      { width: signX - x - 8 },
    );

  // Right side: Signatory
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(
      `For ${getText(data.businessName).toUpperCase()}`,
      signX + 4,
      currentY + 4,
      { width: totalX - signX - 8, align: "center" },
    );
  doc
    .font("Helvetica")
    .text("Authorised Signatory", signX + 4, currentY + 32, {
      width: totalX - signX - 8,
      align: "center",
    });

  currentY += footerH;
  doc.moveTo(x, currentY).lineTo(totalX, currentY).stroke("#000000");

  // ════════════════════════════════════
  // 8. FINAL NOTICE & OUTER BORDER
  // ════════════════════════════════════
  doc
    .font("Helvetica-Oblique")
    .fontSize(7)
    .text(
      "This is a Computer Generated Invoice No Signature Required",
      x,
      currentY + 3,
      { width, align: "center" },
    );
  currentY += 14;

  // Finally, draw exactly ONE perfect, continuous bounding box over everything
  doc.rect(x, startY, width, currentY - startY).stroke("#000000");
};

// Map bill_pro_legacy to the same improved render function to avoid duplication,
// or use it identically if the config relies on it.
const renderBillProLegacy = renderBillPro;

const renderers: Record<
  InvoicePdfTemplate,
  (
    doc: PDFKit.PDFDocument,
    data: InvoicePdfData,
    config: TemplateConfig,
  ) => void
> = {
  classic: renderClassic,
  modern: renderModern,
  compact: renderCompact,
  bill_pro: renderBillPro,
  bill_pro_legacy: renderBillProLegacy,
};

export const generateInvoicePdf = async (
  data: InvoicePdfData,
): Promise<Buffer> => {
  const doc = createInvoicePdfDocument(data);
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  doc.end();

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
};

export const createInvoicePdfDocument = (
  data: InvoicePdfData,
): PDFKit.PDFDocument => {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const renderer = renderers[data.template] ?? renderClassic;
  const config = getTemplateConfig(data.template);
  renderer(doc, data, config);
  return doc;
};
