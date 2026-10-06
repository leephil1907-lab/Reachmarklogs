import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  AlertCircle, ArrowRight, BadgeCheck, Check, CheckCircle2, Eye, EyeOff, Fingerprint,
  KeyRound, Loader2, Lock, Mail, MailCheck, ShieldCheck, Sparkles, User, X,
} from 'lucide-react'
import { Badge, Button, Card, Field, Input, Progress, Select, Tabs, ease } from '../components/ui'
import { reachmarkMark } from '../data/catalog'
import { cn } from '../lib/format'
import { auth as authApi, sessionToken, apiMode, isLive } from '../lib/api'
import { bootstrapSession, signIn, signUp, selectAuth } from '../app/features/authSlice'

/**
 * Auth — sign in, create an account, reset a password, verify an email.
 *
 * Replaces the demo screen the merge shipped, which accepted any input and
 * dispatched a hard-coded persona. Everything here talks to the real API:
 * password policy is enforced server-side and the problem is *shown*, failed
 * sign-ins report how many attempts remain, and a lockout says when to come
 * back rather than silently doing nothing.
 *
 * Routes handled here:
 *   /auth            sign in or create an account
 *   /auth/reset      choose a new password (token in the query string)
 *   /auth/verify     confirm an email address
 */
export default function Auth() {
  const nav = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const authState = useSelector(selectAuth)
  const [params] = useSearchParams()

  const route = location.pathname.replace(/\/$/, '')
  if (route.endsWith('/reset')) return <ResetPassword token={params.get('token')} />
  if (route.endsWith('/verify')) return <VerifyEmail token={params.get('token')} />

  return <SignInOrUp onDone={() => nav('/dashboard', { replace: true })} state={authState} dispatch={dispatch} />
}

/* --------------------------------------------------------------- shared ---- */

