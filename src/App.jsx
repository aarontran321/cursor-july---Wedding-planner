import { useEffect, useMemo, useState } from 'react'
import { load, save, resetAll, ROLES, isMatch } from './store'
import Crm from './Crm.jsx'
import { newVendor, newLogEntry, parsePrice } from './crm'

export default function App() {
  const [state, setState] = useState(load)
  const [role, setRole] = useState('spouseA')
  const [section, setSection] = useState('plan') // 'plan' | 'crm'
  const [view, setView] = useState({ name: 'home' }) // {name:'home'} | {name:'album', albumId}
  const [suggestFor, setSuggestFor] = useState(null) // albumId or null
  const [showAdmin, setShowAdmin] = useState(false)

  useEffect(() => save(state), [state])

  const current = ROLES[role]
  const isSpouse = current.kind === 'spouse'

  const update = (fn) => setState((s) => ({ ...s, options: fn(s.options) }))
  const updateVendors = (fn) => setState((s) => ({ ...s, vendors: fn(s.vendors) }))

  // --- CRM handlers ---
  const addVendor = (data) => {
    const v = newVendor(data)
    updateVendors((vs) => [v, ...vs])
    return v.id
  }
  const patchVendor = (id, patch) =>
    updateVendors((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)))
  const deleteVendor = (id) => updateVendors((vs) => vs.filter((v) => v.id !== id))
  const addVendorLog = (id, type, summary) =>
    updateVendors((vs) =>
      vs.map((v) => (v.id === id ? { ...v, log: [newLogEntry(type, summary), ...v.log] } : v))
    )

  // Bridge from the swipe dashboard: turn a matched option into a CRM lead.
  const trackedOptionIds = new Set(state.vendors.map((v) => v.sourceOptionId).filter(Boolean))
  const trackOption = (option, albumId) => {
    if (trackedOptionIds.has(option.id)) return
    addVendor({
      name: option.title,
      category: albumId,
      quoteAmount: parsePrice(option.price),
      status: 'lead',
      sourceOptionId: option.id,
      notes: option.subtitle || '',
    })
  }

  const approvedByAlbum = (albumId) =>
    state.options.filter((o) => o.albumId === albumId && o.status === 'approved')
  const pending = state.options.filter((o) => o.status === 'pending')

  const setLike = (optId, liked) =>
    update((opts) =>
      opts.map((o) =>
        o.id === optId ? { ...o, likes: { ...o.likes, [role]: liked } } : o
      )
    )

  const addSuggestion = (albumId, data) =>
    update((opts) => [
      {
        id: Math.random().toString(36).slice(2, 9),
        albumId,
        title: data.title,
        subtitle: data.subtitle,
        price: data.price,
        imageUrl: data.imageUrl,
        gradient: 'linear-gradient(135deg,#556,#223)',
        status: isSpouse ? 'approved' : 'pending',
        likes: { spouseA: false, spouseB: false },
        addedBy: role,
        createdAt: Date.now(),
      },
      ...opts,
    ])

  const approve = (optId) =>
    update((opts) => opts.map((o) => (o.id === optId ? { ...o, status: 'approved' } : o)))
  const reject = (optId) => update((opts) => opts.filter((o) => o.id !== optId))

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <div
            className="brand"
            onClick={() => {
              setSection('plan')
              setView({ name: 'home' })
            }}
          >
            <span className="ring">💍</span> Marrymap
          </div>
          <nav className="nav-tabs">
            <button
              className={'nav-tab' + (section === 'plan' ? ' active' : '')}
              onClick={() => setSection('plan')}
            >
              Albums
            </button>
            <button
              className={'nav-tab' + (section === 'crm' ? ' active' : '')}
              onClick={() => setSection('crm')}
            >
              CRM
            </button>
          </nav>
        </div>
        <div className="topbar-right">
          {isSpouse && section === 'plan' && (
            <button className="admin-btn" onClick={() => setShowAdmin(true)}>
              Requests
              {pending.length > 0 && <span className="badge">{pending.length}</span>}
            </button>
          )}
          <RoleSwitcher role={role} setRole={setRole} />
        </div>
      </header>

      {section === 'crm' ? (
        <Crm
          vendors={state.vendors}
          onAdd={addVendor}
          onPatch={patchVendor}
          onDelete={deleteVendor}
          onAddLog={addVendorLog}
        />
      ) : view.name === 'home' ? (
        <Home
          albums={state.albums}
          options={state.options}
          onOpen={(albumId) => setView({ name: 'album', albumId })}
        />
      ) : (
        <AlbumView
          album={state.albums.find((a) => a.id === view.albumId)}
          options={approvedByAlbum(view.albumId)}
          role={role}
          isSpouse={isSpouse}
          onLike={setLike}
          onBack={() => setView({ name: 'home' })}
          onSuggest={() => setSuggestFor(view.albumId)}
          onTrack={trackOption}
          trackedOptionIds={trackedOptionIds}
        />
      )}

      {suggestFor && (
        <SuggestModal
          album={state.albums.find((a) => a.id === suggestFor)}
          isSpouse={isSpouse}
          onClose={() => setSuggestFor(null)}
          onAdd={(data) => {
            addSuggestion(suggestFor, data)
            setSuggestFor(null)
          }}
        />
      )}

      {showAdmin && (
        <AdminPanel
          pending={pending}
          albums={state.albums}
          onApprove={approve}
          onReject={reject}
          onClose={() => setShowAdmin(false)}
        />
      )}

      <button
        className="reset"
        onClick={() => {
          resetAll()
          setState(load())
          setView({ name: 'home' })
        }}
        title="Reset demo data"
      >
        ↺ reset
      </button>
    </div>
  )
}

