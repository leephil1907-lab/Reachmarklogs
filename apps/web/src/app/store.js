import { configureStore } from '@reduxjs/toolkit'
import ui from './features/uiSlice'
import auth from './features/authSlice'
import catalog from './features/catalogSlice'
import chat from './features/chatSlice'
import ops from './features/opsSlice'

/**
 * Reachmark Logs store.
 * Slices mirror the AccountsBazaar client store (listingSlice + chatSlice) with
 * the ui/auth/ops slices added for the merged experience.
 */
export const store = configureStore({
  reducer: { ui, auth, catalog, chat, ops },
  middleware: (getDefault) => getDefault({ serializableCheck: false }),
  devTools: true,
})

export default store
