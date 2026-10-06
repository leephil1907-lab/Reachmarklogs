import { createSlice } from '@reduxjs/toolkit'

/**
 * Demo identity layer.
 *
 * The AccountsBazaar client authenticates against Clerk. Reachmark runs
 * local-first, so this slice emulates the same session shape (id, role, plan,
 * balance, avatar) and the Clerk provider can be dropped in unchanged when
 * `VITE_API_MODE=live`.
 */
const demoUser = {
  id: 'usr_rm_8842',
  name: 'Ada Okonjo',
  handle: '@ada.reach',
  email: 'ada@reachmarklogs.test',
  role: 'seller', // buyer | seller | admin
  plan: 'pro', // free | pro | desk
  planRenews: '2026-11-02',
  avatar: null,
  country: 'Nigeria',
  balance: 18420.5,
  pending: 3620,
  lifetime: 74210.25,
  trustScore: 96,
  kyc: 'verified',
  joined: '2024-03-18',
  unread: 4,
  watchlist: ['RM-4200', 'RM-4277'],
}

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: demoUser, signedIn: true, busy: false, twoFactor: true },
  reducers: {
    signIn: (s, a) => {
      s.signedIn = true
      if (a.payload) s.user = { ...s.user, ...a.payload }
    },
    signOut: (s) => {
      s.signedIn = false
    },
    setRole: (s, a) => {
      s.user.role = a.payload
    },
    setPlan: (s, a) => {
      s.user.plan = a.payload
    },
    toggleWatch: (s, a) => {
      const id = a.payload
      s.user.watchlist = s.user.watchlist.includes(id)
        ? s.user.watchlist.filter((x) => x !== id)
        : [...s.user.watchlist, id]
    },
    markRead: (s) => {
      s.user.unread = 0
    },
    withdraw: (s, a) => {
      const amount = Number(a.payload) || 0
      s.user.balance = Math.max(0, s.user.balance - amount)
      s.user.pending += amount
    },
  },
})

export const { signIn, signOut, setRole, setPlan, toggleWatch, markRead, withdraw } = authSlice.actions
export default authSlice.reducer
