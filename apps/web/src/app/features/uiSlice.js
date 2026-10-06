import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  commandOpen: false,
  mobileNavOpen: false,
  toast: null,
  reducedMotion: false,
  cursorGlow: true,
  progress: 0,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleCommand: (s, a) => {
      s.commandOpen = a.payload ?? !s.commandOpen
    },
    toggleMobileNav: (s, a) => {
      s.mobileNavOpen = a.payload ?? !s.mobileNavOpen
    },
    setProgress: (s, a) => {
      s.progress = a.payload
    },
    setReducedMotion: (s, a) => {
      s.reducedMotion = a.payload
    },
  },
})

export const { toggleCommand, toggleMobileNav, setProgress, setReducedMotion } = uiSlice.actions
export default uiSlice.reducer
