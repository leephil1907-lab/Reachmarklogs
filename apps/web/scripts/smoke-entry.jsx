import React from 'react'
import { renderToString } from 'react-dom/server'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import store from '/src/app/store.js'
import Home from '/src/pages/Home.jsx'
import Marketplace from '/src/pages/Marketplace.jsx'
import ListingDetail from '/src/pages/ListingDetail.jsx'
import Sell from '/src/pages/Sell.jsx'
import Dashboard from '/src/pages/Dashboard.jsx'
import Messages from '/src/pages/Messages.jsx'
import Admin from '/src/pages/Admin.jsx'
import Studio from '/src/pages/Studio.jsx'
import Tools from '/src/pages/Tools.jsx'
import Docs from '/src/pages/Docs.jsx'
import Pricing from '/src/pages/Pricing.jsx'
import Trust from '/src/pages/Trust.jsx'
import Academy from '/src/pages/Academy.jsx'
import About from '/src/pages/About.jsx'
import Auth from '/src/pages/Auth.jsx'
import Account from '/src/pages/Account.jsx'
import NotFound from '/src/pages/NotFound.jsx'
import { Navbar, Footer, CommandPalette } from '/src/components/layout/Chrome.jsx'
import { AuroraBackdrop, CursorGlow, ScrollProgress } from '/src/components/layout/Ambience.jsx'

const routes = [
  ['/', Home],
  ['/marketplace', Marketplace],
  ['/logs/:id', ListingDetail, '/logs/RM-4200'],
  ['/logs/:id', ListingDetail, '/logs/does-not-exist'],
  ['/sell', Sell],
  ['/dashboard', Dashboard],
  ['/messages', Messages],
  ['/admin', Admin],
  ['/studio', Studio],
  ['/tools', Tools],
  ['/docs', Docs],
  ['/pricing', Pricing],
  ['/trust', Trust],
  ['/academy', Academy],
  ['/about', About],
  ['/auth', Auth],
  ['/auth/reset', Auth],
  ['/auth/verify', Auth],
  ['/account', Account],
  ['/nope', NotFound],
]

export async function run() {
  const results = []
  for (const [path, Page, entry] of routes) {
    const entryPath = entry ?? path
    const errors = []
    // framer-motion uses useLayoutEffect, which is a no-op during SSR — that is
    // expected here because the real app always runs in the browser. Everything
    // else is treated as a genuine render failure.
    const IGNORE = [/useLayoutEffect does nothing on the server/]
    const spy = (e) => {
      const msg = String(e?.message ?? e)
      if (!IGNORE.some((re) => re.test(msg))) errors.push(msg)
    }
    const origError = console.error
    const origWarn = console.warn
    console.error = spy
    console.warn = spy
    let length = 0
    let marker = ''
    try {
      const html = renderToString(
        React.createElement(
          Provider,
          { store },
          React.createElement(
            MemoryRouter,
            { initialEntries: [entryPath] },
            React.createElement(
              'div',
              null,
              React.createElement(AuroraBackdrop, null),
              React.createElement(CursorGlow, { enabled: false }),
              React.createElement(ScrollProgress, null),
              React.createElement(Navbar, null),
              React.createElement(CommandPalette, null),
              React.createElement(
                Routes,
                null,
                React.createElement(Route, { path: path, element: React.createElement(Page, null) }),
                React.createElement(Route, { path: '*', element: React.createElement(Page, null) }),
              ),
              React.createElement(Footer, null),
            ),
          ),
        ),
      )
      length = html.length
      marker = html.includes('no longer listed')
        ? 'not-found branch'
        : html.includes('Escrow sheet') || html.includes('Fund escrow')
          ? 'listing loaded'
          : ''
    } catch (err) {
      errors.push(`THREW: ${err.message}`)
    }
    console.error = origError
    console.warn = origWarn
    results.push({ path, ok: errors.length === 0, length, marker, errors })
  }
  return results
}
