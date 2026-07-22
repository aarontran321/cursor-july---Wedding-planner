// localStorage-backed store, ported from the Vite prototype.
// Shaped so a real backend can drop in later.

export type RoleId = 'spouseA' | 'spouseB' | 'guest'

export interface Role {
  id: RoleId
  label: string
  kind: 'spouse' | 'guest'
  emoji: string
}

export interface Option {
  id: string
  albumId: string
  title: string
  subtitle: string
  price: string
  imageUrl: string
  gradient: string
  status: 'approved' | 'pending'
  likes: { spouseA: boolean; spouseB: boolean }
  addedBy: RoleId
  createdAt: number
}

export interface Album {
  id: string
  name: string
  emoji: string
}

export interface Notif {
  id: string
  text: string
  emoji: string
  read: boolean
  createdAt: number
}

export interface State {
  albums: Album[]
  options: Option[]
  notifications: Notif[]
}

const KEY = 'marrymap:v2'

export const ROLES: Record<RoleId, Role> = {
  spouseA: { id: 'spouseA', label: 'Alex', kind: 'spouse', emoji: '💛' },
  spouseB: { id: 'spouseB', label: 'Sam', kind: 'spouse', emoji: '💙' },
  guest: { id: 'guest', label: 'Guest', kind: 'guest', emoji: '🎁' },
}

export const uid = () => Math.random().toString(36).slice(2, 9)

// gradient placeholder so the demo never depends on external images loading
const grad = (a: string, b: string) => `linear-gradient(135deg, ${a}, ${b})`

function seed(): State {
  const albums: Album[] = [
    { id: 'catering', name: 'Catering', emoji: '🍽️' },
    { id: 'dj', name: 'DJ / Music', emoji: '🎧' },
    { id: 'photographer', name: 'Photographer', emoji: '📸' },
    { id: 'venue', name: 'Venue', emoji: '🏛️' },
    { id: 'florist', name: 'Florist', emoji: '💐' },
    { id: 'cake', name: 'Cake', emoji: '🎂' },
  ]

  const mk = (
    albumId: string,
    title: string,
    subtitle: string,
    price: string,
    colors: [string, string],
    extra: Partial<Option> = {}
  ): Option => ({
    id: uid(),
    albumId,
    title,
    subtitle,
    price,
    imageUrl: '',
    gradient: grad(colors[0], colors[1]),
    status: 'approved',
    likes: { spouseA: false, spouseB: false },
    addedBy: 'spouseA',
    createdAt: Date.now(),
    ...extra,
  })

  const options: Option[] = [
    mk('catering', 'Olive & Vine', 'Farm-to-table, 3 courses', '$95 / head', ['#f6a', '#f60']),
    mk('catering', 'Saffron Table', 'Modern Indian, family style', '$78 / head', ['#fa0', '#f50']),
    mk('catering', 'Coastal Spread', 'Seafood + raw bar', '$120 / head', ['#0cf', '#06f']),

    mk('dj', 'DJ Mercury', 'Open-format, 2 assistants', '$1,800', ['#a0f', '#40f']),
    mk('dj', 'The Vinyl Bros', 'Live band + DJ combo', '$3,200', ['#f0a', '#a04']),
    mk('dj', 'Neon Nights', 'EDM / Top 40 specialist', '$1,400', ['#0ff', '#08f']),

    mk('photographer', 'Luma Studio', 'Editorial, film + digital', '$4,500', ['#fd0', '#f80']),
    mk('photographer', 'Rowan Fields', 'Candid documentary style', '$3,100', ['#7c5', '#293']),
    mk('photographer', 'Amara Lens', 'Bright & airy, drone add-on', '$2,900', ['#fbc', '#f69']),

    mk('venue', 'The Glasshouse', 'Botanical garden, 180 cap', '$9,000', ['#3d8', '#085']),
    mk('venue', 'Ironworks Loft', 'Industrial downtown, 120 cap', '$6,500', ['#89a', '#456']),

    mk('florist', 'Wildbloom', 'Seasonal, foraged look', '$2,200', ['#f9b', '#e37']),
    mk('cake', 'Sugar & Salt', 'Naked cake, 4 tiers', '$650', ['#fda', '#f97']),
  ]

  // make one photographer a match out of the gate
  options[6].likes = { spouseA: true, spouseB: true }
  // a guest idea is auto-accepted straight into the album for the couple to swipe
  options.push(
    mk('dj', 'Sunset Soundsystem', 'Added by Aunt Rosa', '$2,000', ['#f70', '#f07'], {
      status: 'approved',
      addedBy: 'guest',
    })
  )

  const notifications: Notif[] = [
    { id: uid(), text: 'Aunt Rosa joined the board', emoji: '🎉', read: false, createdAt: Date.now() - 6e4 },
    { id: uid(), text: 'Jordan (best man) joined the board', emoji: '🎉', read: false, createdAt: Date.now() - 12e5 },
  ]

  return { albums, options, notifications }
}

// names used to simulate a guest accepting the invite
export const GUEST_NAMES = [
  'Maya', 'Uncle Dev', 'Priya', 'Grandma Lee', 'Chris', 'Nina', 'Theo', 'Aunt Bea',
]

export function load(): State {
  if (typeof window === 'undefined') return seed()
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as Partial<State>
      if (!Array.isArray(s.albums) || !Array.isArray(s.options)) return reseed()
      if (!Array.isArray(s.notifications)) s.notifications = seed().notifications
      return s as State
    }
  } catch {}
  return reseed()
}

function reseed(): State {
  const fresh = seed()
  save(fresh)
  return fresh
}

export function save(state: State) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function resetAll() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}

export const isMatch = (o: Option) => o.likes.spouseA && o.likes.spouseB
