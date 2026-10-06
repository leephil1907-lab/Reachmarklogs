#!/usr/bin/env node
/**
 * seed.mjs — populate Postgres from the same deterministic catalog the web
 * client renders in local mode.
 *
 * The generator in `apps/web/src/data/catalog.js` is imported directly rather
 * than duplicated, so `VITE_API_MODE=local` and `VITE_API_MODE=live` show the
 * identical floor: same 72 listings, same sellers, same chats, same proof art.
 *
 *   npm run db:seed            # upsert (safe to re-run)
 *   npm run db:reset           # wipe + reseed
 */
import { createHash, randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import prisma from '../src/configs/prisma.js'
import { CATALOG, PLATFORM_MAP } from '../../web/src/data/catalog.js'
import { hashPassword } from '../src/services/authService.js'
// The one place niches are translated between the client's vocabulary
// ("real estate") and the Postgres enum (real_estate).
import { toEnumNiche } from '../src/services/catalogService.js'

const here = dirname(fileURLToPath(import.meta.url))
void here
void resolve

const sha = (s) => createHash('sha256').update(s).digest('hex')
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000)

/* The Prisma enums are a superset of the client's platform ids, so the mapping
   is explicit — this is where a new platform would be registered. */
const ENUM_PLATFORM = {
  youtube: 'youtube', instagram: 'instagram', tiktok: 'tiktok', twitter: 'twitter',
  facebook: 'facebook', linkedin: 'linkedin', twitch: 'twitch', steam: 'steam',
  riot: 'riot', roblox: 'roblox', netflix: 'netflix', spotify: 'spotify',
  disney: 'disney', crunchyroll: 'crunchyroll', gmail: 'gmail', outlook: 'outlook',
  adobe: 'adobe', notion: 'notion',
}

/** The password every seeded principal shares. Documented, not secret. */
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'reachmark-demo-2026'

