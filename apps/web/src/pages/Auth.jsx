import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import {
  ArrowRight, BadgeCheck, Building2, Check, Fingerprint, Github, KeyRound, Lock, Mail,
  ShieldCheck, Sparkles, User, Zap,
} from 'lucide-react'
import { Badge, Button, Card, Field, Input, Progress, Tabs, ease } from '../components/ui'
import { reachmarkMark } from '../data/catalog'
import { cn } from '../lib/format'
import { signIn, setRole } from '../app/features/authSlice'

export default function Auth() {
  const dispatch = useDispatch()
  const nav = useNavigate()
  const [mode, setMode] = useState('signin')
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'seller' })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const submit = (e) => {
    e?.preventDefault()
    if (mode === 'signin') {
      setBusy(true)
      setTimeout(() => {
        dispatch(signIn({ name: form.name || undefined }))
        dispatch(setRole(form.role))
        setBusy(false)
        toast.success('Signed in — demo session, no card, no email sent')
        nav('/dashboard')
      }, 900)
      return
    }
    if (step === 0) {
      if (!form.email.includes('@')) return toast.error('Enter a valid email')
      return setStep(1)
    }
    if (step === 1) {
      if (form.password.length < 8) return toast.error('Use at least 8 characters')
      return setStep(2)
    }
    setBusy(true)
    setTimeout(() => {
      dispatch(signIn({ name: form.name || 'Ada Okonjo', email: form.email }))
      dispatch(setRole(form.role))
      setBusy(false)
      toast.success('Account created in demo mode')
      nav('/dashboard')
    }, 1100)
  }

  return (
    <div className="relative pt-24 sm:pt-28">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        {/* ------------------------------------------------------------ pitch */}
        <div className="lg:pt-8">
          <Badge tone="verify" dot>escrow-protected marketplace</Badge>
          <h1 className="mt-5 text-[2.3rem] leading-tight sm:text-[2.9rem]">
            Sign in to <span className="gradient-text">Reachmark Logs</span>
          </h1>
          <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-slate-400">
            This build runs local-first: the session below is a demo identity with a seeded catalog, chat threads
            and an ops queue. In production the same screen is backed by Clerk with the AccountsBazaar session
            shape — swap <span className="font-mono text-aqua-300">VITE_API_MODE=live</span> to point it at the API.
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

          <div className="mt-10 flex flex-wrap items-center gap-4 rounded-xl2 border border-white/8 bg-white/[0.02] p-4">
            <img src={reachmarkMark(40)} alt="" className="h-10 w-10 rounded-xl" />
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium text-slate-200">Demo identities</div>
              <div className="text-[11.5px] text-slate-500">
                Pick a role below — buyer, seller or ops. You can switch at any time from the avatar menu.
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- form */}
        <div>
          <Card className="p-7" hover={false}>
            <Tabs
              tabs={[
                { id: 'signin', label: 'Sign in' },
                { id: 'signup', label: 'Create account' },
              ]}
              value={mode}
              onChange={(v) => {
                setMode(v)
                setStep(0)
              }}
            />

            <form onSubmit={submit} className="mt-6 space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${mode}-${step}`}
                  initial={{ opacity: 0, x: 22 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -22 }}
                  transition={{ duration: 0.35, ease }}
                  className="space-y-4"
                >
                  {mode === 'signup' && step === 0 && (
                    <>
                      <Field label="Full name" hint="As it should appear on your listings">
                        <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ada Okonjo" />
                      </Field>
                      <Field label="Email" required>
                        <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="you@company.com" />
                      </Field>
                    </>
                  )}

                  {mode === 'signup' && step === 1 && (
                    <>
                      <Field label="Password" hint="8+ characters" required>
                        <Input type="password" value={form.password} onChange={(e) => set({ password: e.target.value })} placeholder="••••••••" />
                      </Field>
                      <div>
                        <div className="mb-2 text-[11.5px] font-medium text-slate-300">How will you use Reachmark?</div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {[
                            ['buyer', 'I buy logs', User],
                            ['seller', 'I sell logs', Zap],
                            ['admin', 'I run ops', Building2],
                          ].map(([id, label, Icon]) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => set({ role: id })}
                              className={cn(
                                'rounded-xl2 border p-3.5 text-left transition',
                                form.role === id ? 'border-volt-500/45 bg-volt-500/12' : 'border-white/8 bg-white/[0.02] hover:border-white/16',
                              )}
                            >
                              <Icon className={cn('h-4 w-4', form.role === id ? 'text-volt-300' : 'text-slate-400')} />
                              <div className={cn('mt-2 text-[12.5px] font-medium', form.role === id ? 'text-white' : 'text-slate-300')}>{label}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {mode === 'signup' && step === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 rounded-xl2 border border-verify-500/25 bg-verify-500/[0.06] p-4">
                        <BadgeCheck className="h-5 w-5 shrink-0 text-verify-400" />
                        <p className="text-[12.5px] leading-relaxed text-slate-300">
                          Ready to create <span className="font-medium text-white">{form.email}</span> as a{" "}
                          <span className="font-medium capitalize text-white">{form.role}</span>. No email is sent in
                          demo mode.
                        </p>
                      </div>
                      <div className="space-y-2">
                        {['Ownership test is mandatory on both sides', 'Payments stay inside escrow', 'Credential chain is the evidence of record'].map((t) => (
                          <div key={t} className="flex items-center gap-2.5 text-[12.5px] text-slate-300">
                            <Check className="h-3.5 w-3.5 text-verify-400" />
                            {t}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {mode === 'signin' && (
                    <>
                      <Field label="Email">
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => set({ email: e.target.value })}
                          placeholder="ada@reachmarklogs.test"
                        />
                      </Field>
                      <Field label="Password" hint="demo mode accepts anything">
                        <Input
                          type="password"
                          value={form.password}
                          onChange={(e) => set({ password: e.target.value })}
                          placeholder="••••••••"
                        />
                      </Field>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-[12px] text-slate-400">
                          <input type="checkbox" defaultChecked className="accent-volt-500" /> Keep me signed in
                        </label>
                        <button type="button" className="text-[12px] text-aqua-300 hover:text-aqua-200">
                          Forgot password?
                        </button>
                      </div>
                      <div>
                        <div className="mb-2 text-[11.5px] font-medium text-slate-300">Sign in as</div>
                        <div className="grid grid-cols-3 gap-2">
                          {['buyer', 'seller', 'admin'].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => set({ role: r })}
                              className={cn(
                                'rounded-xl border px-3 py-2 text-[12px] font-medium capitalize transition',
                                form.role === r ? 'border-volt-500/45 bg-volt-500/12 text-volt-300' : 'border-white/8 bg-white/[0.02] text-slate-400 hover:text-slate-200',
                              )}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {mode === 'signup' && (
                <Progress value={((step + 1) / 3) * 100} />
              )}

              <Button type="submit" className="w-full" loading={busy}>
                {mode === 'signin' ? 'Sign in' : step === 2 ? 'Create account' : 'Continue'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/8" />
              <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">or continue with</span>
              <span className="h-px flex-1 bg-white/8" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Google', Mail],
                ['GitHub', Github],
              ].map(([label, Icon]) => (
                <Button
                  key={label}
                  type="button"
                  variant="ghost"
                  onClick={() => toast.success(`${label} OAuth is stubbed — Clerk handles it in live mode`)}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Button>
              ))}
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-xl2 border border-white/8 bg-white/[0.02] p-4">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-aqua-300" />
              <p className="text-[11.5px] leading-relaxed text-slate-400">
                Production auth uses Clerk with a Postgres-backed session table; the demo provider in{" "}
                <span className="font-mono text-slate-300">authSlice.js</span> mirrors the same session shape so no
                component changes when you flip to live.
              </p>
            </div>
          </Card>

          <p className="mt-5 text-center text-[12px] text-slate-500">
            By continuing you agree to the Reachmark terms and the{" "}
            <Link to="/trust" className="text-aqua-300 hover:text-aqua-200">escrow protocol</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
