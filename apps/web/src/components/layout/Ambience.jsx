import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'
import { cn } from '../../lib/format'

/**
 * Ambient background stack — the "not dull" layer.
 * Pure CSS/SVG, no external assets, GPU-composited, honours reduced motion.
 */
export function AuroraBackdrop({ intensity = 1, className }) {
  return (
    <div aria-hidden className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}>
      <div className="absolute inset-0 bg-ink-900" />
      <div
        className="absolute -left-[18%] -top-[22%] h-[62vw] w-[62vw] animate-aurora rounded-full opacity-[0.52] blur-[90px]"
        style={{
          background: `radial-gradient(circle at 40% 40%, rgba(124,92,255,${0.55 * intensity}), transparent 62%)`,
        }}
      />
      <div
        className="absolute -right-[12%] top-[6%] h-[52vw] w-[52vw] animate-drift rounded-full opacity-[0.46] blur-[100px]"
        style={{
          background: `radial-gradient(circle at 60% 40%, rgba(34,211,238,${0.5 * intensity}), transparent 64%)`,
          animationDelay: '-6s',
        }}
      />
      <div
        className="absolute bottom-[-26%] left-[24%] h-[58vw] w-[58vw] animate-aurora rounded-full opacity-[0.36] blur-[110px]"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(236,72,153,${0.42 * intensity}), transparent 66%)`,
          animationDelay: '-11s',
        }}
      />
      <div className="absolute inset-0 gridlines" />
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 120% 80% at 50% -10%, rgba(124,92,255,.14), transparent 60%)',
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-[28vh] bg-[linear-gradient(180deg,transparent,rgba(5,7,13,.85))]" />
    </div>
  )
}

/** Cursor-following spotlight; disabled on touch + reduced-motion. */
export function CursorGlow({ enabled = true }) {
  const x = useMotionValue(-500)
  const y = useMotionValue(-500)
  const sx = useSpring(x, { stiffness: 90, damping: 20, mass: 0.5 })
  const sy = useSpring(y, { stiffness: 90, damping: 20, mass: 0.5 })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(hover: none)').matches) return
    const move = (e) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setVisible(true)
    }
    const leave = () => setVisible(false)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerleave', leave)
    }
  }, [enabled, x, y])

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-[5] hidden h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full md:block"
      style={{
        left: sx,
        top: sy,
        opacity: visible ? 0.55 : 0,
        background:
          'radial-gradient(circle, rgba(124,92,255,.16), rgba(34,211,238,.06) 42%, transparent 68%)',
        filter: 'blur(28px)',
        transition: 'opacity .5s ease',
      }}
    />
  )
}

/** Thin animated scroll progress rail pinned to the viewport top. */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  return (
    <div className="fixed inset-x-0 top-0 z-[80] h-[2px] bg-transparent">
      <div
        className="h-full origin-left bg-[linear-gradient(90deg,#7c5cff,#22d3ee_60%,#f472b6)] transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%`, boxShadow: '0 0 18px rgba(34,211,238,.7)' }}
      />
    </div>
  )
}

/** Animated grid/dot floor used behind hero content. */
export function HeroFloor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] overflow-hidden">
      <div
        className="absolute inset-x-[-20%] bottom-[-10%] h-full opacity-[0.34]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(124,92,255,.42) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.3) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          transform: 'perspective(560px) rotateX(62deg)',
          transformOrigin: 'bottom',
          maskImage: 'linear-gradient(180deg, transparent, #000 62%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 62%)',
        }}
      />
    </div>
  )
}