async function main() {
  const started = Date.now()
  console.log(`\n  Seeding ${CATALOG.listings.length} logs and ${CATALOG.sellers.length} sellers…\n`)

  /* ------------------------------------------------------------- sellers -- */
  const sellerRows = CATALOG.sellers.map((s, i) => ({
    id: s.id,
    email: `${s.slug}@reachmarklogs.test`,
    name: s.name,
    image: s.avatar,
    earned: Math.round(s.transfers * 420 * 100) / 100,
    withdrawn: Math.round(s.transfers * 380 * 100) / 100,
    createdAt: new Date(s.joined),
  }))

  /* ------------------------------------------------- demo + ops principals -- */
  /**
   * These three ship with real credential hashes so the product can be driven
   * the moment it boots — the password is the documented one below, and every
   * account is flagged `emailVerified` so nothing is gated behind a mail server
   * that a fresh clone does not have. Rotate or delete them before a real
   * deployment; `npm run db:reset` reproduces them.
   */
  const demoPasswordHash = await hashPassword(DEMO_PASSWORD)
  const principals = [
    { id: 'demo_user_seller', email: 'ada@reachmarklogs.test', name: 'Ada Okonjo', image: CATALOG.sellers[0].avatar, earned: 74210.25, withdrawn: 55789.75, createdAt: new Date('2024-03-18'), role: 'seller', plan: 'pro', emailVerified: true, handle: 'ada', country: 'Nigeria', bio: 'Consolidating a portfolio of aged social and gaming logs. Escrow only.' },
    { id: 'demo_user_buyer', email: 'ada.buyer@reachmarklogs.test', name: 'Ada Okonjo', image: CATALOG.sellers[0].avatar, earned: 0, withdrawn: 0, createdAt: new Date('2024-03-18'), role: 'buyer', plan: 'free', emailVerified: true, handle: 'adabuyer', country: 'Nigeria', bio: 'Buying aged accounts with clean recovery trails.' },
    { id: 'demo_user_admin', email: 'ops@reachmarklogs.test', name: 'Maya Ops', image: CATALOG.sellers[1].avatar, earned: 0, withdrawn: 0, createdAt: new Date('2023-11-02'), role: 'admin', plan: 'premium', emailVerified: true, handle: 'maya', country: 'United Kingdom', bio: 'Ops desk. Credential chain review, escrow disputes, payouts.' },
  ].map((u) => ({ ...u, passwordHash: demoPasswordHash, status: 'active', lastLoginAt: null }))

  /**
   * Sellers created from the fixture get a credential too, but a randomised one:
   * they exist to make the floor look real, not to be signed into. The ops desk
   * can hand any of them a reset link from the admin surface.
   */
  for (const row of sellerRows) {
    row.passwordHash = null
    row.role = 'seller'
    row.emailVerified = true
  }

  for (const row of [...sellerRows, ...principals]) {
    await prisma.user.upsert({ where: { id: row.id }, create: row, update: row })
  }
  console.log(`  ✓ users              ${sellerRows.length + principals.length}`)

  /* ------------------------------------------------------------ listings -- */
  const listingRows = CATALOG.listings.map((l) => ({
    id: l.id,
    ownerId: l.seller.id,
    title: l.title,
    platform: ENUM_PLATFORM[l.platform] ?? 'instagram',
    username: l.handle.replace(/^@/, ''),
    followers_count: l.scale,
    engagement_rate: l.engagement,
    monthly_views: l.monthlyViews,
    niche: toEnumNiche(l.niche),
    price: l.price,
    description: l.description,
    verified: l.verified,
    monetized: l.monetized,
    country: l.country.split(' ')[0],
    age_range: l.age >= 5 ? 'established' : 'growing',
    status: l.status === 'pending' ? 'inactive' : 'active',
    featured: l.featured,
    images: l.proof.map((p) => p.src),
    platformAssured: l.assured,
    isCredentialSubmitted: true,
    isCredentialVerified: l.credentialChain.verified,
    isCredentialChanged: l.credentialChain.changed,
    // Reachmark extension
    assetClass: l.category,
    handle: l.handle,
    region: l.country,
    language: l.language,
    audienceSplitPct: l.audienceSplit,
    deliveryHours: l.deliveryHours,
    escrowDays: l.credentialChain.escrowDays,
    handoverFormat: l.credentialChain.handover,
    viewCount24h: l.views24h,
    watcherCount: l.watchers,
    offerCount: l.offers,
    fairValueEstimate: Math.round(l.priceHistory.reduce((a, b) => a + b, 0) / l.priceHistory.length),
    createdAt: new Date(l.createdAt),
  }))

  for (const row of listingRows) {
    await prisma.listing.upsert({ where: { id: row.id }, create: row, update: row })
  }
  console.log(`  ✓ listings           ${listingRows.length}`)

  /* ---------------------------------------------- credential + chain + proof */
  let chainEvents = 0
  let proofs = 0
  for (const l of CATALOG.listings) {
    await prisma.credential.upsert({
      where: { id: `cred_${l.id}` },
      create: {
        id: `cred_${l.id}`,
        listingId: l.id,
        originalCredential: [{ field: 'recoveryEmail', value: 'seller-alias@mail.test' }],
        updatedCredential: l.credentialChain.changed
          ? [{ field: 'recoveryEmail', value: 'reachmark-escrow@alias.test', changedAt: new Date().toISOString() }]
          : [],
        createdAt: new Date(l.createdAt),
        submittedAt: new Date(l.createdAt),
        verifiedAt: l.credentialChain.verified ? daysAgo(2) : null,
        verifiedBy: l.credentialChain.verified ? 'ops.maya' : null,
        handover: l.credentialChain.handover,
      },
      update: {},
    })

    const events = [
      { kind: 'submitted', actor: l.seller.id, detail: l.credentialChain.handover, days: 9 },
      { kind: 'ownership_test', actor: l.seller.id, detail: 'Screen share recorded (6m 42s)', days: 8 },
      l.credentialChain.verified
        ? { kind: 'verified', actor: 'ops.maya', detail: 'Artefacts matched platform state', days: 7 }
        : { kind: 'flagged', actor: 'system', detail: 'Awaiting ops review (SLA 4h)', days: 6 },
      l.credentialChain.changed
        ? { kind: 'rotated', actor: 'ops.maya', detail: 'Recovery email moved to escrow alias', days: 5 }
        : { kind: 'submitted', actor: 'system', detail: 'Recovery email unchanged — rotates at transfer', days: 5 },
    ]
    for (const [i, e] of events.entries()) {
      const id = `ce_${l.id}_${i}`
      await prisma.credentialEvent.upsert({
        where: { id },
        create: {
          id,
          listingId: l.id,
          kind: e.kind,
          actor: e.actor,
          detail: e.detail,
          hash: sha(`${l.id}:${e.kind}:${i}`),
          createdAt: daysAgo(e.days),
        },
        update: {},
      })
      chainEvents += 1
    }

    for (const [i, p] of l.proof.entries()) {
      const id = `pa_${l.id}_${i}`
      await prisma.proofArtifact.upsert({
        where: { id },
        create: {
          id,
          listingId: l.id,
          kind: p.kind,
          label: p.label,
          url: p.src,
          sha256: sha(p.src),
          bytes: p.src.length,
          createdAt: new Date(l.createdAt),
        },
        update: {},
      })
      proofs += 1
    }
  }
  console.log(`  ✓ credential chains  ${chainEvents}`)
  console.log(`  ✓ proof artefacts    ${proofs}`)

  /* --------------------------------------------------------------- chats -- */
  const threadSpecs = CATALOG.listings.slice(0, 3).map((l, i) => ({
    id: `chat_seed_${i + 1}`,
    listingId: l.id,
    seller: l.seller,
    lines: [
      { who: 'buyer', body: `Is the ${l.platformLabel} handle transferable without a cooldown?`, mins: 52 },
      { who: 'seller', body: 'Yes — no cooldown on the handle, only the recovery email needs 48h to settle.', mins: 48 },
      { who: 'guard', body: 'Reachmark guard: never move payment off-platform. Escrow holds funds until you confirm the credential chain.', mins: 30 },
      { who: 'buyer', body: 'Can you hold it until Friday? I am wiring through escrow today.', mins: 12 },
      { who: 'seller', body: 'Escrow opened — credential chain attached.', mins: 7 },
    ],
  }))

  let messages = 0
  for (const t of threadSpecs) {
    await prisma.chat.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        chatUserId: 'demo_user_buyer',
        ownerUserId: t.seller.id,
        listingId: t.listingId,
        active: true,
        lastMessage: t.lines[t.lines.length - 1].body,
        lastMessageSenderId: t.seller.id,
        isLastMessageRead: false,
        isTokenAmountPaid: true,
      },
      update: {},
    })
    for (const [i, m] of t.lines.entries()) {
      const at = daysAgo(0)
      at.setMinutes(at.getMinutes() - m.mins)
      if (m.who === 'guard') {
        const id = `pm_${t.id}_${i}`
        await prisma.platformMessage.upsert({
          where: { id },
          create: { id, chatId: t.id, message: m.body, sender_id: 'platform', createdAt: at },
          update: {},
        })
      } else {
        const id = `msg_${t.id}_${i}`
        await prisma.message.upsert({
          where: { id },
          create: {
            id,
            chatId: t.id,
            message: m.body,
            sender_id: m.who === 'buyer' ? 'demo_user_buyer' : t.seller.id,
            createdAt: at,
          },
          update: {},
        })
      }
      messages += 1
    }
  }
  console.log(`  ✓ chats / messages   ${threadSpecs.length} / ${messages}`)

  /* ----------------------------------------------- transactions + payouts -- */
  const txSpecs = CATALOG.listings.slice(2, 9).map((l, i) => ({
    id: `tx_${l.id}`,
    listingId: l.id,
    ownerId: l.seller.id,
    userId: 'demo_user_buyer',
    amount: Math.round(l.price * (i % 2 ? 1 : 0.94)),
    escrowState: i < 3 ? 'funded' : i < 6 ? 'released' : 'chain_confirmed',
    isPaid: i >= 3,
    feeAmount: Math.round(l.price * (Number(process.env.REACHMARK_FEE_BPS ?? 750) / 10_000) * 100) / 100,
    createdAt: daysAgo(i + 1),
    releaseAt: daysAgo(i + 1 - (Number(process.env.ESCROW_DEFAULT_DAYS ?? 7))),
  }))
  for (const t of txSpecs) {
    await prisma.transaction.upsert({ where: { id: t.id }, create: t, update: t })
  }

  const wdSpecs = CATALOG.sellers.slice(0, 6).map((s, i) => ({
    id: `wd_${s.id}`,
    userId: s.id,
    amount: Math.round((480 + i * 620 + (i % 3) * 210) * 100) / 100,
    account: [{ method: ['Bank transfer', 'Paystack', 'USDT (TRC-20)'][i % 3], detail: 'on file' }],
    isWithdrawn: i >= 2,
    createdAt: daysAgo(i * 4),
  }))
  for (const w of wdSpecs) {
    await prisma.withdrawal.upsert({ where: { id: w.id }, create: w, update: w })
  }
  console.log(`  ✓ transactions       ${txSpecs.length}`)
  console.log(`  ✓ withdrawals        ${wdSpecs.length}`)

  const counts = {
    users: await prisma.user.count(),
    listings: await prisma.listing.count(),
    credentialEvents: await prisma.credentialEvent.count(),
    proofArtifacts: await prisma.proofArtifact.count(),
    chats: await prisma.chat.count(),
    messages: (await prisma.message.count()) + (await prisma.platformMessage.count()),
    transactions: await prisma.transaction.count(),
    withdrawals: await prisma.withdrawal.count(),
  }

  console.log(`\n  Done in ${Date.now() - started}ms`)
  console.table(counts)
  void PLATFORM_MAP
  void randomUUID
}

main()
  .catch((err) => {
    console.error('\n  Seed failed:', err.message)
    if (/ECONNREFUSED|ENOTFOUND/.test(err.message)) {
      console.error('  Is Postgres running?  npm run pg:local   (or point DATABASE_URL at Neon)')
    }
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