const PasswordInput = ({ value, onChange, placeholder = '••••••••••', autoComplete = 'current-password', ...rest }) => {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="pr-11"
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

/** Live password meter. Length dominates, character classes nudge. */
function strength(pw = '') {
  let score = 0
  if (pw.length >= 10) score += 2
  if (pw.length >= 14) score += 1
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1
  if (/\d/.test(pw)) score += 1
  if (/[^A-Za-z0-9]/.test(pw)) score += 1
  const label = ['too short', 'weak', 'fair', 'good', 'strong', 'excellent'][Math.min(score, 5)]
  const tone = score <= 1 ? 'danger' : score <= 3 ? 'warn' : 'verify'
  return { score, label, tone, pct: (score / 5) * 100 }
}

const ErrorNote = ({ message, problems }) => {
  if (!message) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 rounded-xl2 border border-danger-500/35 bg-danger-500/10 p-3.5"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-400" />
      <div className="min-w-0">
        <div className="text-[12.5px] text-danger-200">{message}</div>
        {problems?.length > 1 && (
          <ul className="mt-1.5 space-y-0.5">
            {problems.slice(1).map((p) => (
              <li key={p} className="text-[11.5px] text-danger-200/75">— {p}</li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  )
}

const SidePanel = () => (
  <div className="lg:pt-8">
    <Badge tone="verify" dot>escrow-protected marketplace</Badge>
    <h1 className="mt-5 text-[2.3rem] leading-tight sm:text-[2.9rem]">
      Trade logs with <span className="gradient-text">people, not screenshots</span>
    </h1>
    <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-slate-400">
      Every listing on Reachmark carries a hashed proof set and a signed credential chain. Funds sit in escrow
      until you have confirmed the handover yourself.
    </p>

    <div className="mt-8 space-y-3">
      {[
        [ShieldCheck, 'Escrow protection on every transfer'],
        [Fingerprint, 'Ownership tests recorded and hashed'],
        [KeyRound, 'Credential chain audited before release'],
        [Sparkles, 'Proof Studio reels to move inventory faster'],
      ].map(([Icon, label], i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.07, duration: 0.5, ease }}
          className="flex items-center gap-3 text-[13.5px] text-slate-300"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-verify-500/25 bg-verify-500/10 text-verify-400">
            <Icon className="h-4 w-4" />
          </span>
          {label}
        </motion.div>
      ))}
    </div>

    {isLive && (
      <div className="mt-9 rounded-xl2 border border-aqua-500/25 bg-aqua-500/[0.06] p-4">
        <div className="text-[12px] font-medium text-aqua-200">Seeded accounts</div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">
          The database ships with three verified accounts so you can see both sides of a trade. Password for all
          three: <span className="font-mono text-slate-300">reachmark-demo-2026</span>
        </p>
        <div className="mt-3 grid gap-1.5 text-[11.5px]">
          {[
            ['Seller', 'ada@reachmarklogs.test'],
            ['Buyer', 'ada.buyer@reachmarklogs.test'],
            ['Ops desk', 'ops@reachmarklogs.test'],
          ].map(([label, email]) => (
            <button
              key={email}
              type="button"
              onClick={() => navigator.clipboard?.writeText(email).then(() => toast.success(`Copied ${label.toLowerCase()} email`))}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5 text-left transition hover:border-aqua-500/40"
            >
              <span className="text-slate-400">{label}</span>
              <span className="truncate font-mono text-[10.5px] text-slate-300">{email}</span>
            </button>
          ))}
        </div>
      </div>
    )}
    {!isLive && (
      <div className="mt-9 rounded-xl2 border border-white/8 bg-white/[0.02] p-4">
        <div className="text-[12px] font-medium text-slate-200">You are in local mode</div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">
          The catalog and copilot run from the seeded fixtures in the browser, so there is no account to create.
          Set <span className="font-mono text-aqua-300">VITE_API_MODE=live</span> to use real accounts against
          the API.
        </p>
      </div>
    )}
  </div>
)

/* ------------------------------------------------------- sign in / sign up -- */

function SignInOrUp({ onDone, state, dispatch }) {
  const [mode, setMode] = useState('signin')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [forgot, setForgot] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'buyer', acceptTerms: false, remember: true })
  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setError(null) }

  const meter = useMemo(() => strength(form.password), [form.password])

  const submit = async (e) => {
    e.preventDefault()
    setError(null)

    if (forgot) {
      setBusy(true)
      try {
        const res = await authApi.forgotPassword(form.email.trim())
        toast.success(res?.message ?? 'Check your inbox for the reset link')
        if (res?.devUrl) toast.success('No mail server configured — link logged to the API console')
        setForgot(false)
      } catch (err) {
        setError(err.message)
      } finally {
        setBusy(false)
      }
      return
    }

    if (!form.email.includes('@')) return setError('Enter a valid email address.')
    if (mode === 'signup' && form.password.length < 10) {
      return setError('Use at least 10 characters — length beats punctuation.')
    }

    setBusy(true)
    try {
      if (mode === 'signin') {
        const user = await dispatch(signIn({ email: form.email.trim(), password: form.password, remember: form.remember })).unwrap()
        toast.success(`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`)
      } else {
        const user = await dispatch(signUp({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          acceptTerms: form.acceptTerms,
        })).unwrap()
        toast.success(`Account created${user?.name ? ` — welcome, ${user.name.split(' ')[0]}` : ''}`)
        if (isLive) toast('Check your email to confirm the address before selling', { icon: '✉️' })
      }
      onDone()
    } catch (err) {
      setError(err?.message ?? 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative pt-24 sm:pt-28">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <SidePanel />

        <div>
          <Card className="p-7" hover={false}>
            {!forgot && (
              <Tabs
                tabs={[
                  { id: 'signin', label: 'Sign in' },
                  { id: 'signup', label: 'Create account' },
                ]}
                value={mode}
                onChange={(v) => { setMode(v); setError(null) }}
              />
            )}
            {forgot && (
              <button onClick={() => { setForgot(false); setError(null) }} className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 transition hover:text-slate-200">
                <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back to sign in
              </button>
            )}

            <div className="mt-6">
              <h2 className="text-[19px] font-semibold text-slate-100">
                {forgot ? 'Reset your password' : mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="mt-1 text-[12.5px] text-slate-500">
                {forgot
                  ? 'We will email a single-use link that expires in an hour.'
                  : mode === 'signin'
                    ? 'Sign in to manage listings, escrow and payouts.'
                    : 'Buying, selling or both — you can change this later.'}
              </p>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <AnimatePresence mode="wait">
                {mode === 'signup' && !forgot && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease }}
                    className="overflow-hidden"
                  >
                    <Field label="Full name" required>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                          value={form.name}
                          onChange={(e) => set({ name: e.target.value })}
                          placeholder="Ada Okonjo"
                          autoComplete="name"
                          className="pl-10"
                          required
                        />
                      </div>
                    </Field>
                  </motion.div>
                )}
              </AnimatePresence>

              <Field label="Email" required>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set({ email: e.target.value })}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="pl-10"
                    required
                  />
                </div>
              </Field>

              {!forgot && (
                <Field
                  label="Password"
                  required
                  hint={mode === 'signup' ? 'At least 10 characters. A passphrase beats a jumble of symbols.' : undefined}
                >
                  <PasswordInput
                    value={form.password}
                    onChange={(e) => set({ password: e.target.value })}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                  />
                </Field>
              )}

              {mode === 'signup' && !forgot && form.password.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
                  <Progress value={meter.pct} tone={meter.tone} />
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Password strength</span>
                    <span className={cn(
                      meter.tone === 'danger' ? 'text-danger-400' : meter.tone === 'warn' ? 'text-warn-400' : 'text-verify-400',
                    )}>{meter.label}</span>
                  </div>
                </motion.div>
              )}

              {mode === 'signup' && !forgot && (
                <>
                  <Field label="I am here to">
                    <Select value={form.role} onChange={(e) => set({ role: e.target.value })}>
                      <option value="buyer">Buy logs — browse and buy safely</option>
                      <option value="seller">Sell logs — list and get paid</option>
                    </Select>
                  </Field>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl2 border border-white/8 bg-white/[0.02] p-3.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={form.acceptTerms}
                      onClick={() => set({ acceptTerms: !form.acceptTerms })}
                      className={cn(
                        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition',
                        form.acceptTerms ? 'border-verify-500/50 bg-verify-500/20 text-verify-400' : 'border-white/15 text-transparent',
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[12px] leading-relaxed text-slate-400">
                      I accept the escrow terms, the 7-day transfer warranty and the rule that payment never leaves
                      Reachmark. I understand selling platform accounts may breach the platform's own terms.
                    </span>
                  </label>
                </>
              )}

              {mode === 'signin' && !forgot && (
                <label className="flex cursor-pointer items-center gap-2.5 text-[12px] text-slate-400">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={form.remember}
                    onClick={() => set({ remember: !form.remember })}
                    className={cn(
                      'grid h-4.5 w-4.5 place-items-center rounded border transition',
                      form.remember ? 'border-verify-500/50 bg-verify-500/20 text-verify-400' : 'border-white/15 text-transparent',
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  Keep me signed in on this device
                </label>
              )}

              <ErrorNote message={error} />

              <Button type="submit" className="w-full" loading={busy} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {forgot ? 'Sending…' : mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                  </>
                ) : (
                  <>
                    {forgot ? 'Email me a reset link' : mode === 'signin' ? 'Sign in' : 'Create account'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {state?.lastError && !error && <ErrorNote message={state.lastError} />}
            </form>

            {mode === 'signin' && !forgot && (
              <button
                onClick={() => { setForgot(true); setError(null) }}
                className="mt-5 w-full text-center text-[12px] text-slate-500 transition hover:text-slate-300"
              >
                Forgot your password?
              </button>
            )}

            {mode === 'signup' && (
              <p className="mt-5 text-center text-[11.5px] leading-relaxed text-slate-500">
                By creating an account you agree to the escrow protocol, the warranty terms and the payout schedule.
              </p>
            )}
          </Card>

          <div className="mt-4 flex items-center justify-center gap-2 text-[11.5px] text-slate-500">
            <Lock className="h-3.5 w-3.5" />
            {apiMode === 'live'
              ? 'Passwords are scrypt-hashed. Sessions are revocable per device.'
              : 'Local mode — no credentials are stored or checked.'}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ reset -- */

function ResetPassword({ token }) {
  const nav = useNavigate()
  const dispatch = useDispatch()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const meter = useMemo(() => strength(password), [password])

  const submit = async (e) => {
    e.preventDefault()
    if (password !== confirm) return setError('Those two passwords do not match.')
    if (password.length < 10) return setError('Use at least 10 characters.')
    setBusy(true)
    setError(null)
    try {
      const res = await authApi.resetPassword(token, password)
      if (res?.token) {
        sessionToken.set(res.token)
        await dispatch(bootstrapSession())
      }
      setDone(true)
      toast.success('Password updated')
      setTimeout(() => nav('/dashboard', { replace: true }), 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative pt-24 sm:pt-28">
      <div className="mx-auto max-w-lg px-4 sm:px-6">
        <Card className="p-7" hover={false}>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-volt-500/35 bg-volt-500/12 text-volt-200">
              <KeyRound className="h-4.5 w-4.5" />
            </span>
            <div>
              <h1 className="text-[18px] font-semibold text-slate-100">Choose a new password</h1>
              <p className="text-[12px] text-slate-500">Every other device will be signed out.</p>
            </div>
          </div>

          {!token && (
            <div className="mt-6 rounded-xl2 border border-warn-400/30 bg-warn-400/10 p-3.5 text-[12.5px] text-warn-400">
              This link is missing its token. Request a new reset email from the sign-in page.
            </div>
          )}

          {done ? (
            <div className="mt-6 flex items-center gap-3 rounded-xl2 border border-verify-500/30 bg-verify-500/10 p-4">
              <CheckCircle2 className="h-5 w-5 text-verify-400" />
              <span className="text-[13px] text-verify-400">Password updated. Taking you to your dashboard…</span>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field label="New password" required>
                <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
              </Field>
              <Progress value={meter.pct} tone={meter.tone} />
              <Field label="Confirm new password" required>
                <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
              </Field>
              <ErrorNote message={error} />
              <Button type="submit" className="w-full" loading={busy} disabled={busy || !token}>
                Set new password
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- verify -- */

function VerifyEmail({ token }) {
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'working', message: 'Confirming your email…' })

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setState({ status: 'error', message: 'This link is missing its token.' })
      return () => { cancelled = true }
    }
    authApi
      .verifyEmail(token)
      .then((res) => {
        if (cancelled) return
        setState({ status: 'done', message: res?.message ?? 'Email confirmed.' })
        toast.success('Your email is confirmed')
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', message: err.message })
      })
    return () => { cancelled = true }
  }, [token])

  return (
    <div className="relative pt-24 sm:pt-28">
      <div className="mx-auto max-w-md px-4 sm:px-6">
        <Card className="p-7 text-center" hover={false}>
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease }}
            className={cn(
              'mx-auto grid h-14 w-14 place-items-center rounded-2xl border',
              state.status === 'done'
                ? 'border-verify-500/35 bg-verify-500/12 text-verify-400'
                : state.status === 'error'
                  ? 'border-danger-500/35 bg-danger-500/12 text-danger-400'
                  : 'border-white/10 bg-white/[0.03] text-slate-300',
            )}
          >
            {state.status === 'done' ? <MailCheck className="h-6 w-6" /> : state.status === 'error' ? <X className="h-6 w-6" /> : <Loader2 className="h-6 w-6 animate-spin" />}
          </motion.div>
          <h1 className="mt-4 text-[17px] font-semibold text-slate-100">
            {state.status === 'done' ? 'Email confirmed' : state.status === 'error' ? 'We could not confirm that link' : 'Confirming…'}
          </h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">{state.message}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant={state.status === 'done' ? 'primary' : 'ghost'} onClick={() => navigate('/dashboard')}>
              {state.status === 'done' ? 'Go to dashboard' : 'Back to dashboard'}
            </Button>
            {state.status === 'error' && (
              <Button variant="ghost" onClick={() => navigate('/auth')}>Sign in again</Button>
            )}
          </div>
          <img src={reachmarkMark(36)} alt="" className="mx-auto mt-7 h-9 w-9 rounded-lg opacity-60" />
        </Card>
      </div>
    </div>
  )
}
