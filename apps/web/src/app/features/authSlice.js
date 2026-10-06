import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { auth, sessionToken, apiMode } from '../../lib/api'

/**
 * Session state.
 *
 * Upstream AccountsBazaar kept identity in Clerk and mirrored a hard-coded
 * demo user into Redux. Reachmark now owns its accounts, so this slice is the
 * client half: it bootstraps from the stored token, holds the verified user,
 * and exposes the account operations the UI calls.
 *
 * Two deliberate choices:
 *
 *   `status` is explicit — 'idle' | 'loading' | 'authenticated' | 'anonymous'.
 *   An earlier version inferred "signed out" from `user === null`, which cannot
 *   tell the difference between "no session" and "still asking", and briefly
 *   rendered the signed-in chrome to anonymous visitors on a slow connection.
 *
 *   Only the server's public user shape is stored. Notably the plan comes from
 *   the API, not from a client-side default, so a free account cannot be
 *   *rendered* as premium by editing localStorage.
 */

/* -------------------------------------------------------------- thunks ---- */

export const bootstrapSession = createAsyncThunk('auth/bootstrap', async () => {
  const res = await auth.session()
  if (res?.user && !res.authenticated) return { user: null }
  return { user: res?.authenticated ? res.user : null, mode: res?.mode }
})

const unwrap = (res) => {
  if (res?.token) sessionToken.set(res.token)
  return res?.user ?? null
}

export const signUp = createAsyncThunk('auth/signup', async (payload, { rejectWithValue }) => {
  try {
    return unwrap(await auth.signup(payload))
  } catch (err) {
    return rejectWithValue({ message: err.message, code: err.code, problems: err.problems, status: err.status })
  }
})

export const signIn = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    return unwrap(await auth.login(payload))
  } catch (err) {
    return rejectWithValue({ message: err.message, code: err.code, attemptsLeft: err.attemptsLeft, status: err.status })
  }
})

export const signOut = createAsyncThunk('auth/logout', async () => {
  try { await auth.logout() } catch { /* the local token is cleared regardless */ }
  sessionToken.clear()
  return true
})

export const updateProfile = createAsyncThunk('auth/updateProfile', async (patch, { rejectWithValue }) => {
  try {
    const res = await auth.updateProfile(patch)
    return res.user
  } catch (err) {
    return rejectWithValue({ message: err.message, code: err.code })
  }
})

export const changePassword = createAsyncThunk('auth/changePassword', async ({ currentPassword, password }, { rejectWithValue }) => {
  try {
    return await auth.changePassword(currentPassword, password)
  } catch (err) {
    return rejectWithValue({ message: err.message, code: err.code, problems: err.problems })
  }
})

export const deactivateAccount = createAsyncThunk('auth/deactivate', async (_, { rejectWithValue }) => {
  try {
    const res = await auth.deactivate()
    sessionToken.clear()
    return res
  } catch (err) {
    return rejectWithValue({ message: err.message })
  }
})

/* --------------------------------------------------------------- slice ----- */

/** Signed out. Kept as the single source of "nobody is here". */
const anonymous = {
  id: null, name: '', handle: '', email: '', role: 'guest', plan: 'guest',
  avatar: null, country: '', balance: 0, pending: 0, lifetime: 0,
  trustScore: 0, kyc: 'unverified', joined: null, unread: 0, watchlist: [],
}

/**
 * The seeded persona that local (fixture) mode presents, so every page still
 * renders. In live mode nothing here is used — the API is the only authority.
 */
