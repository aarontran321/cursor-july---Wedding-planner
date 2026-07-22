// CRM domain data + helpers for Marrymap. Vendor categories intentionally reuse
// the album ids (catering, dj, ...) so a matched swipe can become a CRM lead.

const uid = () => Math.random().toString(36).slice(2, 9)
const today = () => new Date().toISOString().slice(0, 10)

// Categories mirror the planning albums, plus two CRM-only buckets.
export const VENDOR_CATEGORIES = [
  { id: 'venue', label: 'Venue', emoji: '🏛️' },
  { id: 'catering', label: 'Catering', emoji: '🍽️' },
  { id: 'photographer', label: 'Photographer', emoji: '📸' },
  { id: 'dj', label: 'DJ / Music', emoji: '🎧' },
  { id: 'florist', label: 'Florist', emoji: '💐' },
  { id: 'cake', label: 'Cake', emoji: '🎂' },
  { id: 'planner', label: 'Planner', emoji: '📋' },
  { id: 'other', label: 'Other', emoji: '✨' },
]

export const CATEGORY_LABEL = Object.fromEntries(
  VENDOR_CATEGORIES.map((c) => [c.id, c.label])
)
export const CATEGORY_EMOJI = Object.fromEntries(
  VENDOR_CATEGORIES.map((c) => [c.id, c.emoji])
)

// Pipeline stages, ordered lead -> booked. `declined` is a terminal off-ramp.
export const STATUSES = [
  { id: 'lead', label: 'Lead' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'quoted', label: 'Quoted' },
  { id: 'booked', label: 'Booked' },
  { id: 'declined', label: 'Declined' },
]
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]))

export const COMM_TYPES = [
  { id: 'note', label: 'Note', icon: '📝' },
  { id: 'call', label: 'Call', icon: '📞' },
  { id: 'email', label: 'Email', icon: '✉️' },
  { id: 'meeting', label: 'Meeting', icon: '🤝' },
]
export const COMM_ICON = Object.fromEntries(COMM_TYPES.map((c) => [c.id, c.icon]))
export const COMM_LABEL = Object.fromEntries(COMM_TYPES.map((c) => [c.id, c.label]))

export const BUDGET = 45000

export const money = (n) =>
  n == null || Number.isNaN(n)
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(n)

