"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCrm } from "./store";
import { downloadVendorsCsv } from "./csv";
import {
  CATEGORY_LABELS,
  COMM_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  type CommType,
  type Vendor,
  type VendorCategory,
  type VendorStatus,
} from "./types";

const money = (n?: number) =>
  n === undefined || Number.isNaN(n)
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(n);

const STATUS_STYLES: Record<VendorStatus, string> = {
  lead: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  contacted: "bg-sky-50 text-sky-700 ring-sky-200",
  quoted: "bg-amber-50 text-amber-700 ring-amber-200",
  booked: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  declined: "bg-rose-50 text-rose-600 ring-rose-200",
};

const COMM_ICONS: Record<CommType, string> = {
  call: "📞",
  email: "✉️",
  meeting: "🤝",
  note: "📝",
};

export default function CrmPage() {
  const crm = useCrm();
  const [statusFilter, setStatusFilter] = useState<VendorStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [view, setView] = useState<"cards" | "table">("cards");

  const selected = crm.vendors.find((v) => v.id === selectedId) ?? null;

  const stats = useMemo(() => {
    const active = crm.vendors.filter((v) => v.status !== "declined");
    const booked = crm.vendors
      .filter((v) => v.status === "booked")
      .reduce((sum, v) => sum + (v.quoteAmount ?? 0), 0);
    const projected = active.reduce((sum, v) => sum + (v.quoteAmount ?? 0), 0);
    const deposits = crm.vendors
      .filter((v) => v.status === "booked" && v.depositAmount)
      .reduce((sum, v) => sum + (v.depositAmount ?? 0), 0);
    return { booked, projected, deposits, count: active.length };
  }, [crm.vendors]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: crm.vendors.length };
    for (const s of STATUS_ORDER) c[s] = crm.vendors.filter((v) => v.status === s).length;
    return c;
  }, [crm.vendors]);

  const visible =
    statusFilter === "all"
      ? crm.vendors
      : crm.vendors.filter((v) => v.status === statusFilter);

  const budgetPct = Math.min(100, Math.round((stats.projected / crm.budget) * 100));
  const overBudget = stats.projected > crm.budget;

  return (
    <div className="min-h-full bg-gradient-to-b from-rose-50/60 via-white to-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/"
              className="mb-2 inline-block text-sm text-zinc-400 transition-colors hover:text-zinc-600"
            >
              ← Back
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              Vendor CRM
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Track your wedding vendors, quotes, and conversations in one place.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadVendorsCsv(visible)}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
              title="Export current view to CSV (opens in Sheets or Excel)"
            >
              ↓ Export CSV
            </button>
            <button
              onClick={crm.resetToSeed}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50"
            >
              Reset demo
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-600"
            >
              + Add vendor
            </button>
          </div>
        </header>

        {/* Stats */}
        <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Active vendors" value={String(stats.count)} />
          <StatCard label="Projected spend" value={money(stats.projected)} />
          <StatCard label="Booked" value={money(stats.booked)} accent="emerald" />
          <StatCard label="Deposits due" value={money(stats.deposits)} accent="amber" />
        </section>

        {/* Budget bar */}
        <section className="mb-8 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-medium text-zinc-700">
              Projected vs. budget
            </span>
            <span className={`text-sm font-semibold ${overBudget ? "text-rose-600" : "text-zinc-500"}`}>
              {money(stats.projected)} / {money(crm.budget)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className={`h-full rounded-full transition-all ${overBudget ? "bg-rose-500" : "bg-emerald-500"}`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
          {overBudget && (
            <p className="mt-2 text-xs text-rose-600">
              Projected spend is over budget by {money(stats.projected - crm.budget)}.
            </p>
          )}
        </section>

        {/* Filter pills + view toggle */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <FilterPill
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
              label="All"
              count={counts.all}
            />
            {STATUS_ORDER.map((s) => (
              <FilterPill
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
                label={STATUS_LABELS[s]}
                count={counts[s]}
              />
            ))}
          </div>
          <div className="flex rounded-full bg-zinc-100 p-0.5">
            <ViewToggleButton active={view === "cards"} onClick={() => setView("cards")} label="Cards" />
            <ViewToggleButton active={view === "table"} onClick={() => setView("table")} label="Table" />
          </div>
        </div>

        {/* Vendor list */}
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center text-sm text-zinc-400">
            No vendors here yet.
          </div>
        ) : view === "cards" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((v) => (
              <VendorCard key={v.id} vendor={v} onClick={() => setSelectedId(v.id)} />
            ))}
          </div>
        ) : (
          <VendorTable vendors={visible} onSelect={setSelectedId} />
        )}
      </div>

      {selected && (
        <VendorDrawer
          vendor={selected}
          onClose={() => setSelectedId(null)}
          onUpdate={crm.updateVendor}
          onAddLog={crm.addLogEntry}
          onDelete={(id) => {
            crm.deleteVendor(id);
            setSelectedId(null);
          }}
        />
      )}

      {showAdd && (
        <AddVendorDialog
          onClose={() => setShowAdd(false)}
          onCreate={(v) => {
            const id = crm.addVendor(v);
            setShowAdd(false);
            setSelectedId(id);
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "amber";
}) {
  const accentText =
    accent === "emerald"
      ? "text-emerald-600"
      : accent === "amber"
        ? "text-amber-600"
        : "text-zinc-900";
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-semibold ${accentText}`}>{value}</div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-zinc-900 text-white"
          : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
      }`}
    >
      {label}
      <span className={`ml-1.5 ${active ? "text-zinc-300" : "text-zinc-400"}`}>{count}</span>
    </button>
  );
}