const localPersona = {
  ...anonymous,
  id: 'local_guest',
  name: 'Ada Okonjo',
  handle: '@ada.reach',
  email: 'ada@reachmarklogs.test',
  role: 'seller',
  plan: 'pro',
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

const isLiveMode = apiMode === 'live'

/** Merges an API user onto the shape the UI already expects. */
const shape = (u) => ({
  ...anonymous,
  id: u.id,
  name: u.name,
  handle: u.handle ? `@${String(u.handle).replace(/^@/, '')}` : '',
  email: u.email,
  role: u.role ?? 'buyer',
  plan: u.plan ?? 'free',
  avatar: u.image && u.image.startsWith('data:') ? u.image : null,
  initials: u.image && !u.image.startsWith('data:') ? u.image : '',
  country: u.country ?? '',
  bio: u.bio ?? '',
  emailVerified: Boolean(u.emailVerified),
  lifetime: u.earned ?? 0,
  withdrawn: u.withdrawn ?? 0,
  joined: u.createdAt,
  lastLoginAt: u.lastLoginAt ?? null,
  status: u.status ?? 'active',
  trustScore: u.emailVerified ? 92 : 64,
  kyc: u.emailVerified ? 'verified' : 'pending',
  watchlist: [],
  unread: 0,
  balance: 0,
  pending: 0,
})

const initialState = {
  // Local mode starts authenticated so the preview shows the full product;
  // live mode starts anonymous and is corrected by bootstrapSession on mount.
  user: isLiveMode ? anonymous : localPersona,
  status: isLiveMode ? 'loading' : 'authenticated',
  signedIn: !isLiveMode,
  mode: apiMode,
  demo: !isLiveMode,
  busy: false,
  lastError: null,
  /** Set once the user has answered (or dismissed) the sign-in prompt. */
  promptDismissed: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setRole: (s, a) => { if (s.user) s.user.role = a.payload },
    setPlan: (s, a) => { if (s.user) s.user.plan = a.payload },
    toggleWatch: (s, a) => {
      const id = a.payload
      if (!s.user) return
      s.user.watchlist = s.user.watchlist?.includes(id)
        ? s.user.watchlist.filter((x) => x !== id)
        : [...(s.user.watchlist ?? []), id]
    },
    markRead: (s) => { if (s.user) s.user.unread = 0 },
    withdraw: (s, a) => {
      if (!s.user) return
      const amount = Number(a.payload) || 0
      s.user.balance = Math.max(0, s.user.balance - amount)
      s.user.pending += amount
    },
    dismissPrompt: (s) => { s.promptDismissed = true },
    /** Keeps the optimistic local shape after a profile save. */
    applyUser: (s, a) => {
      if (s.user && a.payload) s.user = { ...s.user, ...a.payload }
    },
    clearError: (s) => { s.lastError = null },
  },
  extraReducers: (builder) => {
    const pending = (s) => { s.busy = true; s.lastError = null }
    const failed = (s, a) => {
      s.busy = false
      s.lastError = a.payload?.message ?? a.error?.message ?? 'Something went wrong.'
    }

    builder
      .addCase(bootstrapSession.pending, (s) => { if (isLiveMode) s.status = 'loading' })
      .addCase(bootstrapSession.fulfilled, (s, a) => {
        if (!isLiveMode) { s.status = 'authenticated'; s.signedIn = true; return }
        if (a.payload?.user) {
          s.user = shape(a.payload.user)
          s.status = 'authenticated'
          s.signedIn = true
        } else {
          s.user = anonymous
          s.status = 'anonymous'
          s.signedIn = false
        }
      })
      .addCase(bootstrapSession.rejected, (s) => {
        // An unreachable API is not the same as a signed-out user, but the safe
        // rendering is the anonymous chrome — never a half-signed-in shell.
        s.status = isLiveMode ? 'anonymous' : 'authenticated'
        s.signedIn = !isLiveMode
      })

      .addCase(signUp.pending, pending)
      .addCase(signUp.fulfilled, (s, a) => {
        s.busy = false
        if (!a.payload) { s.status = 'authenticated'; s.signedIn = true; return }
        s.user = shape(a.payload)
        s.status = 'authenticated'
        s.signedIn = true
        s.demo = false
      })
      .addCase(signUp.rejected, failed)

      .addCase(signIn.pending, pending)
      .addCase(signIn.fulfilled, (s, a) => {
        s.busy = false
        if (!a.payload) { s.status = 'authenticated'; s.signedIn = true; return }
        s.user = shape(a.payload)
        s.status = 'authenticated'
        s.signedIn = true
        s.demo = false
      })
      .addCase(signIn.rejected, failed)

      .addCase(signOut.pending, (s) => { s.busy = true })
      .addCase(signOut.fulfilled, (s) => {
        s.busy = false
        s.user = anonymous
        s.signedIn = false
        s.status = isLiveMode ? 'anonymous' : 'authenticated'
        if (!isLiveMode) s.user = localPersona
      })

      .addCase(updateProfile.fulfilled, (s, a) => {
        if (a.payload) s.user = { ...s.user, ...shape(a.payload), watchlist: s.user?.watchlist ?? [] }
      })
      .addCase(deactivateAccount.fulfilled, (s) => {
        s.busy = false
        s.user = anonymous
        s.signedIn = false
        s.status = isLiveMode ? 'anonymous' : 'authenticated'
      })
  },
})

export const {
  setRole, setPlan, toggleWatch, markRead, withdraw, dismissPrompt, applyUser, clearError,
} = authSlice.actions

export const selectAuth = (s) => s.auth
export const selectUser = (s) => s.auth.user
export const selectIsSignedIn = (s) => s.auth.signedIn
export const selectIsAuthenticated = (s) => s.auth.status === 'authenticated' && Boolean(s.auth.user?.id)
export const selectIsAdmin = (s) => s.auth.user?.role === 'admin'
export const selectCanSell = (s) => ['seller', 'admin'].includes(s.auth.user?.role)
export const selectIsSeller = (s) => ['seller', 'admin'].includes(s.auth.user?.role)
export const selectWatchlist = (s) => s.auth.user?.watchlist ?? []
export default authSlice.reducer
