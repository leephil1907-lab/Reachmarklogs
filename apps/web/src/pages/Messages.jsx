import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  AlertTriangle, ArrowLeft, BadgeCheck, Check, CheckCheck, Clock, FileText, Flag,
  Lock, MoreVertical, Paperclip, Search, Send, Shield, ShieldCheck, Sparkles, Star,
  Smile, Timer, Trash2, Zap,
} from 'lucide-react'
import { Badge, Button, Card, Modal, Tabs, ease } from '../components/ui'
import { PlatformGlyph } from '../components/marketplace/ListingCard'
import { avatarArt } from '../data/catalog'
import { cn, formatDate, usd } from '../lib/format'
import { receive, send, setActive, setDraft, settleTyping, guardNotice } from '../app/features/chatSlice'

const REPLIES = [
  'Escrow confirmed on my side — I can do the screen share in 10 minutes if that suits?',
  'The recovery email is already pointed at the Reachmark alias, so the handover should be quick.',
  'Sending the audience export now. Geography is 68% US, 12% UK.',
  'Happy with that price. Open the escrow and I will start the ownership walkthrough.',
  'One thing to note: the 2FA seed rotates monthly, I will include the backup codes in the vault.',
]

export default function Messages() {
  const dispatch = useDispatch()
  const { threads, activeId, draft, typing } = useSelector((s) => s.chat)
  const listings = useSelector((s) => s.catalog.listings)
  const [query, setQuery] = useState('')
  const [safetyOpen, setSafetyOpen] = useState(false)
  const bottomRef = useRef(null)

  const active = threads.find((t) => t.id === activeId)
  const listing = listings.find((l) => l.id === active?.listingId)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return threads
    return threads.filter((t) => {
      const l = listings.find((x) => x.id === t.listingId)
      return `${t.seller.name} ${t.lastMessage} ${l?.title ?? ''}`.toLowerCase().includes(term)
    })
  }, [threads, query, listings])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [active?.messages.length, activeId, typing])

  /* simulated seller reply + guard bot */
  useEffect(() => {
    if (!typing) return
    const t = setTimeout(() => {
      dispatch(receive(REPLIES[Math.floor(Math.random() * REPLIES.length)]))
      const g = setTimeout(
        () => dispatch(guardNotice('Reachmark guard: escrow is the only protected payment path. Never share codes outside the vault.')),
        7000,
      )
      return () => clearTimeout(g)
    }, 1700)
    return () => clearTimeout(t)
  }, [typing, dispatch])

  return (
    <div className="pt-24 sm:pt-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-aqua-500/25 bg-aqua-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-aqua-300">
              <Shield className="h-3 w-3" /> Escrow-guarded threads
            </div>
            <h1 className="text-[2rem] leading-tight sm:text-[2.4rem]">Messages</h1>
            <p className="mt-2.5 max-w-2xl text-[14px] text-slate-400">
              Every thread is monitored by the Reachmark guard. Payment requests made off-platform are recorded
              and flagged for the risk desk — the guard banner in each thread is not decorative.
            </p>
          </div>
          <Button variant="ghost" onClick={() => setSafetyOpen(true)}>
            <ShieldCheck className="h-4 w-4" /> Thread safety rules
          </Button>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[340px_1fr]">
          {/* thread list */}
          <Card className="flex max-h-[74vh] flex-col overflow-hidden" hover={false}>
            <div className="border-b border-white/8 p-3.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search threads…"
                  className="h-10 w-full rounded-xl border border-white/10 bg-ink-900/70 pl-9 pr-3 text-[12.5px] outline-none focus:border-volt-500/60"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map((t, i) => {
                const l = listings.find((x) => x.id === t.listingId)
                const isActive = t.id === activeId
                return (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    onClick={() => dispatch(setActive(t.id))}
                    className={cn(
                      'relative flex w-full items-start gap-3 border-b border-white/6 p-3.5 text-left transition',
                      isActive ? 'bg-volt-500/[0.09]' : 'hover:bg-white/[0.03]',
                    )}
                  >
                    {isActive && <span className="absolute inset-y-0 left-0 w-[2px] bg-[linear-gradient(180deg,#7c5cff,#22d3ee)]" />}
                    <img src={t.seller.avatar ?? avatarArt(t.seller.name, t.seller.name[0])} alt="" className="h-10 w-10 shrink-0 rounded-xl2" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[12.5px] font-semibold text-slate-100">{t.seller.name}</span>
                        {t.seller.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-verify-400" />}
                        <span className="tnum ml-auto shrink-0 text-[10.5px] text-slate-500">
                          {new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-500">{l?.title ?? 'Listing removed'}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="truncate text-[11.5px] text-slate-400">{t.lastMessage}</span>
                        {t.unread > 0 && (
                          <span className="ml-auto shrink-0 rounded-full bg-magenta-500/22 px-1.5 py-0.5 text-[10px] font-semibold text-magenta-400">
                            {t.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                )
              })}
              {!filtered.length && <div className="p-8 text-center text-[12.5px] text-slate-500">No threads match.</div>}
            </div>
          </Card>

          {/* conversation */}
          <Card className="flex max-h-[74vh] flex-col overflow-hidden" hover={false}>
            {active ? (
              <>
                <div className="flex items-center gap-3 border-b border-white/8 p-4">
                  <img src={active.seller.avatar ?? avatarArt(active.seller.name, active.seller.name[0])} alt="" className="h-11 w-11 rounded-xl2" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13.5px] font-semibold text-slate-100">{active.seller.name}</span>
                      {active.seller.verified && <BadgeCheck className="h-4 w-4 text-verify-400" />}
                      <Badge tone="verify" dot className="ml-1">online</Badge>
                    </div>
                    <div className="text-[11.5px] text-slate-500">
                      {active.seller.rating.toFixed(2)} ★ · {active.seller.transfers} transfers · replies in ~{active.seller.responseMins}m
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {listing && (
                      <Link to={`/logs/${listing.id}`} className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11.5px] text-slate-300 transition hover:border-volt-500/40 sm:flex">
                        <PlatformGlyph platform={listing.platform} className="h-3.5 w-3.5" />
                        <span className="tnum">{listing.id}</span>
                        <span className="tnum font-semibold text-aqua-300">{usd(listing.price)}</span>
                      </Link>
                    )}
                    <button className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:text-slate-200">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* guard banner */}
                <div className="flex items-start gap-3 border-b border-warn-400/20 bg-warn-400/[0.06] px-4 py-3">
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn-400" />
                  <p className="text-[11.5px] leading-relaxed text-slate-300">
                    Keep everything inside escrow. Reachmark never asks for your password, and payment links sent
                    in-thread are auto-scanned.
                  </p>
                </div>

                {/* messages */}
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {active.messages.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.35, delay: Math.min(i * 0.02, 0.2), ease }}
                      className={cn('flex gap-2.5', m.sender === 'buyer' && 'flex-row-reverse')}
                    >
                      {m.sender !== 'guard' && (
                        <img
                          src={m.sender === 'buyer' ? avatarArt('You', 'Y') : active.seller.avatar ?? avatarArt(active.seller.name, active.seller.name[0])}
                          alt=""
                          className="mt-1 h-7 w-7 shrink-0 rounded-lg"
                        />
                      )}
                      <div className={cn('max-w-[76%]', m.sender === 'guard' && 'mx-auto max-w-[92%]')}>
                        {m.sender === 'guard' ? (
                          <div className="flex items-start gap-2.5 rounded-xl2 border border-aqua-500/25 bg-aqua-500/[0.07] px-3.5 py-2.5">
                            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-aqua-300" />
                            <p className="text-[11.5px] leading-relaxed text-slate-300">{m.body}</p>
                          </div>
                        ) : (
                          <>
                            <div
                              className={cn(
                                'rounded-xl2 px-3.5 py-2.5 text-[13px] leading-relaxed',
                                m.sender === 'buyer'
                                  ? 'bg-[linear-gradient(120deg,rgba(124,92,255,.9),rgba(34,211,238,.72))] text-ink-950'
                                  : 'border border-white/8 bg-white/[0.04] text-slate-200',
                              )}
                            >
                              {m.body}
                            </div>
                            <div className={cn('mt-1 flex items-center gap-1.5 text-[10.5px] text-slate-500', m.sender === 'buyer' && 'justify-end')}>
                              {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {m.sender === 'buyer' && <CheckCheck className="h-3 w-3 text-aqua-400" />}
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  <AnimatePresence>
                    {typing && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5">
                        <img src={active.seller.avatar ?? avatarArt(active.seller.name, active.seller.name[0])} alt="" className="h-7 w-7 rounded-lg" />
                        <div className="flex items-center gap-1 rounded-xl2 border border-white/8 bg-white/[0.04] px-3.5 py-3">
                          {[0, 1, 2].map((d) => (
                            <motion.span
                              key={d}
                              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1, repeat: Infinity, delay: d * 0.16 }}
                              className="h-1.5 w-1.5 rounded-full bg-slate-400"
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-500">{active.seller.name} is typing…</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div ref={bottomRef} />
                </div>

                {/* composer */}
                <form
                  className="border-t border-white/8 p-3.5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!draft.trim()) return
                    dispatch(send())
                  }}
                >
                  <div className="flex items-end gap-2">
                    <div className="flex-1 rounded-xl2 border border-white/10 bg-ink-900/70 p-2 transition focus-within:border-volt-500/60">
                      <textarea
                        value={draft}
                        onChange={(e) => dispatch(setDraft(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            if (draft.trim()) dispatch(send())
                          }
                        }}
                        rows={1}
                        placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
                        className="max-h-32 w-full resize-none bg-transparent px-1.5 py-1 text-[13px] outline-none placeholder:text-slate-500"
                      />
                      <div className="flex items-center gap-1 px-1 pt-1">
                        {[Paperclip, Smile, FileText].map((Icon, i) => (
                          <button key={i} type="button" className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-slate-300">
                            <Icon className="h-3.5 w-3.5" />
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => toast.success('Quick offer sent: −8% with 48h escrow release')}
                          className="ml-auto rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-volt-500/40"
                        >
                          Quick offer
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="h-11 w-11 px-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> end-to-end stored</span>
                    <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" /> avg. reply {active.seller.responseMins}m</span>
                    <button
                      type="button"
                      onClick={() => toast.error('Thread reported — the risk desk will review within 2 hours')}
                      className="ml-auto inline-flex items-center gap-1 text-danger-400 transition hover:text-danger-300"
                    >
                      <Flag className="h-3 w-3" /> Report thread
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="grid h-full place-items-center p-10 text-center">
                <div>
                  <Sparkles className="mx-auto h-8 w-8 text-slate-600" />
                  <p className="mt-4 text-[14px] text-slate-300">Select a thread to start talking</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* mobile back link */}
        <Link to="/dashboard" className="mt-6 inline-flex items-center gap-2 text-[12.5px] text-slate-400 hover:text-slate-200 lg:hidden">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
      </div>

      <Modal
        open={safetyOpen}
        onClose={() => setSafetyOpen(false)}
        subtitle="Trust & safety"
        title="Thread safety rules"
        footer={<Button onClick={() => setSafetyOpen(false)}>Got it</Button>}
      >
        <div className="space-y-4">
          {[
            { icon: Lock, title: 'Escrow only', body: 'Reachmark never releases funds outside escrow. Any request to pay direct is a red flag — report it.' },
            { icon: Shield, title: 'No credentials in chat', body: 'Passwords, 2FA seeds and backup codes belong in the credential vault, never in a message thread.' },
            { icon: Flag, title: 'Auto-scanning', body: 'Payment links, wallet addresses and off-platform invites are scanned automatically and flagged for ops.' },
            { icon: Clock, title: 'Dispute window', body: 'Raise a dispute within the escrow window. The credential chain is the evidence of record.' },
          ].map((r) => (
            <div key={r.title} className="flex items-start gap-3 rounded-xl2 border border-white/8 bg-white/[0.02] p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-volt-500/25 bg-volt-500/12 text-volt-300">
                <r.icon className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[13px] font-semibold text-slate-100">{r.title}</div>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{r.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
