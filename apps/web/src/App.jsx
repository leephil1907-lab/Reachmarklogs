import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Navbar, Footer, CommandPalette, PageTransition } from './components/layout/Chrome'
import { AuroraBackdrop, CursorGlow, ScrollProgress } from './components/layout/Ambience'
import { Skeleton } from './components/ui'

const Home = lazy(() => import('./pages/Home'))
const Marketplace = lazy(() => import('./pages/Marketplace'))
const ListingDetail = lazy(() => import('./pages/ListingDetail'))
const Sell = lazy(() => import('./pages/Sell'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Messages = lazy(() => import('./pages/Messages'))
const Admin = lazy(() => import('./pages/Admin'))
const Studio = lazy(() => import('./pages/Studio'))
const Tools = lazy(() => import('./pages/Tools'))
const Docs = lazy(() => import('./pages/Docs'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Trust = lazy(() => import('./pages/Trust'))
const Academy = lazy(() => import('./pages/Academy'))
const About = lazy(() => import('./pages/About'))
const Auth = lazy(() => import('./pages/Auth'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RouteFallback() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-28 sm:px-6 lg:px-8">
      <Skeleton className="h-10 w-64" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl3 border border-white/8 p-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const loc = useLocation()
  const reduced = useSelector((s) => s.ui.reducedMotion)

  useEffect(() => {
    const q = new URLSearchParams(loc.search)
    const base = 'Reachmark Logs'
    const titles = {
      '/': `${base} — Buy & sell verified social, gaming and aged digital logs`,
      '/marketplace': `Marketplace · ${base}`,
      '/sell': `List a log · ${base}`,
      '/studio': `Proof Studio · ${base}`,
      '/tools': `Tool library · ${base}`,
      '/docs': `Build manifest · ${base}`,
      '/dashboard': `Seller dashboard · ${base}`,
      '/messages': `Messages · ${base}`,
      '/admin': `Ops console · ${base}`,
      '/pricing': `Plans · ${base}`,
      '/trust': `Trust centre · ${base}`,
      '/academy': `Seller academy · ${base}`,
      '/about': `About the merge · ${base}`,
      '/auth': `Sign in · ${base}`,
    }
    document.title = loc.pathname.startsWith('/logs/')
      ? `Log ${loc.pathname.split('/').pop()} · ${base}`
      : titles[loc.pathname] ?? base
    if (q.get('category')) document.title = `${q.get('category')} logs · ${base}`
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [loc])

  return (
    <div className="relative min-h-screen">
      <AuroraBackdrop intensity={reduced ? 0.4 : 1} />
      <CursorGlow enabled={!reduced} />
      <ScrollProgress />
      <Navbar />
      <CommandPalette />
      <Suspense fallback={<RouteFallback />}>
        <PageTransition>
          <Routes location={loc}>
            <Route path="/" element={<Home />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/logs/:id" element={<ListingDetail />} />
            <Route path="/sell" element={<Sell />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/trust" element={<Trust />} />
            <Route path="/academy" element={<Academy />} />
            <Route path="/about" element={<About />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
      </Suspense>
      <Footer />
    </div>
  )
}
