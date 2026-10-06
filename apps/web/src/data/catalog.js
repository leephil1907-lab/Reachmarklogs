/**
 * Deterministic catalog seed.
 *
 * Reachmark Logs runs "local-first": the same fixture graph the AccountsBazaar
 * server exposes (User / Listing / Credential / Chat / Transaction / Withdrawal)
 * is materialised in the browser so the whole product is explorable without a
 * database. Flip `VITE_API_MODE=live` to route the same shapes at the Neon +
 * Clerk backend in apps/api instead.
 *
 * Every generator is seeded, so a listing id always renders identical numbers,
 * identical proof art and identical sparklines across reloads.
 */

/* ------------------------------------------------------------------ rng --- */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]
const between = (rng, min, max) => min + rng() * (max - min)
const intBetween = (rng, min, max) => Math.floor(between(rng, min, max + 1))

/* --------------------------------------------------------------- assets --- */
/**
 * Proof media is generated as an inline SVG data-URI so the marketplace never
 * reaches the network (preview-safe, offline-safe, instant). Each panel mimics
 * a platform analytics screenshot: header bar, KPI row, area chart, bars.
 */
export function proofArt(seed, index = 0, accent = '#7c5cff', kind = 'analytics') {
  const rng = mulberry32(hashString(`${seed}:${index}`))
  const w = 720
  const h = 440
  const accent2 = ['#22d3ee', '#f472b6', '#4ade80', '#fbbf24', '#9a86ff'][index % 5]
  const pts = Array.from({ length: 16 }, (_, i) => {
    const base = 300 - rng() * 90 - i * 5
    return `${(i / 15) * (w - 80) + 40},${Math.max(120, Math.min(360, base))}`
  }).join(' ')

  const bars =
    kind === 'audience'
      ? Array.from({ length: 22 }, (_, i) => {
          const bh = 30 + rng() * 130
          return `<rect x="${52 + i * 28}" y="${372 - bh}" width="15" height="${bh}" rx="4" fill="url(#g2)" opacity="${0.35 + rng() * 0.55}"/>`
        }).join('')
      : ''

  const rows =
    kind === 'analytics'
      ? Array.from({ length: 5 }, (_, i) => {
          const y = 226 + i * 34
          return `
            <rect x="52" y="${y}" width="150" height="9" rx="4.5" fill="#8b98b8" opacity="0.45"/>
            <rect x="216" y="${y}" width="${60 + rng() * 120}" height="9" rx="4.5" fill="url(#g2)" opacity="0.8"/>`
        }).join('')
      : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1020"/><stop offset="1" stop-color="#141c31"/>
    </linearGradient>
    <linearGradient id="g2" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.15"/>
      <stop offset="1" stop-color="${accent2}"/>
    </linearGradient>
    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.42"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g1)"/>
  <circle cx="${w - 90}" cy="70" r="90" fill="${accent}" opacity="0.22" filter="url(#soft)"/>
  <circle cx="90" cy="${h - 40}" r="80" fill="${accent2}" opacity="0.16" filter="url(#soft)"/>
  <!-- window chrome -->
  <rect x="16" y="16" width="${w - 32}" height="${h - 32}" rx="16" fill="#080b14" opacity="0.72" stroke="rgba(148,163,214,0.14)"/>
  <circle cx="42" cy="42" r="5" fill="#fb7185"/><circle cx="60" cy="42" r="5" fill="#fbbf24"/><circle cx="78" cy="42" r="5" fill="#4ade80"/>
  <rect x="100" y="34" width="200" height="16" rx="8" fill="#1b2540"/>
  <rect x="52" y="76" width="180" height="13" rx="6.5" fill="#dfe6f5" opacity="0.85"/>
  <rect x="52" y="98" width="110" height="9" rx="4.5" fill="#8b98b8" opacity="0.5"/>
  <rect x="${w - 200}" y="78" width="148" height="30" rx="15" fill="${accent}" opacity="0.28"/>
  <polyline points="${pts}" fill="none" stroke="${accent2}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
  <polygon points="40,372 ${pts} ${w - 40},372" fill="url(#fill)"/>
  ${bars}
  ${rows}
  <rect x="52" y="392" width="${120 + rng() * 200}" height="7" rx="3.5" fill="#5f6d8e" opacity="0.5"/>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** Deterministic "generated" seller + buyer avatars. */
export function avatarArt(seed, label = 'R') {
  const rng = mulberry32(hashString(seed))
  const h1 = Math.floor(rng() * 360)
  const h2 = (h1 + 40 + Math.floor(rng() * 120)) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${h1} 78% 58%)"/>
      <stop offset="1" stop-color="hsl(${h2} 82% 52%)"/>
    </linearGradient></defs>
    <rect width="128" height="128" rx="34" fill="url(#a)"/>
    <rect width="128" height="128" rx="34" fill="#05070d" opacity="0.18"/>
    <text x="64" y="82" font-family="system-ui,-apple-system,Segoe UI,Roboto" font-size="56"
      font-weight="600" fill="#ffffff" text-anchor="middle" opacity="0.95">${label}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** Brand mark used in the navbar / footer / share cards. */
export const reachmarkMark = (size = 40) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
    <defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
    <rect width="64" height="64" rx="17" fill="#080b14"/>
    <rect x="1" y="1" width="62" height="62" rx="16" fill="none" stroke="url(#m)" stroke-opacity="0.5"/>
    <path d="M17 47V17h14.5a9.5 9.5 0 0 1 2.6 18.6L41 47h-7.6l-5.6-10H24v10z" fill="url(#m)"/>
    <circle cx="45" cy="44" r="5.2" fill="#22d3ee"/>
  </svg>`)}`

/* ------------------------------------------------------------- taxonomy --- */
export const CATEGORIES = [
  { id: 'social', label: 'Social', blurb: 'Followers, reach and monetised creator accounts.' },
  { id: 'gaming', label: 'Gaming', blurb: 'Loaded profiles, rare inventories, ranked accounts.' },
  { id: 'streaming', label: 'Streaming', blurb: 'Premium seat logs with long runway remaining.' },
  { id: 'saas', label: 'Aged SaaS & mail', blurb: 'Verified aged domains, mailboxes and seat licences.' },
]

export const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', category: 'social', accent: '#ff4d4d', metric: 'subscribers' },
  { id: 'instagram', label: 'Instagram', category: 'social', accent: '#f472b6', metric: 'followers' },
  { id: 'tiktok', label: 'TikTok', category: 'social', accent: '#22d3ee', metric: 'followers' },
  { id: 'twitter', label: 'X / Twitter', category: 'social', accent: '#b9c4dd', metric: 'followers' },
  { id: 'facebook', label: 'Facebook', category: 'social', accent: '#4a86ff', metric: 'followers' },
  { id: 'linkedin', label: 'LinkedIn', category: 'social', accent: '#38bdf8', metric: 'connections' },
  { id: 'twitch', label: 'Twitch', category: 'gaming', accent: '#9a86ff', metric: 'followers' },
  { id: 'steam', label: 'Steam', category: 'gaming', accent: '#7ce8f7', metric: 'library value' },
  { id: 'riot', label: 'Riot / Valorant', category: 'gaming', accent: '#f472b6', metric: 'rank points' },
  { id: 'roblox', label: 'Roblox', category: 'gaming', accent: '#4ade80', metric: 'robux value' },
  { id: 'netflix', label: 'Netflix', category: 'streaming', accent: '#ff5a5f', metric: 'months runway' },
  { id: 'spotify', label: 'Spotify Premium', category: 'streaming', accent: '#4ade80', metric: 'months runway' },
  { id: 'disney', label: 'Disney+', category: 'streaming', accent: '#38d9f0', metric: 'months runway' },
  { id: 'crunchyroll', label: 'Crunchyroll', category: 'streaming', accent: '#fbbf24', metric: 'months runway' },
  { id: 'gmail', label: 'Aged Gmail', category: 'saas', accent: '#fb7185', metric: 'years aged' },
  { id: 'outlook', label: 'Aged Outlook', category: 'saas', accent: '#22d3ee', metric: 'years aged' },
  { id: 'adobe', label: 'Adobe CC', category: 'saas', accent: '#ff4d4d', metric: 'seat licences' },
  { id: 'notion', label: 'Notion Team', category: 'saas', accent: '#b9c4dd', metric: 'workspace seats' },
]

