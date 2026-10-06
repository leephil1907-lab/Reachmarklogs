import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowUpRight, BadgeCheck, BookOpen, Boxes, ChevronRight, Command, CreditCard,
  Gauge, Layers, LayoutDashboard, LifeBuoy, LogOut, Menu, MessageSquare, PlayCircle,
  Search, Settings, Shield, ShieldCheck, Sparkles, Store, Tag, Terminal, User, Wand2, X, Wallet,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, usd, usd2 } from '../../lib/format'
import { reachmarkMark } from '../../data/catalog'
import { Badge, Button } from '../ui'
import { toggleCommand, toggleMobileNav } from '../../app/features/uiSlice'
import { signOut } from '../../app/features/authSlice'
import BUILD from '../../data/harvest/build-manifest.json'

const NAV = [
  { to: '/marketplace', label: 'Marketplace', icon: Store },
  { to: '/sell', label: 'Sell a log', icon: Tag },
  { to: '/studio', label: 'Proof Studio', icon: PlayCircle },
  { to: '/tools', label: 'Tool library', icon: Layers },
  { to: '/docs', label: 'Build manifest', icon: Terminal },
]

export function Navbar() {
  const dispatch = useDispatch()
  const nav = useNavigate()
  const loc = useLocation()
  const { user, signedIn, status, demo } = useSelector((s) => s.auth)
  // `status` distinguishes "still checking" from "signed out", so the header
  // never flashes a signed-in shell at an anonymous visitor.
  const checking = status === 'loading'
  const mobileOpen = useSelector((s) => s.ui.mobileNavOpen)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    dispatch(toggleMobileNav(false))
    setMenuOpen(false)
  }, [loc.pathname, dispatch])

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-[70] transition-[background-color,backdrop-filter,border-color,box-shadow] duration-500',
          scrolled
            ? 'border-b border-white/8 bg-ink-950/72 backdrop-blur-xl shadow-[0_18px_60px_-32px_rgba(0,0,0,.9)]'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-2.5">
            <img src={reachmarkMark(38)} alt="Reachmark Logs" className="h-9 w-9 rounded-xl" />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-[15px] font-semibold tracking-tight">Reachmark</span>
              <span className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-volt-300/80">Logs</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className="group relative px-3 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-100">
                {({ isActive }) => (
                  <>
                    <span className={cn('relative z-10 flex items-center gap-1.5', isActive && 'text-white')}>
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-xl bg-white/[0.06] ring-1 ring-volt-500/25"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => dispatch(toggleCommand(true))}
              className="group hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] text-slate-400 transition hover:border-volt-500/40 hover:text-slate-200 sm:flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Search logs, tools, people…</span>
              <kbd className="ml-6 hidden items-center gap-0.5 rounded-md border border-white/10 bg-ink-900 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-400 md:flex">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>

            <button
              onClick={() => dispatch(toggleCommand(true))}
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 sm:hidden"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>

            {checking ? (
              <span className="h-9 w-24 animate-pulse rounded-xl bg-white/[0.05]" aria-hidden />
            ) : signedIn ? (
              <>
                {user.role !== 'buyer' && !demo && (
                  <Link
                    to="/dashboard"
                    className="hidden items-center gap-2 rounded-xl border border-verify-500/25 bg-verify-500/10 px-3 py-2 text-[12.5px] font-medium text-verify-400 transition hover:bg-verify-500/16 md:flex"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    <span className="tnum">{usd(user.balance)}</span>
                  </Link>
                )}
                <div className="relative">
                  <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1 pr-2 transition hover:border-volt-500/40">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-[linear-gradient(120deg,#9a86ff,#38d9f0)] text-[12px] font-bold text-ink-950">
                      {user.name.split(' ').map((w) => w[0]).join('')}
                    </span>
                    <ChevronRight className={cn('h-3.5 w-3.5 text-slate-400 transition-transform', menuOpen && 'rotate-90')} />
                  </button>
                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl2 glass edge noise p-2"
                      >
                        <div className="px-3 py-2">
                          <div className="text-[13px] font-semibold">{user.name}</div>
                          <div className="text-[11.5px] text-slate-500">{user.email}</div>
                          <div className="mt-2 flex items-center gap-1.5">
                            <Badge tone="verify" dot>{user.kyc}</Badge>
                            <Badge tone="volt">{user.plan.toUpperCase()}</Badge>
                            <Badge tone="neutral">trust {user.trustScore}</Badge>
                          </div>
                        </div>
                        <div className="my-1 h-px bg-white/8" />
                        {[
                          { to: '/dashboard', label: 'Seller dashboard', icon: LayoutDashboard },
                          { to: '/messages', label: 'Messages', icon: MessageSquare, badge: user.unread },
                          { to: '/account', label: 'Account & security', icon: ShieldCheck },
                          ...(user.role === 'admin' ? [{ to: '/admin', label: 'Ops console', icon: Gauge }] : []),
                          { to: '/pricing', label: 'Plans & billing', icon: CreditCard },
                        ].map((i) => (
                          <Link key={i.to} to={i.to} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-slate-300 transition hover:bg-white/[0.06] hover:text-white">
                            <i.icon className="h-4 w-4 text-slate-500" />
                            {i.label}
                            {i.badge ? <span className="ml-auto rounded-full bg-magenta-500/20 px-1.5 text-[10px] font-semibold text-magenta-400">{i.badge}</span> : null}
                          </Link>
                        ))}
                        {demo && (
                          <>
                            <div className="my-1 h-px bg-white/8" />
                            <div className="px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                              Local mode — this persona comes from the fixtures, not an account.
                            </div>
                          </>
                        )}
                        <button
                          onClick={async () => {
                            await dispatch(signOut())
                            setMenuOpen(false)
                            toast.success('Signed out')
                            nav('/')
                          }}
                          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-danger-400 transition hover:bg-danger-500/10"
                        >
                          <LogOut className="h-4 w-4" /> Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <Button size="sm" onClick={() => nav('/auth')}>
                Sign in <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            )}

            <button
              onClick={() => dispatch(toggleMobileNav(true))}
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => dispatch(toggleMobileNav(false))}
              className="fixed inset-0 z-[85] bg-ink-950/70 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 right-0 z-[86] w-[82%] max-w-sm overflow-y-auto glass noise p-5 lg:hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-volt-300">Navigate</span>
                <button onClick={() => dispatch(toggleMobileNav(false))} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-5 space-y-1">
                {NAV.concat([
                  { to: '/dashboard', label: 'Seller dashboard', icon: LayoutDashboard },
                  { to: '/messages', label: 'Messages', icon: MessageSquare },
                  { to: '/admin', label: 'Ops console', icon: Gauge },
                  { to: '/pricing', label: 'Plans', icon: CreditCard },
                  { to: '/about', label: 'About the merge', icon: BookOpen },
                ]).map((item, i) => (
                  <motion.div key={item.to} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-xl border px-3.5 py-3 text-[14px] transition',
                          isActive
                            ? 'border-volt-500/35 bg-volt-500/12 text-white'
                            : 'border-white/8 bg-white/[0.02] text-slate-300',
                        )
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                      <ChevronRight className="ml-auto h-4 w-4 text-slate-500" />
                    </NavLink>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 rounded-xl2 border border-white/8 bg-ink-900/60 p-4">
                <div className="flex items-center gap-2 text-[12px] text-slate-400">
                  <Shield className="h-4 w-4 text-verify-400" /> Escrow protection active
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
                  Every Reachmark transfer holds funds until the credential chain is confirmed by you.
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

/* ---------------------------------------------------------- CommandPalette - */
const PAGES = [
  { to: '/marketplace', label: 'Marketplace', icon: Store, hint: 'Browse every verified log' },
  { to: '/sell', label: 'Sell a log', icon: Tag, hint: 'Six-step listing wizard' },
  { to: '/studio', label: 'Proof Studio', icon: Wand2, hint: 'Generate proof reels' },
  { to: '/tools', label: 'Tool library', icon: Layers, hint: '50 clawed reference tools' },
  { to: '/docs', label: 'Build manifest', icon: Terminal, hint: 'What the merge produced' },
  { to: '/dashboard', label: 'Seller dashboard', icon: LayoutDashboard, hint: 'Earnings, orders, payouts' },
  { to: '/admin', label: 'Ops console', icon: Gauge, hint: 'Verification queue + revenue' },
  { to: '/messages', label: 'Messages', icon: MessageSquare, hint: 'Escrow-guarded threads' },
  { to: '/pricing', label: 'Plans & billing', icon: CreditCard, hint: 'Free, Pro, Desk' },
  { to: '/about', label: 'About the merge', icon: LifeBuoy, hint: 'Repos, licenses, credits' },
]

export function CommandPalette() {
  const open = useSelector((s) => s.ui.commandOpen)
  const dispatch = useDispatch()
  const nav = useNavigate()
  const listings = useSelector((s) => s.catalog.listings)
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        dispatch(toggleCommand())
      }
      if (e.key === 'Escape') dispatch(toggleCommand(false))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    const pages = PAGES.filter((p) => !term || p.label.toLowerCase().includes(term) || p.hint.toLowerCase().includes(term))
    const logs = (term
      ? listings.filter((l) => `${l.title} ${l.platformLabel} ${l.niche} ${l.id}`.toLowerCase().includes(term))
      : listings.slice(0, 5)
    ).slice(0, 6)
    const tools = (term
      ? BUILD.referenceTools.filter((t) => `${t.name} ${t.category} ${t.whatItIs}`.toLowerCase().includes(term))
      : BUILD.referenceTools.slice(0, 4)
    ).slice(0, 5)
    return { pages: pages.slice(0, 6), logs, tools }
  }, [q, listings])

  const flat = [
    ...results.pages.map((p) => ({ type: 'page', ...p })),
    ...results.logs.map((l) => ({ type: 'log', to: `/logs/${l.id}`, label: l.title, sub: `${l.id} · ${l.platformLabel}`, icon: Boxes })),
    ...results.tools.map((t) => ({ type: 'tool', to: `/tools?focus=${t.slug}`, label: t.name, sub: t.category, icon: Sparkles })),
  ]

  useEffect(() => setIdx(0), [q])

  const go = (item) => {
    if (!item) return
    nav(item.to)
    dispatch(toggleCommand(false))
    setQ('')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[95] flex items-start justify-center p-4 pt-[12vh]">
          <div className="absolute inset-0 bg-ink-950/78 backdrop-blur-md" onClick={() => dispatch(toggleCommand(false))} />
          <motion.div
            initial={{ opacity: 0, y: -18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.985 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl3 glass edge noise"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(flat.length - 1, i + 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)) }
              if (e.key === 'Enter') { e.preventDefault(); go(flat[idx]) }
            }}
          >
            <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
              <Search className="h-4.5 w-4.5 text-volt-300" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search 72 logs, 50 tools, pages and actions…"
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-slate-500"
              />
              <kbd className="rounded-md border border-white/10 bg-ink-900 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-500">esc</kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-3">
              {flat.length === 0 && (
                <div className="px-4 py-10 text-center text-[13px] text-slate-500">
                  Nothing matched “{q}”. Try a platform, a niche or a log id.
                </div>
              )}
              {[
                ['Navigate', results.pages.map((p) => ({ type: 'page', ...p }))],
                ['Logs', results.logs.map((l) => ({ type: 'log', to: `/logs/${l.id}`, label: l.title, sub: `${l.id} · ${l.platformLabel} · ${usd(l.price)}`, icon: Boxes }))],
                ['Reference tools', results.tools.map((t) => ({ type: 'tool', to: `/tools?focus=${t.slug}`, label: t.name, sub: `${t.category} — ${t.whatItIs}`, icon: Sparkles }))],
              ].map(([group, items]) =>
                items.length ? (
                  <div key={group} className="mb-2">
                    <div className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-500">{group}</div>
                    {items.map((item) => {
                      const flatIndex = flat.findIndex((f) => f.label === item.label && f.to === item.to)
                      const active = flatIndex === idx
                      return (
                        <button
                          key={`${group}-${item.to}-${item.label}`}
                          onMouseEnter={() => setIdx(flatIndex)}
                          onClick={() => go(item)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                            active ? 'bg-volt-500/14 ring-1 ring-volt-500/30' : 'hover:bg-white/[0.05]',
                          )}
                        >
                          <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg border', active ? 'border-volt-500/40 bg-volt-500/16 text-volt-300' : 'border-white/8 bg-white/[0.03] text-slate-400')}>
                            <item.icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13.5px] font-medium text-slate-200">{item.label}</span>
                            <span className="block truncate text-[11.5px] text-slate-500">{item.sub || item.hint}</span>
                          </span>
                          {active && <span className="ml-auto font-mono text-[11px] text-slate-500">↵</span>}
                        </button>
                      )
                    })}
                  </div>
                ) : null,
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/8 bg-ink-950/40 px-5 py-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-3">
                <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono">↵</kbd> open</span>
              </span>
              <span className="flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-verify-400" />
                harvest {BUILD.fingerprint}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------------------------------------------------------------- Footer --- */
const FOOTER = [
  {
    title: 'Marketplace',
    links: [
      ['Browse all logs', '/marketplace'],
      ['Social accounts', '/marketplace?category=social'],
      ['Gaming profiles', '/marketplace?category=gaming'],
      ['Streaming seats', '/marketplace?category=streaming'],
      ['Aged SaaS & mail', '/marketplace?category=saas'],
    ],
  },
  {
    title: 'Sell',
    links: [
      ['List a log', '/sell'],
      ['Proof Studio', '/studio'],
      ['Seller academy', '/academy'],
      ['Payout methods', '/dashboard'],
      ['Fee schedule', '/pricing'],
    ],
  },
  {
    title: 'Platform',
    links: [
      ['Ops console', '/admin'],
      ['Build manifest', '/docs'],
      ['Reference tools', '/tools'],
      ['About the merge', '/about'],
      ['Trust & escrow', '/trust'],
    ],
  },
]

export function Footer() {
  return (
    <footer className="relative mt-28 border-t border-white/8 bg-ink-950/60">
      <div className="absolute inset-x-0 -top-px h-px bg-[linear-gradient(90deg,transparent,rgba(124,92,255,.6),rgba(34,211,238,.5),transparent)]" />
      <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2.5">
              <img src={reachmarkMark(40)} alt="" className="h-10 w-10 rounded-xl" />
              <div>
                <div className="text-[15px] font-semibold">Reachmark Logs</div>
                <div className="text-[10.5px] uppercase tracking-[0.22em] text-volt-300/80">Escrow-protected log marketplace</div>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-[13px] leading-relaxed text-slate-400">
              Reachmark Logs verifies ownership, escrows the payment and records every credential change
              before a single handle moves. Built on the merged AccountsBazaar · ui-builder ·
              MoneyPrinterTurbo · claw-code monorepo.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Badge tone="verify" dot>Escrow live</Badge>
              <Badge tone="aqua">{BUILD.totals.sourceFiles.toLocaleString()} files harvested</Badge>
              <Badge tone="volt">{BUILD.totals.referenceTools} tools indexed</Badge>
            </div>
          </div>
          {FOOTER.map((col) => (
            <div key={col.title}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{col.title}</div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map(([label, to]) => (
                  <li key={label}>
                    <Link to={to} className="group inline-flex items-center gap-1.5 text-[13px] text-slate-400 transition hover:text-slate-100">
                      <span className="h-px w-0 bg-aqua-400 transition-all duration-300 group-hover:w-3" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/8 pt-6 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Reachmark Logs. Merged monorepo — MIT licensed components.</span>
          <span className="flex items-center gap-4">
            <Link to="/trust" className="hover:text-slate-300">Trust centre</Link>
            <Link to="/docs" className="hover:text-slate-300">Docs</Link>
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-verify-400" />
              fingerprint {BUILD.fingerprint}
            </span>
          </span>
        </div>
      </div>
    </footer>
  )
}

export function PageTransition({ children }) {
  const loc = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={loc.pathname}
        initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.main>
    </AnimatePresence>
  )
}
