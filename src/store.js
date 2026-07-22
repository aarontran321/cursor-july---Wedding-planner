// localStorage-backed store. Shaped so a real backend can drop in later:
// albums[], options[] with status ('approved' | 'pending') and per-spouse likes,
// vendors[] for the CRM.

import { seedVendors } from './crm'

const KEY = 'marrymap:v1'

export const ROLES = {
  spouseA: { id: 'spouseA', label: 'Alex', kind: 'spouse', emoji: '💛' },
  spouseB: { id: 'spouseB', label: 'Sam', kind: 'spouse', emoji: '💙' },
  guest: { id: 'guest', label: 'Guest', kind: 'guest', emoji: '🎁' },
}

const uid = () => Math.random().toString(36).slice(2, 9)

// gradient placeholder so the demo never depends on external images loading
const grad = (a, b) => `linear-gradient(135deg, ${a}, ${b})`

function seed() {
  const albums = [
    { id: 'catering', name: 'Catering', emoji: '🍽️' },
    { id: 'dj', name: 'DJ / Music', emoji: '🎧' },
    { id: 'photographer', name: 'Photographer', emoji: '📸' },
    { id: 'venue', name: 'Venue', emoji: '🏛️' },
    { id: 'florist', name: 'Florist', emoji: '💐' },
    { id: 'cake', name: 'Cake', emoji: '🎂' },
  ]

  const mk = (albumId, title, subtitle, price, colors, extra = {}) => ({
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

  const options = [
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

    // a couple pre-liked so a "match" shows immediately in the demo
  ]
  // make one photographer a match out of the gate
  options[6].likes = { spouseA: true, spouseB: true }
  // one pending guest suggestion waiting for admin approval
  options.push({
    ...mk('dj', 'Sunset Soundsystem', 'Suggested by Aunt Rosa', '$2,000', ['#f70', '#f07']),
    status: 'pending',
    addedBy: 'guest',
  })

  return { albums, options, vendors: seedVendors() }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // migrate state saved before the CRM existed
      if (!parsed.vendors) parsed.vendors = seedVendors()
      return parsed
    }
  } catch {}
  const fresh = seed()
  save(fresh)
  return fresh
}

export function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function resetAll() {
  localStorage.removeItem(KEY)
}

export const isMatch = (o) => o.likes.spouseA && o.likes.spouseB