// Pull the first dollar figure out of a scraped price string ("$4,500",
// "$95 / head" -> 4500 / 95). Returns null when there's no number.
export function parsePrice(raw) {
  if (!raw) return null
  const m = String(raw).replace(/,/g, '').match(/\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}

export function newVendor(data = {}) {
  return {
    id: uid(),
    name: data.name || 'Untitled vendor',
    category: data.category || 'other',
    contactName: data.contactName || '',
    email: data.email || '',
    phone: data.phone || '',
    website: data.website || '',
    status: data.status || 'lead',
    quoteAmount: data.quoteAmount ?? null,
    depositAmount: data.depositAmount ?? null,
    depositDueDate: data.depositDueDate || '',
    notes: data.notes || '',
    sourceOptionId: data.sourceOptionId || null,
    createdAt: today(),
    log: data.log || [],
  }
}

export function newLogEntry(type, summary) {
  return { id: uid(), type, summary, date: today() }
}

// ---------- seed ----------
const mk = (name, category, extra = {}) =>
  newVendor({ name, category, ...extra })

export function seedVendors() {
  return [
    mk('Lumière Photography', 'photographer', {
      contactName: 'Ava Bennett',
      email: 'hello@lumierephoto.com',
      phone: '(415) 555-0142',
      website: 'https://lumierephoto.com',
      status: 'booked',
      quoteAmount: 4500,
      depositAmount: 1200,
      depositDueDate: '2026-08-15',
      notes: 'Editorial film + digital. Includes engagement shoot + album.',
      log: [
        { id: uid(), type: 'email', date: '2026-06-28', summary: 'Sent inquiry with our date and venue.' },
        { id: uid(), type: 'call', date: '2026-07-02', summary: 'Talked packages — going with the full-day + album tier.' },
        { id: uid(), type: 'meeting', date: '2026-07-10', summary: 'Coffee to review portfolio. Signed, deposit invoiced.' },
      ],
    }),
    mk('The Glasshouse', 'venue', {
      contactName: 'Marcus Hale',
      email: 'events@theglasshouse.com',
      phone: '(707) 555-0188',
      website: 'https://theglasshouse.com',
      status: 'quoted',
      quoteAmount: 18500,
      depositAmount: 5000,
      depositDueDate: '2026-08-01',
      notes: 'Botanical garden, 180 cap. Waiting on itemized quote breakdown.',
      log: [
        { id: uid(), type: 'email', date: '2026-06-20', summary: 'Requested availability for our weekend.' },
        { id: uid(), type: 'meeting', date: '2026-07-05', summary: 'Site tour — loved the garden. Asked for itemized quote.' },
      ],
    }),
    mk('Olive & Vine', 'catering', {
      contactName: 'Dana Ortiz',
      email: 'book@oliveandvine.com',
      phone: '(415) 555-0177',
      status: 'quoted',
      quoteAmount: 11200,
      notes: 'Farm-to-table, family style. ~$80/head for 140. Tasting booked.',
      log: [
        { id: uid(), type: 'call', date: '2026-07-01', summary: 'Initial call — walked through menu options.' },
        { id: uid(), type: 'meeting', date: '2026-07-25', summary: 'Tasting scheduled at their kitchen.' },
      ],
    }),
    mk('Wildbloom', 'florist', {
      contactName: 'Sofia Nguyen',
      email: 'sofia@wildbloom.co',
      status: 'contacted',
      notes: 'Seasonal, foraged look. Peonies in range for our date.',
      log: [
        { id: uid(), type: 'email', date: '2026-07-08', summary: 'Sent mood board and palette.' },
        { id: uid(), type: 'email', date: '2026-07-14', summary: 'They replied — available, asked our budget range.' },
      ],
    }),
    mk('DJ Mercury', 'dj', {
      contactName: 'Theo Park',
      email: 'theo@djmercury.dj',
      status: 'lead',
      notes: 'Open-format, 2 assistants. Recommended by Lumière.',
      log: [],
    }),
    mk('Gilded Events Co.', 'planner', {
      contactName: 'Priya Raman',
      email: 'priya@gildedevents.co',
      status: 'declined',
      quoteAmount: 9500,
      notes: 'Full-service planning out of budget. Day-of coordination still an option.',
      log: [
        { id: uid(), type: 'call', date: '2026-06-15', summary: 'Intro call about full-service planning.' },
        { id: uid(), type: 'email', date: '2026-06-22', summary: 'Quote came in over budget — passing for now.' },
      ],
    }),
  ]
}

// ---------- CSV export ----------
function escapeField(value) {
  if (value == null) return ''
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const CSV_COLUMNS = [
  ['Name', (v) => v.name],
  ['Category', (v) => CATEGORY_LABEL[v.category] || v.category],
  ['Status', (v) => STATUS_LABEL[v.status] || v.status],
  ['Contact', (v) => v.contactName],
  ['Email', (v) => v.email],
  ['Phone', (v) => v.phone],
  ['Website', (v) => v.website],
  ['Quote', (v) => v.quoteAmount],
  ['Deposit', (v) => v.depositAmount],
  ['Deposit Due', (v) => v.depositDueDate],
  ['Notes', (v) => v.notes],
  ['Last Activity', (v) => v.log[0]?.date],
  ['Interactions', (v) => v.log.length],
]

export function vendorsToCsv(vendors) {
  const rows = [
    CSV_COLUMNS.map(([h]) => h),
    ...vendors.map((v) => CSV_COLUMNS.map(([, get]) => escapeField(get(v)))),
  ]
  return rows.map((r) => r.join(',')).join('\r\n')
}

export function downloadVendorsCsv(vendors) {
  // BOM so Excel reads UTF-8 (accented vendor names) correctly.
  const csv = '﻿' + vendorsToCsv(vendors)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wedding-vendors-${today()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
