import { CATEGORY_LABELS, STATUS_LABELS, type Vendor } from "./types";

// Escape a single CSV field per RFC 4180: wrap in quotes if it contains a
// comma, quote, or newline, and double up any embedded quotes. Excel/Sheets
// both parse this correctly.
function escapeField(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const COLUMNS: { header: string; get: (v: Vendor) => string | number | undefined }[] = [
  { header: "Name", get: (v) => v.name },
  { header: "Category", get: (v) => CATEGORY_LABELS[v.category] },
  { header: "Status", get: (v) => STATUS_LABELS[v.status] },
  { header: "Contact", get: (v) => v.contactName },
  { header: "Email", get: (v) => v.email },
  { header: "Phone", get: (v) => v.phone },
  { header: "Website", get: (v) => v.website },
  { header: "Quote", get: (v) => v.quoteAmount },
  { header: "Deposit", get: (v) => v.depositAmount },
  { header: "Deposit Due", get: (v) => v.depositDueDate },
  { header: "Notes", get: (v) => v.notes },
  { header: "Last Activity", get: (v) => v.log[0]?.date },
  { header: "Interactions", get: (v) => v.log.length },
];

export function vendorsToCsv(vendors: Vendor[]): string {
  const rows = [
    COLUMNS.map((c) => c.header),
    ...vendors.map((v) => COLUMNS.map((c) => escapeField(c.get(v)))),
  ];
  return rows.map((row) => row.join(",")).join("\r\n");
}

export function downloadVendorsCsv(vendors: Vendor[]) {
  // Prepend a BOM so Excel opens UTF-8 (e.g. accented vendor names) correctly.
  const csv = "﻿" + vendorsToCsv(vendors);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wedding-vendors-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
