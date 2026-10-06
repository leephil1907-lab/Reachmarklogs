import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Compass, Radio, Search } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { Badge, Button, Card, ease } from '../components/ui'
import { toggleCommand } from '../app/features/uiSlice'

const ROUTES = [
  ['Marketplace', '/marketplace', 'Browse 72 verified logs'],
  ['Proof Studio', '/studio', 'Render a narrated proof reel'],
  ['Tool library', '/tools', 'The 50 clawed reference tools'],
  ['Build manifest', '/docs', 'What the merge produced'],
]

export default function NotFound() {
  const dispatch = useDispatch()
  return (
    <div className="mx-auto max-w-3xl px-4 pt-36 pb-20 text-center sm:px-6">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease }}>
        <Badge tone="danger" dot>404 · listing not found</Badge>
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.6, ease }}
        className="mt-6 text-[3.4rem] leading-none"
      >
        <span className="gradient-text">404</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.6, ease }}
        className="mt-5 text-[15px] leading-relaxed text-slate-400"
      >
        That page either sold, got pulled during verification, or never existed. The floor is still open — here is
        where most people head next.
      </motion.p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link to="/">
          <Button>
            <ArrowLeft className="h-4 w-4" /> Back home
          </Button>
        </Link>
        <Button variant="ghost" onClick={() => dispatch(toggleCommand(true))}>
          <Search className="h-4 w-4" /> Search everything
        </Button>
      </div>

      <div className="mt-12 grid gap-3 text-left sm:grid-cols-2">
        {ROUTES.map(([label, to, blurb], i) => (
          <motion.div key={to} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.07, duration: 0.5, ease }}>
            <Link to={to}>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-100">
                  <Compass className="h-3.5 w-3.5 text-volt-300" />
                  {label}
                </div>
                <p className="mt-1.5 text-[12px] text-slate-500">{blurb}</p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 inline-flex items-center gap-2 text-[11.5px] text-slate-500">
        <Radio className="h-3 w-3 text-verify-400" />
        The escrow engine is unaffected by this error.
      </div>
    </div>
  )
}
