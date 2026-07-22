// Self-contained CRM domain types. Kept local to the /crm route so it doesn't
// couple to the (not-yet-built) clips feature.

export type VendorCategory =
  | "photographer"
  | "venue"
  | "florist"
  | "caterer"
  | "music"
  | "planner"
  | "other";

// Pipeline stages, ordered lead -> booked. `declined` is a terminal off-ramp.
export type VendorStatus =
  | "lead"
  | "contacted"
  | "quoted"
  | "booked"
  | "declined";

export type CommType = "call" | "email" | "meeting" | "note";

export interface CommLogEntry {
  id: string;
  type: CommType;
  date: string; // ISO date string
  summary: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  status: VendorStatus;
  quoteAmount?: number; // total quoted price
  depositAmount?: number; // deposit to secure booking
  depositDueDate?: string; // ISO date string
  notes?: string;
  createdAt: string; // ISO date string
  log: CommLogEntry[];
}

export const CATEGORY_LABELS: Record<VendorCategory, string> = {
  photographer: "Photographer",
  venue: "Venue",
  florist: "Florist",
  caterer: "Caterer",
  music: "Music / DJ",
  planner: "Planner",
  other: "Other",
};

export const STATUS_LABELS: Record<VendorStatus, string> = {
  lead: "Lead",
  contacted: "Contacted",
  quoted: "Quoted",
  booked: "Booked",
  declined: "Declined",
};

export const STATUS_ORDER: VendorStatus[] = [
  "lead",
  "contacted",
  "quoted",
  "booked",
  "declined",
];

export const COMM_LABELS: Record<CommType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
};
