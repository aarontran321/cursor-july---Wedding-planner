import { useMemo, useState } from 'react'
import {
  VENDOR_CATEGORIES,
  CATEGORY_LABEL,
  CATEGORY_EMOJI,
  STATUSES,
  STATUS_LABEL,
  COMM_TYPES,
  COMM_ICON,
  COMM_LABEL,
  BUDGET,
  money,
  downloadVendorsCsv,
} from './crm'

export default function Crm({ vendors, onAdd, onPatch, onDelete, onAddLog }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const selected = vendors.find((v) => v.id === selectedId) || null

  const stats = useMemo(() => {
    const active = vendors.filter((v) => v.status !== 'declined')
    const sum = (list, k) => list.reduce((t, v) => t + (v[k] || 0), 0)
    return {
      count: active.length,
      projected: sum(active, 'quoteAmount'),
      booked: sum(vendors.filter((v) => v.status === 'booked'), 'quoteAmount'),
      deposits: sum(vendors.filter((v) => v.status === 'booked'), 'depositAmount'),
    }
  }, [vendors])

  const counts = useMemo(() => {
    const c = { all: vendors.length }
    for (const s of STATUSES) c[s.id] = vendors.filter((v) => v.status === s.id).length
    return c
  }, [vendors])

  const visible =
    statusFilter === 'all' ? vendors : vendors.filter((v) => v.status === statusFilter)

  const pct = Math.min(100, Math.round((stats.projected / BUDGET) * 100))
  const over = stats.projected > BUDGET

  return (
    <main className="crm">
      <div className="crm-head">
        <div>
          <h1>Vendor CRM</h1>
          <p>Track vendors, quotes, and conversations in one place.</p>
        </div>
        <div className="crm-head-actions">
          <button className="ghost" onClick={() => downloadVendorsCsv(visible)}>
            ↓ Export CSV
          </button>
          <button className="primary" onClick={() => setShowAdd(true)}>
            + Add vendor
          </button>
        </div>
      </div>

      <div className="crm-stats">
        <Stat label="Active vendors" value={String(stats.count)} />
        <Stat label="Projected spend" value={money(stats.projected)} />
        <Stat label="Booked" value={money(stats.booked)} tone="green" />
        <Stat label="Deposits due" value={money(stats.deposits)} tone="gold" />
      </div>

      <div className="crm-budget">
        <div className="crm-budget-top">
          <span>Projected vs. budget</span>
          <span className={over ? 'over' : ''}>
            {money(stats.projected)} / {money(BUDGET)}
          </span>
        </div>
        <div className="crm-bar">
          <div className={'crm-bar-fill' + (over ? ' over' : '')} style={{ width: pct + '%' }} />
        </div>
      </div>

      <div className="crm-filters">
        <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
          All <b>{counts.all}</b>
        </Chip>
        {STATUSES.map((s) => (
          <Chip key={s.id} active={statusFilter === s.id} onClick={() => setStatusFilter(s.id)}>
            {s.label} <b>{counts[s.id]}</b>
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="crm-empty">No vendors here yet.</div>
      ) : (
        <div className="grid">
          {visible.map((v) => (
            <VendorCard key={v.id} vendor={v} onClick={() => setSelectedId(v.id)} />
          ))}
        </div>
      )}

      {selected && (
        <VendorDetail
          vendor={selected}
          onClose={() => setSelectedId(null)}
          onPatch={onPatch}
          onAddLog={onAddLog}
          onDelete={(id) => {
            onDelete(id)
            setSelectedId(null)
          }}
        />
      )}

      {showAdd && (
        <AddVendor
          onClose={() => setShowAdd(false)}
          onCreate={(data) => {
            const id = onAdd(data)
            setShowAdd(false)
            setSelectedId(id)
          }}
        />
      )}
    </main>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div className="crm-stat">
      <div className="crm-stat-label">{label}</div>
      <div className={'crm-stat-value' + (tone ? ' ' + tone : '')}>{value}</div>
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button className={'role-chip' + (active ? ' active' : '')} onClick={onClick}>
      {children}
    </button>
  )
}

function StatusBadge({ status }) {
  return <span className={'crm-badge ' + status}>{STATUS_LABEL[status]}</span>
}

function VendorCard({ vendor, onClick }) {
  const last = vendor.log[0]
  return (
    <button className="album-card crm-card" onClick={onClick}>
      <div className="crm-card-top">
        <span className="crm-cat">
          {CATEGORY_EMOJI[vendor.category]} {CATEGORY_LABEL[vendor.category]}
        </span>
        <StatusBadge status={vendor.status} />
      </div>
      <div className="crm-card-name">{vendor.name}</div>
      {vendor.contactName && <div className="crm-card-contact">{vendor.contactName}</div>}
      <div className="crm-card-foot">
        <span>Quote</span>
        <strong>{money(vendor.quoteAmount)}</strong>
      </div>
      {last && (
        <div className="crm-card-last">
          {COMM_ICON[last.type]} {last.summary}
        </div>
      )}
      {vendor.sourceOptionId && <div className="crm-fromswipe">💖 from a matched pick</div>}
    </button>
  )
}

function VendorDetail({ vendor, onClose, onPatch, onAddLog, onDelete }) {
  const [logType, setLogType] = useState('note')
  const [logText, setLogText] = useState('')

  const patch = (p) => onPatch(vendor.id, p)
  const num = (val) => (val === '' ? null : Number(val))

  const submitLog = () => {
    const summary = logText.trim()
    if (!summary) return
    onAddLog(vendor.id, logType, summary)
    setLogText('')
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal crm-detail" onClick={(e) => e.stopPropagation()}>
        <div className="crm-detail-head">
          <div>
            <span className="crm-cat">
              {CATEGORY_EMOJI[vendor.category]} {CATEGORY_LABEL[vendor.category]}
            </span>
            <h3>{vendor.name}</h3>
          </div>
          <button className="crm-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <label>Status</label>
        <div className="crm-pipeline">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              className={'crm-badge ' + s.id + (vendor.status === s.id ? ' active' : ' dim')}
              onClick={() => patch({ status: s.id })}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="crm-fields">
          <Field label="Contact name" value={vendor.contactName} onChange={(v) => patch({ contactName: v })} />
          <Field label="Email" value={vendor.email} onChange={(v) => patch({ email: v })} />
          <Field label="Phone" value={vendor.phone} onChange={(v) => patch({ phone: v })} />
          <Field label="Website" value={vendor.website} onChange={(v) => patch({ website: v })} />
          <Field label="Quote ($)" type="number" value={vendor.quoteAmount ?? ''} onChange={(v) => patch({ quoteAmount: num(v) })} />
          <Field label="Deposit ($)" type="number" value={vendor.depositAmount ?? ''} onChange={(v) => patch({ depositAmount: num(v) })} />
          <Field label="Deposit due" type="date" value={vendor.depositDueDate} onChange={(v) => patch({ depositDueDate: v })} />
          <Field label="Category" as="select" value={vendor.category} onChange={(v) => patch({ category: v })}>
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Field>
        </div>

        <label>Notes</label>
        <textarea
          className="crm-textarea"
          rows={2}
          value={vendor.notes}
          placeholder="Add notes…"
          onChange={(e) => patch({ notes: e.target.value })}
        />

        <label>Communication log</label>
        <div className="crm-log-add">
          <select value={logType} onChange={(e) => setLogType(e.target.value)}>
            {COMM_TYPES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
          <input
            value={logText}
            placeholder="Log an interaction…"
            onChange={(e) => setLogText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitLog()}
          />
          <button className="primary" onClick={submitLog}>
            Add
          </button>
        </div>

        {vendor.log.length === 0 ? (
          <div className="crm-log-empty">No interactions logged yet.</div>
        ) : (
          <ol className="crm-log">
            {vendor.log.map((e) => (
              <li key={e.id}>
                <span className="crm-log-icon">{COMM_ICON[e.type]}</span>
                <div>
                  <div className="crm-log-meta">
                    <b>{COMM_LABEL[e.type]}</b>
                    <span>{e.date}</span>
                  </div>
                  <p>{e.summary}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        <button className="crm-delete" onClick={() => onDelete(vendor.id)}>
          Delete vendor
        </button>
      </div>
    </div>
  )
}

function AddVendor({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', category: 'venue', contactName: '', email: '' })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const canSave = form.name.trim().length > 0
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add vendor</h3>
        <p className="modal-sub">Starts as a lead — fill in details after.</p>
        <label>Name *</label>
        <input value={form.name} onChange={set('name')} placeholder="e.g. Lumière Photography" />
        <label>Category</label>
        <select className="crm-select" value={form.category} onChange={set('category')}>
          {VENDOR_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <label>Contact name</label>
        <input value={form.contactName} onChange={set('contactName')} />
        <label>Email</label>
        <input value={form.email} onChange={set('email')} />
        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={!canSave} onClick={() => onCreate({ ...form, status: 'lead' })}>
            Add vendor
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', as, children }) {
  return (
    <label className="crm-field">
      <span>{label}</span>
      {as === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {children}
        </select>
      ) : (
        <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  )
}