export const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]))

export const NICHES = [
  'lifestyle', 'fitness', 'finance', 'tech', 'gaming', 'beauty', 'travel',
  'food', 'education', 'business', 'music', 'sports', 'fashion', 'auto',
  'crypto', 'real estate', 'pets', 'diy',
]

export const REGIONS = [
  'United States', 'United Kingdom', 'Germany', 'Nigeria', 'Canada', 'Brazil',
  'India', 'Philippines', 'Netherlands', 'Australia', 'UAE', 'South Africa',
]

const SELLER_NAMES = [
  'Nordvik Digital', 'Kite & Co.', 'Onyx Assets', 'Bluewave Media', 'Corva Labs',
  'Helix Holdings', 'Arclight Vault', 'Meridian Growth', 'Palehorse Studio',
  'Solstice Media', 'Ironbark Accounts', 'Cobalt Collective', 'Verdant Reach',
  'Aeon Portfolios', 'Nimbus Group', 'Ridgeline Assets', 'Foxglove Digital',
  'Quartz Media', 'Lumen Traders', 'Bramble & Bolt',
]

const TITLE_SHAPES = {
  social: [
    '{metric} {niche} account with verified monitisation',
    'Established {niche} creator — {metric} {unit}, clean history',
    'Monetised {niche} page, {metric} {unit}, brand deals active',
    '{niche} audience {unit} — built {age}y, fully organic',
  ],
  gaming: [
    'Loaded {niche} profile with rare inventory',
    'Ranked {niche} account — {metric} {unit}, season rewards intact',
    '{niche} account, {metric} {unit}, original owner since {age}y',
    'High-MMR {niche} profile, full cosmetic vault',
  ],
  streaming: [
    'Premium {niche} seat — {metric} {unit} remaining',
    '{niche} family log, {metric} {unit} runway, unwatched',
    'Shared {niche} premium access with {metric} {unit} left',
    '{niche} annual seat, {metric} {unit} remaining, receipt included',
  ],
  saas: [
    'Aged {niche} mailbox from {age}y — never flagged',
    '{niche} workspace, {metric} {unit}, transferable',
    '{age}y old {niche} account with clean recovery trail',
    'Verified {niche} licence bundle, {metric} {unit}',
  ],
}

