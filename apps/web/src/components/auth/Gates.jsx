/**
 * Route gates.
 *
 * The merge shipped pages that assumed a signed-in seller with a seeded
 * balance, so an anonymous visitor saw a dashboard populated with someone
 * else's numbers. These guards replace that with the honest behaviour: show a
 * sign-in prompt, and once satisfied, render the page.
 *
 * `RequireAuth` renders a *prompt*, not a redirect. Bouncing someone to /auth
 * and losing their place is the standard way to make a marketplace feel
 * hostile; asking in place keeps the context and the back button intact.
 */
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Lock, ShieldAlert, Gauge, Tag } from 'lucide-react'
import { useSelector } from 'react-redux'
import { Button, Card, ease } from '../ui'
import {
  selectIsAuthenticated, selectIsAdmin, selectIsSeller, selectAuth,
} from '../../app/features/authSlice'

function Gate({ icon: Icon = Lock, title, body, action }) {
  return (
    <div className="mx-auto max-w-md px-4 pt-32 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.5, ease }}>
        <Card className="p-8 text-center" hover={false}>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-300">
            <Icon className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-[18px] font-semibold text-slate-100">{title}</h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">{body}</p>
          {action}
        </Card>
      </motion.div>
    </div>
  )
}

/** Waits for the session check before deciding, so nothing flashes. */
const useGateState = () => {
  const { status } = useSelector(selectAuth)
  return { checking: status === 'loading', authenticated: useSelector(selectIsAuthenticated) }
}

export function RequireAuth({ children }) {
  const location = useLocation()
  const { checking, authenticated } = useGateState()

  if (checking) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-32 sm:px-6">
        <div className="h-48 animate-pulse rounded-xl3 bg-white/[0.04]" />
      </div>
    )
  }
  if (authenticated) return children

  return (
    <Gate
      title="Sign in to continue"
      body={`This page shows your own listings, escrow and payouts. Sign in and we will bring you straight back to ${location.pathname}.`}
      action={
        <Button className="mt-6" asChild={false} onClick={() => { window.location.assign(`/auth?next=${encodeURIComponent(location.pathname)}`) }}>
          Sign in <ArrowRight className="h-4 w-4" />
        </Button>
      }
    />
  )
}

export function RequireSeller({ children }) {
  const { checking, authenticated } = useGateState()
  const canSell = useSelector(selectIsSeller)
  const { user } = useSelector(selectAuth)

  if (checking) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-32 sm:px-6">
        <div className="h-48 animate-pulse rounded-xl3 bg-white/[0.04]" />
      </div>
    )
  }
  if (authenticated && canSell) return children

  if (authenticated) {
    return (
      <Gate
        icon={Tag}
        title="Switch to a seller account"
        body="Your account is set up for buying. Sellers list logs, pass the credential audit and receive escrow payouts — switch your role from the account page to start selling."
        action={
          <Button className="mt-6" onClick={() => window.location.assign('/account')}>
            Open account settings <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />
    )
  }

  return (
    <Gate
      icon={Tag}
      title="Sign in to list a log"
      body="Creating a listing needs an account: the credential audit, the escrow contract and the payout rail are all attached to your identity."
      action={
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => window.location.assign('/auth')}>Sign in</Button>
          <Button variant="ghost" onClick={() => window.location.assign('/auth')}>Create account</Button>
        </div>
      }
    />
  )
}

export function RequireAdmin({ children }) {
  const { checking, authenticated } = useGateState()
  const isAdmin = useSelector(selectIsAdmin)

  if (checking) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-32 sm:px-6">
        <div className="h-48 animate-pulse rounded-xl3 bg-white/[0.04]" />
      </div>
    )
  }
  if (authenticated && isAdmin) return children

  return (
    <Gate
      icon={ShieldAlert}
      title={authenticated ? 'Ops desk access required' : 'Sign in to the ops desk'}
      body={
        authenticated
          ? 'This console reviews credential chains, disputes and payout requests. It is limited to accounts on the admin allow-list.'
          : 'The ops console requires an admin account. Sign in with the address that was added to the ops allow-list.'
      }
      action={
        <div className="mt-6 flex justify-center gap-2">
          {!authenticated && <Button onClick={() => window.location.assign('/auth')}>Sign in</Button>}
          <Button variant="ghost" onClick={() => window.location.assign('/trust')}>Read how ops works</Button>
        </div>
      }
    />
  )
}
