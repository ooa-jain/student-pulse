/**
 * Avatars.
 *
 * Primary source is DiceBear's `adventurer-neutral` style — the same faces the
 * v1 prototype used, so the picker looks exactly as designed.
 *
 * Some campus / proxied networks block third-party hosts, and a broken image in
 * the picker means nobody can start the quest (the Start button waits on a
 * selection). So every <Avatar> falls back to a locally drawn SVG in the same
 * face-only style if the remote one fails. Nothing else changes.
 *
 * To go fully offline: set VITE_AVATAR_SOURCE=local in frontend/.env.
 */

export const AVATAR_SEEDS = ['Nova', 'Pixel', 'Astra', 'Bolt', 'Zuri', 'Kai', 'Mira', 'Rex']

const FORCE_LOCAL = import.meta.env?.VITE_AVATAR_SOURCE === 'local'

export const dicebearUrl = (seed) =>
  `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(
    seed,
  )}&backgroundColor=fdf1dc`

/* ------------------------------------------------------------------ */
/* Local fallback — face-only, same spirit as adventurer-neutral       */
/* ------------------------------------------------------------------ */

const SKIN = ['#F2D3B3', '#EDC3A0', '#DFAE8B', '#C99268', '#B07B53', '#8D5F3C']
const LINE = '#2B2B2B'

const hash = (s) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

const BROWS = [
  `<path d="M25 32c3-3 8-3 11-1M44 31c3-2 8-2 11 1" stroke="${LINE}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  `<path d="M25 30h11M44 30h11" stroke="${LINE}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  `<path d="M25 29c4 1 8 3 10 5M55 29c-4 1-8 3-10 5" stroke="${LINE}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
  `<path d="M26 33c3-4 8-4 10-1M44 32c2-3 7-3 10 1" stroke="${LINE}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
]

const EYES = [
  // wide open
  `<ellipse cx="30" cy="43" rx="5.2" ry="6" fill="#fff" stroke="${LINE}" stroke-width="2"/>
   <ellipse cx="50" cy="43" rx="5.2" ry="6" fill="#fff" stroke="${LINE}" stroke-width="2"/>
   <circle cx="30.6" cy="44" r="2.6" fill="${LINE}"/><circle cx="50.6" cy="44" r="2.6" fill="${LINE}"/>
   <circle cx="29.4" cy="42.6" r="1" fill="#fff"/><circle cx="49.4" cy="42.6" r="1" fill="#fff"/>`,
  // happy squint
  `<path d="M25 45c2-4 8-4 10 0M45 45c2-4 8-4 10 0" stroke="${LINE}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
  // side glance
  `<ellipse cx="30" cy="43" rx="5" ry="5.6" fill="#fff" stroke="${LINE}" stroke-width="2"/>
   <ellipse cx="50" cy="43" rx="5" ry="5.6" fill="#fff" stroke="${LINE}" stroke-width="2"/>
   <circle cx="32" cy="43.6" r="2.4" fill="${LINE}"/><circle cx="52" cy="43.6" r="2.4" fill="${LINE}"/>`,
  // glasses
  `<circle cx="30" cy="43" r="7.6" fill="#fff" stroke="${LINE}" stroke-width="2.2"/>
   <circle cx="50" cy="43" r="7.6" fill="#fff" stroke="${LINE}" stroke-width="2.2"/>
   <path d="M37.6 43h4.8M22.4 41l-4 2M57.6 41l4 2" stroke="${LINE}" stroke-width="2.2" stroke-linecap="round"/>
   <circle cx="30" cy="43.6" r="2.6" fill="${LINE}"/><circle cx="50" cy="43.6" r="2.6" fill="${LINE}"/>`,
]

const MOUTHS = [
  `<path d="M33 57c3.5 4.5 10.5 4.5 14 0" stroke="${LINE}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
  `<path d="M33 56c2 6 12 6 14 0z" fill="${LINE}"/><path d="M36 61c2 2 6 2 8 0z" fill="#E4736F"/>`,
  `<path d="M34 57h12" stroke="${LINE}" stroke-width="2.8" stroke-linecap="round"/>`,
  `<path d="M33 55c3.5 5 10.5 5 14 0" stroke="${LINE}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
   <path d="M38 59c0 3 1 4.5 2 4.5s2-1.5 2-4.5z" fill="#E4736F" stroke="${LINE}" stroke-width="1.6"/>`,
  `<ellipse cx="40" cy="58" rx="4" ry="5" fill="${LINE}"/>`,
]

function localSvg(seed) {
  const h = hash(String(seed))
  const skin = SKIN[h % SKIN.length]
  const brow = BROWS[(h >> 4) % BROWS.length]
  const eye = EYES[(h >> 7) % EYES.length]
  const mouth = MOUTHS[(h >> 10) % MOUTHS.length]

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
  <rect width="80" height="80" fill="#FDF1DC"/>
  <path d="M14 40c0-16 11-27 26-27s26 11 26 27c0 17-11 30-26 30S14 57 14 40z" fill="${skin}"/>
  <ellipse cx="14.5" cy="44" rx="3.6" ry="5" fill="${skin}"/>
  <ellipse cx="65.5" cy="44" rx="3.6" ry="5" fill="${skin}"/>
  ${brow}
  ${eye}
  <path d="M40 47v4c0 1.4-1 2-2 2" stroke="${LINE}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55"/>
  ${mouth}
  <ellipse cx="23" cy="52" rx="4" ry="2.4" fill="#E4736F" opacity=".35"/>
  <ellipse cx="57" cy="52" rx="4" ry="2.4" fill="#E4736F" opacity=".35"/>
</svg>`
}

const cache = new Map()

export function localAvatarUrl(seed) {
  const key = String(seed || 'Nova')
  if (!cache.has(key)) {
    cache.set(key, `data:image/svg+xml;utf8,${encodeURIComponent(localSvg(key))}`)
  }
  return cache.get(key)
}

/** The src to try first. */
export function avatarUrl(seed) {
  const key = String(seed || 'Nova')
  return FORCE_LOCAL ? localAvatarUrl(key) : dicebearUrl(key)
}
