import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  AlertTriangle, ArrowRight, Check, CheckCircle2, Clock, KeyRound, Laptop, Loader2, LogOut,
  Mail, MailCheck, MapPin, Monitor, Shield, ShieldCheck, Smartphone, User, UserX,
} from 'lucide-react'
import { Badge, Button, Card, Field, Input, Modal, Progress, Reveal, SectionHead, Select, Tabs, ease } from '../components/ui'
import { cn, formatDate } from '../lib/format'
import { auth as authApi, apiMode, isLive } from '../lib/api'
import { useDispatch as useAppDispatch } from 'react-redux'
import {
  changePassword, deactivateAccount, selectAuth, selectUser, updateProfile,
} from '../app/features/authSlice'

/**
 * Account — the page that makes an account feel real.
 *
 * Four things a marketplace account must be able to do, all of them here:
 * change your public identity, change your password, see and end the sessions
 * that are signed in as you, and leave. The session list is the one that earns
 * trust: it is the only way a user can tell that a stolen token was used, and
 * the only way they can do something about it.
 */
export default function Account() {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const { status, demo } = useSelector(selectAuth)
  const nav = useNavigate()
  const [tab, setTab] = useState('profile')

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-32 sm:px-6">
        <div className="h-40 animate-pulse rounded-xl3 bg-white/[0.04]" />
      </div>
    )
  }

  if (!user?.id) {
    return (
      <div className="mx-auto max-w-md px-4 pt-32 text-center sm:px-6">
        <Card className="p-8" hover={false}>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-300">
            <User className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-[18px] font-semibold text-slate-100">Sign in to manage your account</h1>
          <p className="mt-2 text-[12.5px] text-slate-500">
            Your profile, password and signed-in devices live here.
          </p>
          <Button className="mt-6" onClick={() => nav('/auth')}>
            Sign in <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-28 sm:px-6 lg:px-8">
      <SectionHead
        kicker="Account"
        title="Your account & security"
        sub={isLive ? 'Everything here is stored server-side. Nothing in this page can be faked from the browser.' : 'Local mode — changes are held in memory and reset on reload.'}
      />

      {demo && (
        <div className="mt-6 rounded-xl2 border border-volt-500/25 bg-volt-500/[0.07] p-4 text-[12.5px] text-volt-200">
          You are signed into the <strong>local fixture persona</strong>. Set{' '}
          <span className="font-mono">VITE_API_MODE=live</span> to create a real account with a password.
        </div>
      )}

      <div className="mt-7">
        <Tabs
          tabs={[
            { id: 'profile', label: 'Profile' },
            { id: 'security', label: 'Password' },
            { id: 'sessions', label: 'Devices' },
            { id: 'danger', label: 'Close account' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
              transition={{ duration: 0.35, ease }}
            >
              {tab === 'profile' && <ProfilePanel user={user} dispatch={dispatch} />}
              {tab === 'security' && <PasswordPanel dispatch={dispatch} />}
              {tab === 'sessions' && <SessionsPanel />}
              {tab === 'danger' && <DangerPanel dispatch={dispatch} nav={nav} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="space-y-4">
          <Card className="p-5" hover={false}>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl2 bg-[linear-gradient(120deg,#9a86ff,#38d9f0)] text-[15px] font-bold text-ink-950">
                {user.initials || user.name?.split(' ').map((w) => w[0]).join('') || 'R'}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-slate-100">{user.name}</div>
                <div className="truncate text-[11.5px] text-slate-500">{user.email}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge tone={user.role === 'admin' ? 'magenta' : user.role === 'seller' ? 'volt' : 'aqua'} dot>
                {user.role}
              </Badge>
              <Badge tone={user.plan === 'free' ? 'neutral' : 'verify'}>{user.plan} plan</Badge>
              {user.emailVerified
                ? <Badge tone="verify"><MailCheck className="h-3 w-3" /> verified</Badge>
                : <Badge tone="warn"><Mail className="h-3 w-3" /> unverified</Badge>}
            </div>
            <dl className="mt-5 space-y-2 text-[12px]">
              {[
                ['Member since', user.joined ? formatDate(user.joined) : '—'],
                ['Country', user.country || '—'],
                ['Handle', user.handle || 'not set'],
                ['Last sign-in', user.lastLoginAt ? formatDate(user.lastLoginAt) : 'this session'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="truncate text-right text-slate-300">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {!user.emailVerified && (
            <Card className="border-warn-400/30 bg-warn-400/[0.05] p-5" hover={false}>
              <div className="flex items-center gap-2 text-[13px] font-semibold text-warn-400">
                <AlertTriangle className="h-4 w-4" /> Confirm your email
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
                Selling and payouts stay locked until the address is confirmed.
              </p>
              <ResendVerification />
            </Card>
          )}

          <Card className="p-5" hover={false}>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
              <ShieldCheck className="h-4 w-4 text-verify-400" /> How this is protected
            </div>
            <ul className="mt-3 space-y-2 text-[11.5px] leading-relaxed text-slate-400">
              {[
                'Passwords are scrypt-hashed with a per-user salt — never stored, never recoverable.',
                'Session tokens are hashed at rest, so a database dump cannot be replayed.',
                'A password change signs out every other device immediately.',
                'Failed sign-ins lock the account temporarily, and the counter survives restarts.',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-verify-400" />
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- profile --- */

function ProfilePanel({ user, dispatch }) {
  const [form, setForm] = useState({ name: user.name ?? '', handle: user.handle?.replace(/^@/, '') ?? '', bio: user.bio ?? '', country: user.country ?? '' })
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const dirty = form.name !== (user.name ?? '') || form.handle !== (user.handle?.replace(/^@/, '') ?? '') || form.bio !== (user.bio ?? '') || form.country !== (user.country ?? '')

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await dispatch(updateProfile(form)).unwrap()
      setSaved(true)
      toast.success('Profile saved')
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      toast.error(err?.message ?? 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-6" hover={false}>
      <form onSubmit={save} className="space-y-5">
        <Field label="Display name" required>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Handle" hint="Shown on your listings instead of your email. 3–24 characters.">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">@</span>
            <Input
              value={form.handle}
              onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value.replace(/[^a-z0-9_.]/gi, '').toLowerCase() }))}
              placeholder="ada.reach"
              className="pl-8"
            />
          </div>
        </Field>
        <Field label="Country" hint="Buyers filter by seller region.">
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} placeholder="Nigeria" className="pl-10" />
          </div>
        </Field>
        <Field label="About you" hint={`${form.bio.length}/280 — visible on your seller card.`}>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value.slice(0, 280) }))}
            rows={4}
            className="w-full resize-none rounded-xl2 border border-white/10 bg-white/[0.03] px-3.5 py-3 text-[13px] text-slate-200 outline-none transition focus:border-volt-500/45"
            placeholder="What you trade, how you verify, how fast you hand over."
          />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" loading={busy} disabled={busy || !dirty}>
            {saved ? <><Check className="h-4 w-4" /> Saved</> : 'Save changes'}
          </Button>
          {!dirty && <span className="text-[11.5px] text-slate-500">No changes yet</span>}
        </div>
      </form>
    </Card>
  )
}

/* -------------------------------------------------------------- password --- */

function PasswordPanel({ dispatch }) {
  const [form, setForm] = useState({ currentPassword: '', password: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (form.password !== form.confirm) return setError('Those two passwords do not match.')
    if (form.password.length < 10) return setError('Use at least 10 characters.')
    setBusy(true)
    try {
      const res = await dispatch(changePassword({ currentPassword: form.currentPassword, password: form.password })).unwrap()
      toast.success(`Password updated${res?.revokedOtherSessions ? ` — ${res.revokedOtherSessions} other device${res.revokedOtherSessions === 1 ? '' : 's'} signed out` : ''}`)
      setForm({ currentPassword: '', password: '', confirm: '' })
    } catch (err) {
      setError(err?.message ?? 'Could not change the password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-6" hover={false}>
      <div className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-200">
        <KeyRound className="h-4 w-4 text-volt-300" /> Change password
      </div>
      <p className="mt-1 text-[12px] text-slate-500">
        This device stays signed in. Every other device is signed out the moment you save.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label="Current password" required>
          <Input type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} required />
        </Field>
        <Field label="New password" required>
          <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
        </Field>
        <Field label="Confirm new password" required>
          <Input type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} required />
        </Field>
        {error && (
          <div className="rounded-xl2 border border-danger-500/35 bg-danger-500/10 p-3 text-[12.5px] text-danger-200">{error}</div>
        )}
        <Button type="submit" loading={busy} disabled={busy}>Update password</Button>
      </form>
    </Card>
  )
}

/* -------------------------------------------------------------- sessions --- */

const deviceIcon = (ua = '') => {
  const s = ua.toLowerCase()
  if (/iphone|android|mobile/.test(s)) return Smartphone
  if (/ipad|tablet/.test(s)) return Monitor
  return Laptop
}

const describeUA = (ua = '') => {
  if (!ua) return 'Unknown device'
  const s = ua
  if (/edg\//i.test(s)) return 'Edge'
  if (/chrome\//i.test(s) && !/edg|opr/i.test(s)) return 'Chrome'
  if (/safari\//i.test(s) && !/chrome/i.test(s)) return 'Safari'
  if (/firefox\//i.test(s)) return 'Firefox'
  if (/node|curl|python|axios/i.test(s)) return 'API client'
  return 'Browser'
}

const timeAgoShort = (iso) => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

function SessionsPanel() {
  const [state, setState] = useState({ loading: true, items: [], error: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }))
    try {
      const res = await authApi.sessions()
      setState({ loading: false, items: res?.items ?? [], error: null })
    } catch (err) {
      setState({ loading: false, items: [], error: err.message })
    }
  }, [])

  useEffect(() => { load() }, [load])

  const revoke = async (id) => {
    try {
      await authApi.revokeSession(id)
      toast.success('Device signed out')
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const revokeOthers = async () => {
    try {
      const res = await authApi.revokeOthers()
      toast.success(`${res?.revoked ?? 0} other session${res?.revoked === 1 ? '' : 's'} signed out`)
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <Card className="p-6" hover={false}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-200">
            <Shield className="h-4 w-4 text-aqua-300" /> Signed-in devices
          </div>
          <p className="mt-1 text-[12px] text-slate-500">
            Sessions are server-side. Ending one takes effect on the next request from that device.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={revokeOthers} disabled={state.items.length < 2}>
          <LogOut className="h-3.5 w-3.5" /> Sign out others
        </Button>
      </div>

      <div className="mt-5 space-y-2.5">
        {state.loading && [0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl2 bg-white/[0.04]" />)}

        {!state.loading && state.error && (
          <div className="rounded-xl2 border border-danger-500/30 bg-danger-500/10 p-3.5 text-[12.5px] text-danger-200">
            {state.error}
          </div>
        )}

        {!state.loading && !state.error && state.items.length === 0 && (
          <p className="text-[12.5px] text-slate-500">
            {isLive ? 'No active sessions found.' : 'Local mode keeps no session records.'}
          </p>
        )}

        {state.items.map((s) => {
          const Icon = deviceIcon(s.userAgent)
          return (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex items-center gap-3.5 rounded-xl2 border p-3.5',
                s.current ? 'border-verify-500/30 bg-verify-500/[0.06]' : 'border-white/8 bg-white/[0.02]',
              )}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[12.5px] font-medium text-slate-200">{describeUA(s.userAgent)}</span>
                  {s.current && <Badge tone="verify">this device</Badge>}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                  <Clock className="h-3 w-3" /> {timeAgoShort(s.lastSeen)}
                  {s.ip && <span className="font-mono">{s.ip}</span>}
                </div>
              </div>
              {!s.current && (
                <button
                  onClick={() => revoke(s.id)}
                  className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11.5px] text-slate-400 transition hover:border-danger-500/40 hover:text-danger-400"
                >
                  End
                </button>
              )}
            </motion.div>
          )
        })}
      </div>
    </Card>
  )
}

/* ---------------------------------------------------------------- danger --- */

function DangerPanel({ dispatch, nav }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const close = async () => {
    setBusy(true)
    try {
      await dispatch(deactivateAccount()).unwrap()
      toast.success('Account deactivated')
      setOpen(false)
      nav('/')
    } catch (err) {
      toast.error(err?.message ?? 'Could not deactivate')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="border-danger-500/25 p-6" hover={false}>
      <div className="flex items-center gap-2 text-[13.5px] font-semibold text-danger-300">
        <UserX className="h-4 w-4" /> Close your account
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">
        Deactivating signs you out everywhere and hides your listings. It is reversible: sign in again with the same
        email and password to restore the account. Open escrow contracts are unaffected and must be settled first.
      </p>
      <Button variant="danger" className="mt-5" onClick={() => setOpen(true)}>
        Deactivate my account
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Deactivate account?"
        subtitle="Reversible — sign in again to restore it"
        width="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Keep my account</Button>
            <Button variant="danger" onClick={close} loading={busy} disabled={busy}>
              Yes, deactivate
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-slate-400">
          You will be signed out of every device. Your listings are hidden from the floor but kept, and any escrow
          you have open continues to be handled by the ops desk.
        </p>
      </Modal>
    </Card>
  )
}

/* ------------------------------------------------------------ resend CLI --- */

function ResendVerification() {
  const [state, setState] = useState({ busy: false, sent: false })
  const send = async () => {
    setState({ busy: true, sent: false })
    try {
      const res = await authApi.resendVerification()
      setState({ busy: false, sent: true })
      toast.success('Confirmation email sent')
      if (res?.devUrl) toast('No mail server — the link is in the API console', { icon: '✉️' })
    } catch (err) {
      setState({ busy: false, sent: false })
      toast.error(err.message)
    }
  }
  return (
    <Button variant="ghost" size="sm" className="mt-3" onClick={send} loading={state.busy} disabled={state.busy}>
      {state.sent ? <><CheckCircle2 className="h-3.5 w-3.5" /> Sent</> : 'Resend confirmation email'}
    </Button>
  )
}
