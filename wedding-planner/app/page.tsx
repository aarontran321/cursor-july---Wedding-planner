'use client'

import { useEffect, useRef, useState } from 'react'
import './marrymap.css'
import {
  load,
  save,
  resetAll,
  ROLES,
  isMatch,
  uid,
  type State,
  type RoleId,
  type Option,
  type Album,
  type Notif,
} from './store'

type View = { name: 'home' } | { name: 'album'; albumId: string }

export default function Page() {
  const [state, setState] = useState<State | null>(null)
  const role: RoleId = 'spouseA' // single fixed viewer
  const [view, setView] = useState<View>({ name: 'home' })
  const [suggestFor, setSuggestFor] = useState<string | null>(null)
  const [showNotifs, setShowNotifs] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // load on mount only (avoids SSR localStorage + hydration mismatch)
  useEffect(() => setState(load()), [])
  useEffect(() => {
    if (state) save(state)
  }, [state])

  if (!state) return null

  const current = ROLES[role]
  const isSpouse = current.kind === 'spouse'

  const update = (fn: (opts: Option[]) => Option[]) =>
    setState((s) => (s ? { ...s, options: fn(s.options) } : s))

  const approvedByAlbum = (albumId: string) =>
    state.options.filter((o) => o.albumId === albumId && o.status === 'approved')

  const notifications = state.notifications || []
  const unread = notifications.filter((n) => !n.read).length

  const setLike = (optId: string, liked: boolean) =>
    update((opts) =>
      opts.map((o) => (o.id === optId ? { ...o, likes: { ...o.likes, [role]: liked } } : o))
    )

  // Guest ideas are auto-accepted straight into the album for the couple to swipe on.
  const addSuggestion = (albumId: string, data: SuggestForm) =>
    update((opts) => [
      {
        id: uid(),
        albumId,
        title: data.title,
        subtitle: data.subtitle,
        price: data.price,
        imageUrl: data.imageUrl,
        gradient: 'linear-gradient(135deg,#556,#223)',
        status: 'approved',
        likes: { spouseA: false, spouseB: false },
        addedBy: role,
        createdAt: Date.now(),
      },
      ...opts,
    ])

  const openNotifs = () => {
    setShowNotifs(true)
    setState((s) =>
      s ? { ...s, notifications: (s.notifications || []).map((n) => ({ ...n, read: true })) } : s
    )
  }

  // copy a shareable (placeholder) invite link and confirm with a small toast
  const invite = async () => {
    const url = `${window.location.origin}/join?board=alex-and-sam`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // clipboard may be unavailable; the toast still confirms intent
    }
    setToast(url)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="mm">
      <header className="topbar">
        <div className="brand" onClick={() => setView({ name: 'home' })}>
          <span className="ring">💍</span> Marrymap
        </div>
        <div className="topbar-right">
          {isSpouse && (
            <>
              <button className="invite-btn" onClick={invite}>
                + Invite guest
              </button>
              <button className="admin-btn bell" onClick={openNotifs} title="Notifications">
                🔔
                {unread > 0 && <span className="badge">{unread}</span>}
              </button>
            </>
          )}
          <div className="roles">
            <span className="roles-label">Viewing as</span>
            <span className="role-chip active">
              <span>{current.emoji}</span> {current.label}
            </span>
          </div>
        </div>
      </header>

      {view.name === 'home' ? (
        <Home
          albums={state.albums}
          options={state.options}
          onOpen={(albumId) => setView({ name: 'album', albumId })}
        />
      ) : (
        <AlbumView
          album={state.albums.find((a) => a.id === view.albumId)!}
          options={approvedByAlbum(view.albumId)}
          isSpouse={isSpouse}
          onLike={setLike}
          onBack={() => setView({ name: 'home' })}
          onSuggest={() => setSuggestFor(view.albumId)}
        />
      )}

      {suggestFor && (
        <SuggestModal
          album={state.albums.find((a) => a.id === suggestFor)!}
          isSpouse={isSpouse}
          onClose={() => setSuggestFor(null)}
          onAdd={(data) => {
            addSuggestion(suggestFor, data)
            setSuggestFor(null)
          }}
        />
      )}

      {showNotifs && (
        <NotificationsPanel notifications={notifications} onClose={() => setShowNotifs(false)} />
      )}

      {toast && (
        <div className="mm-toast" role="status">
          <span className="mm-toast-title">🔗 Invite link copied</span>
          <span className="mm-toast-url">{toast}</span>
        </div>
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

function Home({
  albums,
  options,
  onOpen,
}: {
  albums: Album[]
  options: Option[]
  onOpen: (albumId: string) => void
}) {
  const stats = (albumId: string) => {
    const inAlbum = options.filter((o) => o.albumId === albumId && o.status === 'approved')
    return { count: inAlbum.length, matches: inAlbum.filter(isMatch).length }
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

function AlbumView({
  album,
  options,
  isSpouse,
  onLike,
  onBack,
  onSuggest,
}: {
  album: Album
  options: Option[]
  isSpouse: boolean
  onLike: (id: string, liked: boolean) => void
  onBack: () => void
  onSuggest: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [drag, setDrag] = useState({ x: 0, dragging: false, startX: 0 })

  const matches = options.filter(isMatch)
  const deck = options
  const card = deck[idx]
  const done = idx >= deck.length

  const decide = (liked: boolean) => {
    if (card && isSpouse) onLike(card.id, liked)
    setDrag({ x: 0, dragging: false, startX: 0 })
    setIdx((i) => i + 1)
  }

  const onDown = (e: React.PointerEvent) => setDrag((d) => ({ ...d, dragging: true, startX: e.clientX }))
  const onMove = (e: React.PointerEvent) => {
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
        <button className="back" onClick={onBack}>
          ← Albums
        </button>
        <h2>
          {album.emoji} {album.name}
        </h2>
        <button className="suggest-btn" onClick={onSuggest}>
          + Suggest
        </button>
      </div>

      <div className="deck-wrap">
        <div className="deck" onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
          {done ? (
            <div className="deck-empty">
              <div className="deck-empty-emoji">🎉</div>
              <p>You&apos;ve been through every option.</p>
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
                const style: React.CSSProperties = isTop
                  ? {
                      transform: `translateX(${drag.x}px) rotate(${rot}deg)`,
                      transition: drag.dragging ? 'none' : 'transform .25s ease',
                    }
                  : { transform: `scale(${1 - depth * 0.05}) translateY(${depth * 14}px)` }
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
            {matches.map((o) => (
              <div className="match-card" key={o.id}>
                <div
                  className="match-thumb"
                  style={
                    o.imageUrl
                      ? { backgroundImage: `url(${o.imageUrl})` }
                      : { backgroundImage: o.gradient }
                  }
                />
                <div>
                  <strong>{o.title}</strong>
                  <span>{o.price}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

interface SuggestForm {
  title: string
  subtitle: string
  price: string
  imageUrl: string
}

function SuggestModal({
  album,
  isSpouse,
  onClose,
  onAdd,
}: {
  album: Album
  isSpouse: boolean
  onClose: () => void
  onAdd: (data: SuggestForm) => void
}) {
  const [form, setForm] = useState<SuggestForm>({ title: '', subtitle: '', price: '', imageUrl: '' })
  const set = (k: keyof SuggestForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value })
  const canSave = form.title.trim().length > 0
  return (
    <Modal onClose={onClose}>
      <h3>
        Suggest for {album.emoji} {album.name}
      </h3>
      <p className="modal-sub">
        {isSpouse ? 'Added straight to the album.' : 'Added to the album for the couple to swipe on.'}
      </p>
      <label>Name *</label>
      <input value={form.title} onChange={set('title')} placeholder="e.g. Olive & Vine" />
      <label>Detail</label>
      <input value={form.subtitle} onChange={set('subtitle')} placeholder="e.g. Farm-to-table, 3 courses" />
      <label>Price</label>
      <input value={form.price} onChange={set('price')} placeholder="e.g. $95 / head" />
      <label>Image URL (optional)</label>
      <input value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…" />
      <div className="modal-actions">
        <button className="ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="primary" disabled={!canSave} onClick={() => onAdd(form)}>
          {isSpouse ? 'Add to album' : 'Add idea'}
        </button>
      </div>
    </Modal>
  )
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function NotificationsPanel({
  notifications,
  onClose,
}: {
  notifications: Notif[]
  onClose: () => void
}) {
  return (
    <Modal onClose={onClose}>
      <h3>Notifications</h3>
      <p className="modal-sub">People you invited who joined the board.</p>
      {notifications.length === 0 ? (
        <div className="empty-req">No notifications yet 🎉</div>
      ) : (
        <div className="req-list">
          {notifications.map((n) => (
            <div className="notif" key={n.id}>
              <span className="notif-emoji">{n.emoji || '🎉'}</span>
              <div className="notif-info">
                <strong>{n.text}</strong>
                <span className="req-sub">{timeAgo(n.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="mm-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