function RoleSwitcher({ role, setRole }) {
  return (
    <div className="roles">
      <span className="roles-label">Viewing as</span>
      {Object.values(ROLES).map((r) => (
        <button
          key={r.id}
          className={'role-chip' + (role === r.id ? ' active' : '')}
          onClick={() => setRole(r.id)}
        >
          <span>{r.emoji}</span> {r.label}
        </button>
      ))}
    </div>
  )
}

function Home({ albums, options, onOpen }) {
  const stats = (albumId) => {
    const inAlbum = options.filter((o) => o.albumId === albumId && o.status === 'approved')
    return {
      count: inAlbum.length,
      matches: inAlbum.filter(isMatch).length,
    }
  }
  return (
    <main className="home">
      <div className="home-head">
        <h1>Your planning albums</h1>
        <p>Tap an album to swipe through the options together.</p>
      </div>
      <div className="grid">
        {albums.map((a) => {
          const s = stats(a.id)
          return (
            <button key={a.id} className="album-card" onClick={() => onOpen(a.id)}>
              <div className="album-emoji">{a.emoji}</div>
              <div className="album-name">{a.name}</div>
              <div className="album-meta">
                <span>{s.count} options</span>
                {s.matches > 0 && <span className="match-pill">💖 {s.matches} matched</span>}
              </div>
            </button>
          )
        })}
      </div>
    </main>
  )
}