function StatusBadge({ status }: { status: VendorStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function VendorCard({ vendor, onClick }: { vendor: Vendor; onClick: () => void }) {
  const last = vendor.log[0];
  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-2xl border border-zinc-100 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-rose-400">
            {CATEGORY_LABELS[vendor.category]}
          </div>
          <div className="mt-0.5 text-lg font-semibold text-zinc-900">{vendor.name}</div>
        </div>
        <StatusBadge status={vendor.status} />
      </div>

      {vendor.contactName && (
        <div className="mt-2 text-sm text-zinc-500">{vendor.contactName}</div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-zinc-50 pt-3">
        <span className="text-sm text-zinc-400">Quote</span>
        <span className="text-sm font-semibold text-zinc-900">{money(vendor.quoteAmount)}</span>
      </div>

      {last && (
        <div className="mt-3 line-clamp-2 text-xs text-zinc-400">
          {COMM_ICONS[last.type]} {last.summary}
        </div>
      )}
    </button>
  );
}

function ViewToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
      }`}
    >
      {label}
    </button>
  );
}

function VendorTable({
  vendors,
  onSelect,
}: {
  vendors: Vendor[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
            <th className="px-4 py-3 font-medium">Vendor</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 text-right font-medium">Quote</th>
            <th className="px-4 py-3 text-right font-medium">Deposit</th>
            <th className="px-4 py-3 font-medium">Deposit due</th>
            <th className="px-4 py-3 font-medium">Last activity</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((v) => (
            <tr
              key={v.id}
              onClick={() => onSelect(v.id)}
              className="cursor-pointer border-b border-zinc-50 transition-colors last:border-0 hover:bg-rose-50/40"
            >
              <td className="px-4 py-3 font-medium text-zinc-900">{v.name}</td>
              <td className="px-4 py-3 text-zinc-500">{CATEGORY_LABELS[v.category]}</td>
              <td className="px-4 py-3">
                <StatusBadge status={v.status} />
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {v.contactName ?? <span className="text-zinc-300">—</span>}
                {v.email && <div className="text-xs text-zinc-400">{v.email}</div>}
              </td>
              <td className="px-4 py-3 text-right font-medium text-zinc-900">{money(v.quoteAmount)}</td>
              <td className="px-4 py-3 text-right text-zinc-600">{money(v.depositAmount)}</td>
              <td className="px-4 py-3 text-zinc-500">
                {v.depositDueDate ?? <span className="text-zinc-300">—</span>}
              </td>
              <td className="px-4 py-3 text-zinc-400">
                {v.log[0]?.date ?? <span className="text-zinc-300">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VendorDrawer({
  vendor,
  onClose,
  onUpdate,
  onAddLog,
  onDelete,
}: {
  vendor: Vendor;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Vendor>) => void;
  onAddLog: (vendorId: string, entry: { type: CommType; date: string; summary: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [logType, setLogType] = useState<CommType>("note");
  const [logSummary, setLogSummary] = useState("");

  const submitLog = () => {
    const summary = logSummary.trim();
    if (!summary) return;
    onAddLog(vendor.id, {
      type: logType,
      date: new Date().toISOString().slice(0, 10),
      summary,
    });
    setLogSummary("");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-zinc-900/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-zinc-100 bg-white/90 px-6 py-5 backdrop-blur">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-rose-400">
              {CATEGORY_LABELS[vendor.category]}
            </div>
            <h2 className="mt-0.5 text-xl font-semibold text-zinc-900">{vendor.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {/* Status pipeline */}
          <section>
            <SectionLabel>Status</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdate(vendor.id, { status: s })}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-all ${
                    vendor.status === s
                      ? STATUS_STYLES[s]
                      : "text-zinc-400 ring-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section className="space-y-2.5">
            <SectionLabel>Contact</SectionLabel>
            <Field label="Contact name" value={vendor.contactName} onChange={(contactName) => onUpdate(vendor.id, { contactName })} />
            <Field label="Email" value={vendor.email} onChange={(email) => onUpdate(vendor.id, { email })} type="email" />
            <Field label="Phone" value={vendor.phone} onChange={(phone) => onUpdate(vendor.id, { phone })} />
            <Field label="Website" value={vendor.website} onChange={(website) => onUpdate(vendor.id, { website })} />
          </section>

          {/* Quote & booking */}
          <section className="space-y-2.5">
            <SectionLabel>Quote &amp; booking</SectionLabel>
            <NumField label="Quote amount" value={vendor.quoteAmount} onChange={(quoteAmount) => onUpdate(vendor.id, { quoteAmount })} />
            <NumField label="Deposit amount" value={vendor.depositAmount} onChange={(depositAmount) => onUpdate(vendor.id, { depositAmount })} />
            <Field label="Deposit due" value={vendor.depositDueDate} onChange={(depositDueDate) => onUpdate(vendor.id, { depositDueDate })} type="date" />
          </section>

          {/* Notes */}
          <section>
            <SectionLabel>Notes</SectionLabel>
            <textarea
              value={vendor.notes ?? ""}
              onChange={(e) => onUpdate(vendor.id, { notes: e.target.value })}
              rows={3}
              placeholder="Add notes…"
              className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none transition-colors focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
          </section>

          {/* Communication log */}
          <section>
            <SectionLabel>Communication log</SectionLabel>
            <div className="mb-3 flex gap-2">
              <select
                value={logType}
                onChange={(e) => setLogType(e.target.value as CommType)}
                className="rounded-xl border border-zinc-200 px-2.5 py-2 text-sm text-zinc-700 outline-none focus:border-rose-300"
              >
                {(Object.keys(COMM_LABELS) as CommType[]).map((t) => (
                  <option key={t} value={t}>
                    {COMM_ICONS[t]} {COMM_LABELS[t]}
                  </option>
                ))}
              </select>
              <input
                value={logSummary}
                onChange={(e) => setLogSummary(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitLog()}
                placeholder="Log an interaction…"
                className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
              <button
                onClick={submitLog}
                className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
              >
                Add
              </button>
            </div>

            {vendor.log.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-400">No interactions logged yet.</p>
            ) : (
              <ol className="space-y-3 border-l border-zinc-100 pl-4">
                {vendor.log.map((entry) => (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[21px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-white text-[8px] ring-2 ring-rose-200">
                      {COMM_ICONS[entry.type]}
                    </span>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-700">
                        {COMM_LABELS[entry.type]}
                      </span>
                      <span className="text-[11px] text-zinc-400">{entry.date}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-zinc-600">{entry.summary}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <button
            onClick={() => onDelete(vendor.id)}
            className="w-full rounded-xl border border-rose-100 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-50"
          >
            Delete vendor
          </button>
        </div>
      </aside>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-500">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none transition-colors focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
      />
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-500">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
          $
        </span>
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className="w-full rounded-xl border border-zinc-200 py-2 pl-7 pr-3 text-sm outline-none transition-colors focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
        />
      </div>
    </label>
  );
}

function AddVendorDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (v: {
    name: string;
    category: VendorCategory;
    contactName?: string;
    email?: string;
    status: VendorStatus;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<VendorCategory>("photographer");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      category,
      contactName: contactName.trim() || undefined,
      email: email.trim() || undefined,
      status: "lead",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Add vendor</h2>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-500">Name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lumière Photography"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-500">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as VendorCategory)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
            >
              {(Object.keys(CATEGORY_LABELS) as VendorCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-500">Contact name</span>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-500">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600"
          >
            Add vendor
          </button>
        </div>
      </div>
    </div>
  );
}