const DESCRIPTIONS = [
  'Handed over through Reachmark escrow with a full credential chain: original recovery email, backup codes and a 7-day post-transfer warranty. Analytics screenshots are pulled live from the platform dashboard at listing time, so nothing is retouched.',
  'Built organically over {age} years with zero policy strikes. Audience skews {region} ({split}% top country) and the account retains its original creation date, which keeps it eligible for monetisation programmes.',
  'Reachmark verified {verifiedAt}. The seller has completed {sales} prior transfers on the platform. Ownership test was run on a screen share and recorded to the proof vault — watch it before you bid.',
  'Aged asset with transferable history. Original device fingerprints and session logs were cleaned by our ops team before listing, and the credential chain shows every change made during verification.',
  'Ideal for agencies and media buyers: consistent {engagement} engagement, {views} monthly impressions and an evergreen {niche} content library that keeps ranking. Delivery is same-day, escrow releases on credential confirmation.',
]

/* ------------------------------------------------------------ listings --- */
export const LISTING_COUNT = 72

export function buildCatalog() {
  const listings = []
  const sellers = SELLER_NAMES.map((name, i) => {
    const rng = mulberry32(hashString(name))
    return {
      id: `sl_${i}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      rating: Math.round(between(rng, 4.42, 5) * 100) / 100,
      reviews: intBetween(rng, 18, 640),
      transfers: intBetween(rng, 6, 480),
      joined: `${2019 + intBetween(rng, 0, 5)}-0${intBetween(rng, 1, 9)}-1${intBetween(rng, 0, 9)}`,
      verified: rng() > 0.25,
      responseMins: intBetween(rng, 3, 180),
      avatar: avatarArt(name, name[0]),
      country: pick(rng, REGIONS),
    }
  })

  for (let i = 0; i < LISTING_COUNT; i += 1) {
    const id = `RM-${String(4200 + i * 7)}`
    const rng = mulberry32(hashString(id))
    const platform = pick(rng, PLATFORMS)
    const niche = pick(rng, NICHES)
    const seller = pick(rng, sellers)
    const age = intBetween(rng, 1, 11)
    const category = platform.category

    const scale = category === 'social' ? intBetween(rng, 4_200, 890_000)
      : category === 'gaming' ? intBetween(rng, 90, 14_000)
      : intBetween(rng, 3, 36)

    const unit = category === 'social'
      ? platform.metric
      : category === 'gaming' ? platform.metric
      : category === 'streaming' ? 'months runway'
      : 'years aged'

    const price = category === 'social'
      ? Math.round(scale * between(rng, 0.012, 0.058) + intBetween(rng, 90, 600))
      : category === 'gaming' ? intBetween(rng, 120, 9_400)
      : category === 'streaming' ? intBetween(rng, 14, 190)
      : intBetween(rng, 35, 780)

    const engagement = Math.round(between(rng, 0.9, 9.4) * 10) / 10
    const monthlyViews = Math.round(scale * between(rng, 1.6, 12))

    const title = pick(rng, TITLE_SHAPES[category])
      .replace('{metric}', compact(scale))
      .replace('{unit}', unit)
      .replace('{niche}', niche)
      .replace('{age}', age)

    const verified = rng() > 0.22
    const monetized = category === 'social' ? rng() > 0.42 : rng() > 0.6

    const history = Array.from({ length: 12 }, (_, m) => {
      const r = mulberry32(hashString(`${id}:h${m}`))
      return Math.round(price * between(r, 0.86, 1.14))
    })

    const growth = Array.from({ length: 14 }, (_, d) => {
      const r = mulberry32(hashString(`${id}:g${d}`))
      return Math.round(scale * (0.82 + d * 0.014) * between(r, 0.97, 1.04))
    })

    listings.push({
      id,
      slug: `${platform.id}-${niche}-${String(i).padStart(2, '0')}`,
      title: title[0].toUpperCase() + title.slice(1),
      platform: platform.id,
      platformLabel: platform.label,
      category,
      niche,
      handle: `@${niche}${intBetween(rng, 10, 99)}${platform.id.slice(0, 3)}`,
      scale,
      unit,
      engagement,
      monthlyViews,
      price,
      currency: 'USD',
      age,
      verified,
      monetized,
      featured: rng() > 0.78,
      trending: rng() > 0.72,
      status: rng() > 0.93 ? 'pending' : 'active',
      country: pick(rng, REGIONS),
      language: pick(rng, ['English', 'English', 'Spanish', 'Portuguese', 'German', 'French']),
      audienceSplit: intBetween(rng, 34, 92),
      deliveryHours: intBetween(rng, 1, 72),
      views24h: intBetween(rng, 12, 940),
      watchers: intBetween(rng, 1, 68),
      offers: intBetween(rng, 0, 11),
      description: pick(rng, DESCRIPTIONS)
        .replace('{age}', age)
        .replace('{region}', pick(rng, REGIONS))
        .replace('{split}', intBetween(rng, 34, 92))
        .replace('{sales}', seller.transfers)
        .replace('{engagement}', `${engagement}%`)
        .replace('{views}', compact(monthlyViews))
        .replace('{niche}', niche)
        .replace('{verifiedAt}', `${intBetween(rng, 1, 28)} days ago`),
      proof: [
        { kind: 'analytics', label: 'Analytics dashboard', src: proofArt(id, 0, platform.accent, 'analytics') },
        { kind: 'audience', label: 'Audience geography', src: proofArt(id, 1, platform.accent, 'audience') },
        { kind: 'analytics', label: 'Monetisation status', src: proofArt(id, 2, platform.accent, 'analytics') },
      ],
      seller,
      credentialChain: {
        submitted: true,
        verified,
        changed: rng() > 0.55,
        handover: rng() > 0.5 ? 'Email + password + 2FA seed' : 'Email + password + recovery codes',
        escrowDays: intBetween(rng, 3, 14),
      },
      priceHistory: history,
      growth,
      createdAt: `2026-0${intBetween(rng, 1, 9)}-${String(intBetween(rng, 10, 28)).padStart(2, '0')}`,
      assured: rng() > 0.6,
    })
  }
  return { listings, sellers }
}

export function compact(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`
  return `${n}`
}

export const money = (n, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

export const CATALOG = buildCatalog()