function AlbumView({ album, options, role, isSpouse, onLike, onBack, onSuggest, onTrack, trackedOptionIds }) {
  // deck = approved options this role hasn't liked yet (for spouses),
  // guests just browse the full deck.
  const [idx, setIdx] = useState(0)
  const [drag, setDrag] = useState({ x: 0, dragging: false, startX: 0 })

  const matches = options.filter(isMatch)
  const deck = options
  const card = deck[idx]
  const done = idx >= deck.length

  const decide = (liked) => {
    if (card && isSpouse) onLike(card.id, liked)
    setDrag({ x: 0, dragging: false, startX: 0 })
    setIdx((i) => i + 1)
  }

  // pointer drag handlers (spouses vote; guests just flip through)
  const onDown = (e) => setDrag((d) => ({ ...d, dragging: true, startX: e.clientX }))
  const onMove = (e) => {
    if (!drag.dragging) return
    setDrag((d) => ({ ...d, x: e.clientX - d.startX }))
  }
  const onUp = () => {
    if (!drag.dragging) return
    const threshold = 110
    if (drag.x > threshold) return decide(true)
    if (drag.x < -threshold) return decide(false)
    setDrag({ x: 0, dragging: false, startX: 0 })
  }

  const rot = drag.x / 18
  const likeOpacity = Math.max(0, Math.min(1, drag.x / 110))
  const nopeOpacity = Math.max(0, Math.min(1, -drag.x / 110))

  return (
    <main className="album-view">
      <div className="album-top">
        <button className="back" onClick={onBack}>← Albums</button>
        <h2>
          {album.emoji} {album.name}
        </h2>
        <button className="suggest-btn" onClick={onSuggest}>
          + Suggest
        </button>
      </div>

      <div className="deck-wrap">
        <div
          className="deck"
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        >
          {done ? (
            <div className="deck-empty">
              <div className="deck-empty-emoji">🎉</div>
              <p>You've been through every option.</p>
              <button className="ghost" onClick={() => setIdx(0)}>
                Swipe again
              </button>
            </div>
          ) : (
            deck
              .slice(idx, idx + 3)
              .reverse()
              .map((o, i, arr) => {
                const isTop = i === arr.length - 1
                const depth = arr.length - 1 - i
                const style = isTop
                  ? {
                      transform: `translateX(${drag.x}px) rotate(${rot}deg)`,
                      transition: drag.dragging ? 'none' : 'transform .25s ease',
                    }
                  : {
                      transform: `scale(${1 - depth * 0.05}) translateY(${depth * 14}px)`,
                    }
                return (
                  <article
                    key={o.id}
                    className="card"
                    style={style}
                    onPointerDown={isTop ? onDown : undefined}
                  >
                    <div
                      className="card-img"
                      style={
                        o.imageUrl
                          ? { backgroundImage: `url(${o.imageUrl})` }
                          : { backgroundImage: o.gradient }
                      }
                    >
                      {isTop && (
                        <>
                          <span className="stamp like" style={{ opacity: likeOpacity }}>
                            LIKE
                          </span>
                          <span className="stamp nope" style={{ opacity: nopeOpacity }}>
                            PASS
                          </span>
                        </>
                      )}
                      {isMatch(o) && <span className="match-tag">💖 Matched</span>}
                      {o.price && <span className="price-tag">{o.price}</span>}
                    </div>
                    <div className="card-body">
                      <h3>{o.title}</h3>
                      <p>{o.subtitle}</p>
                      <div className="likers">
                        <span className={o.likes.spouseA ? 'on' : ''}>💛 Alex</span>
                        <span className={o.likes.spouseB ? 'on' : ''}>💙 Sam</span>
                      </div>
                    </div>
                  </article>
                )
              })
          )}
        </div>

        {!done && (
          <div className="controls">
            <button className="ctrl nope" onClick={() => decide(false)}>
              ✕
            </button>
            {!isSpouse && <span className="guest-note">Guests browse — spouses vote</span>}
            <button className="ctrl like" onClick={() => decide(true)}>
              ♥
            </button>
          </div>
        )}
      </div>

      {matches.length > 0 && (
        <section className="matches">
          <h4>💖 Matched — you both said yes</h4>
          <div className="match-row">
            {matches.map((o) => {
              const tracked = trackedOptionIds?.has(o.id)
              return (
                <div className="match-card" key={o.id}>
                  <div
                    className="match-thumb"
                    style={
                      o.imageUrl
                        ? { backgroundImage: `url(${o.imageUrl})` }
                        : { backgroundImage: o.gradient }
                    }
                  />
                  <div className="match-info">
                    <strong>{o.title}</strong>
                    <span>{o.price}</span>
                  </div>
                  {onTrack && (
                    <button
                      className={'track-btn' + (tracked ? ' done' : '')}
                      disabled={tracked}
                      onClick={() => onTrack(o, album.id)}
                      title="Add to Vendor CRM as a lead"
                    >
                      {tracked ? '✓ In CRM' : '+ Track in CRM'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}

function SuggestModal({ album, isSpouse, onClose, onAdd }) {
  const [form, setForm] = useState({ title: '', subtitle: '', price: '', imageUrl: '' })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const canSave = form.title.trim().length > 0
  return (
    <Modal onClose={onClose}>
      <h3>
        Suggest for {album.emoji} {album.name}
      </h3>
      <p className="modal-sub">
        {isSpouse
          ? 'Added straight to the album.'
          : 'Your suggestion goes to the couple for approval.'}
      </p>
      <label>Name *</label>
      <input value={form.title} onChange={set('title')} placeholder="e.g. Olive & Vine" />
      <label>Detail</label>
      <input
        value={form.subtitle}
        onChange={set('subtitle')}
        placeholder="e.g. Farm-to-table, 3 courses"
      />
      <label>Price</label>
      <input value={form.price} onChange={set('price')} placeholder="e.g. $95 / head" />
      <label>Image URL (optional)</label>
      <input value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" />
      <div className="modal-actions">
        <button className="ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="primary" disabled={!canSave} onClick={() => onAdd(form)}>
          {isSpouse ? 'Add to album' : 'Send suggestion'}
        </button>
      </div>
    </Modal>
  )
}

function AdminPanel({ pending, albums, onApprove, onReject, onClose }) {
  const albumName = (id) => {
    const a = albums.find((x) => x.id === id)
    return a ? `${a.emoji} ${a.name}` : id
  }
  return (
    <Modal onClose={onClose}>
      <h3>Guest requests</h3>
      <p className="modal-sub">Only you two can approve what shows up in the albums.</p>
      {pending.length === 0 ? (
        <div className="empty-req">No pending requests 🎉</div>
      ) : (
        <div className="req-list">
          {pending.map((o) => (
            <div className="req" key={o.id}>
              <div className="req-info">
                <span className="req-album">{albumName(o.albumId)}</span>
                <strong>{o.title}</strong>
                <span className="req-sub">
                  {o.subtitle} {o.price && `· ${o.price}`}
                </span>
              </div>
              <div className="req-actions">
                <button className="reject" onClick={() => onReject(o.id)}>
                  Reject
                </button>
                <button className="approve" onClick={() => onApprove(o.id)}>
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

function Modal({ children, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
