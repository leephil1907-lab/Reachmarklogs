import { createSlice, nanoid } from '@reduxjs/toolkit'
import { CATALOG } from '../../data/catalog'

/**
 * Chat is ported from the AccountsBazaar client (short-poll thread model) and
 * extended with Reachmark's automated guard messages ("PlatformMessage" rows in
 * the server schema), which is what makes the marketplace feel alive.
 */
const [first, second, third] = CATALOG.listings

const seedThreads = [
  {
    id: 'th_1',
    listingId: first.id,
    buyer: { id: 'usr_rm_8842', name: 'You', avatar: null },
    seller: first.seller,
    lastMessage: 'Escrow opened — credential chain attached.',
    unread: 2,
    updatedAt: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    messages: [
      { id: 'm1', sender: 'buyer', body: `Is the ${first.platformLabel} handle transferable without a cooldown?`, at: iso(52) },
      { id: 'm2', sender: 'seller', body: 'Yes — no cooldown on the handle, only the recovery email needs 48h to settle.', at: iso(48) },
      { id: 'm3', sender: 'guard', body: 'Reachmark guard: never move payment off-platform. Escrow holds funds until you confirm the credential chain.', at: iso(30) },
      { id: 'm4', sender: 'buyer', body: 'Can you hold it until Friday? I am wiring through escrow today.', at: iso(12) },
      { id: 'm5', sender: 'seller', body: 'Escrow opened — credential chain attached.', at: iso(7) },
    ],
  },
  {
    id: 'th_2',
    listingId: second.id,
    buyer: { id: 'usr_rm_8842', name: 'You', avatar: null },
    seller: second.seller,
    lastMessage: 'Proof vault updated with the audience export.',
    unread: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 190).toISOString(),
    messages: [
      { id: 'm1', sender: 'seller', body: 'Proof vault updated with the audience export.', at: iso(196) },
      { id: 'm2', sender: 'buyer', body: 'Received — reviewing the geography split now.', at: iso(190) },
    ],
  },
  {
    id: 'th_3',
    listingId: third.id,
    buyer: { id: 'usr_rm_8842', name: 'You', avatar: null },
    seller: third.seller,
    lastMessage: 'Counter offer sent: the desk reviewed your position.',
    unread: 1,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    messages: [
      { id: 'm1', sender: 'buyer', body: 'Would you take 12% below ask for an immediate escrow release?', at: iso(1560) },
      { id: 'm2', sender: 'seller', body: 'Counter offer sent: the desk reviewed your position.', at: iso(1560) },
    ],
  },
]

function iso(minsAgo) {
  return new Date(Date.now() - minsAgo * 60_000).toISOString()
}

const REPORTED = ['Section 4 handover violated — payment requested off-platform', 'Suspected resale of a previously sold log', 'Proof screenshots appear re-used from another listing']

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    threads: seedThreads,
    activeId: seedThreads[0].id,
    typing: false,
    draft: '',
    reported: REPORTED,
  },
  reducers: {
    setActive: (s, a) => {
      s.activeId = a.payload
      const t = s.threads.find((x) => x.id === a.payload)
      if (t) t.unread = 0
    },
    setDraft: (s, a) => {
      s.draft = a.payload
    },
    send: (s, a) => {
      const thread = s.threads.find((t) => t.id === s.activeId)
      if (!thread) return
      const body = (a.payload ?? s.draft).trim()
      if (!body) return
      thread.messages.push({ id: nanoid(6), sender: 'buyer', body, at: new Date().toISOString() })
      thread.lastMessage = body
      thread.updatedAt = new Date().toISOString()
      s.draft = ''
      s.typing = true
    },
    settleTyping: (s) => {
      s.typing = false
    },
    receive: (s, a) => {
      const thread = s.threads.find((t) => t.id === s.activeId)
      if (!thread) return
      thread.messages.push({ id: nanoid(6), sender: 'seller', body: a.payload, at: new Date().toISOString() })
      thread.lastMessage = a.payload
      thread.updatedAt = new Date().toISOString()
      s.typing = false
    },
    guardNotice: (s, a) => {
      const thread = s.threads.find((t) => t.id === s.activeId)
      if (!thread) return
      thread.messages.push({ id: nanoid(6), sender: 'guard', body: a.payload, at: new Date().toISOString() })
      thread.lastMessage = a.payload
    },
    openThreadFor: (s, a) => {
      const existing = s.threads.find((t) => t.listingId === a.payload)
      if (existing) {
        s.activeId = existing.id
        existing.unread = 0
        return
      }
      const listing = CATALOG.listings.find((l) => l.id === a.payload)
      if (!listing) return
      const id = `th_${nanoid(5)}`
      s.threads.unshift({
        id,
        listingId: listing.id,
        buyer: { id: 'usr_rm_8842', name: 'You', avatar: null },
        seller: listing.seller,
        lastMessage: 'Thread opened from listing page.',
        unread: 0,
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: nanoid(6),
            sender: 'guard',
            body: `Reachmark guard: this thread is escrow-only. Funds release after you confirm the credential chain for ${listing.id}.`,
            at: new Date().toISOString(),
          },
        ],
      })
      s.activeId = id
    },
  },
})

export const { setActive, setDraft, send, settleTyping, receive, guardNotice, openThreadFor } = chatSlice.actions
export const selectActiveThread = (s) => s.chat.threads.find((t) => t.id === s.chat.activeId)
export default chatSlice.reducer
