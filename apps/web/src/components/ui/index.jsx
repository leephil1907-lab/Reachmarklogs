import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView, useMotionValue, useSpring, useTransform, animate } from 'framer-motion'
import { cn } from '../../lib/format'

/* ------------------------------------------------------------------ Button - */
const VARIANTS = {
  primary:
    'text-white bg-[linear-gradient(102deg,#6a45f5,#7c5cff_38%,#22d3ee)] shadow-[0_14px_40px_-16px_rgba(124,92,255,.85)] hover:shadow-[0_20px_54px_-16px_rgba(34,211,238,.6)]',
  ghost:
    'text-slate-200 bg-white/[0.03] border border-white/10 hover:bg-white/[0.07] hover:border-volt-500/40',
  outline:
    'text-slate-100 bg-transparent border border-volt-500/45 hover:bg-volt-500/12 hover:border-volt-400',
  aqua: 'text-ink-950 bg-[linear-gradient(100deg,#7ce8f7,#38d9f0)] hover:brightness-110 font-semibold',
  verify:
    'text-ink-950 bg-[linear-gradient(100deg,#4ade80,#22d3ee)] font-semibold hover:brightness-110',
  danger: 'text-white bg-danger-500/90 hover:bg-danger-500',
  subtle: 'text-slate-300 hover:text-white hover:bg-white/[0.05]',
}
const SIZES = {
  xs: 'h-8 px-3 text-[12px] gap-1.5 rounded-lg',
  sm: 'h-9 px-3.5 text-[13px] gap-2 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl2',
  lg: 'h-13 px-7 text-[15px] gap-2.5 rounded-xl2',
  xl: 'h-15 px-9 text-base gap-3 rounded-[1.15rem]',
}

export const Button = React.forwardRef(function Button(
  { as: Tag = 'button', variant = 'primary', size = 'md', className, children, loading, ...rest },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={cn(
        'relative inline-flex select-none items-center justify-center overflow-hidden font-medium',
        'transition-[transform,box-shadow,background-color,border-color,filter] duration-300 ease-out',
        'active:scale-[0.975] disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent)] transition-transform duration-700 group-hover:translate-x-full" />
      {loading && (
        <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </Tag>
  )
})

/* ------------------------------------------------------------------- Badge - */
const BADGE_TONES = {
  neutral: 'bg-white/[0.05] text-slate-300 border-white/10',
  volt: 'bg-volt-500/14 text-volt-300 border-volt-500/30',
  aqua: 'bg-aqua-500/14 text-aqua-300 border-aqua-500/30',
  verify: 'bg-verify-500/14 text-verify-400 border-verify-500/30',
  warn: 'bg-warn-400/14 text-warn-400 border-warn-400/30',
  danger: 'bg-danger-500/14 text-danger-400 border-danger-500/30',
  magenta: 'bg-magenta-500/14 text-magenta-400 border-magenta-500/30',
}

export function Badge({ tone = 'neutral', className, children, dot, pulse, ...rest }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide',
        BADGE_TONES[tone],
        className,
      )}
      {...rest}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75', pulse && 'animate-pulse-ring', 'bg-current')} />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  )
}

/* -------------------------------------------------------------------- Card - */
export function Card({ className, children, hover = true, edge = true, ...rest }) {
  return (
    <div
      className={cn(
        'noise edge relative overflow-hidden rounded-xl3 glass',
        hover && 'transition-transform duration-500 ease-out will-change-transform hover:-translate-y-1',
        className,
      )}
      {...rest}
    >
      {edge === false && <span className="pointer-events-none absolute inset-0 rounded-xl3 ring-1 ring-white/5" />}
      {children}
    </div>
  )
}

/* ------------------------------------------------------- Reveal (in-view) --- */
export function Reveal({ children, delay = 0, y = 26, once = true, className, blur = true }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once, margin: '-12% 0px -8% 0px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, filter: blur ? 'blur(10px)' : 'none' }}
      animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.72, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Stagger container used across landing sections + grids. */
export function StaggerGroup({ children, className, stagger = 0.06, delay = 0, y = 22 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      variants={{ show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {React.Children.map(children, (child) =>
        child ? (
          <motion.div
            variants={{
              hidden: { opacity: 0, y, filter: 'blur(8px)' },
              show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] } },
            }}
          >
            {child}
          </motion.div>
        ) : null,
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ Counter - */
export function Counter({ to, from = 0, duration = 1.5, prefix = '', suffix = '', decimals = 0, className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [val, setVal] = useState(from)
  useEffect(() => {
    if (!inView) return
    const controls = animate(from, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(v),
    })
    return () => controls.stop()
  }, [inView, from, to, duration])
  return (
    <span ref={ref} className={cn('tnum', className)}>
      {prefix}
      {val.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}

/* --------------------------------------------------------------- TiltCard -- */
export function TiltCard({ children, className, intensity = 8, glare = true, ...rest }) {
  const ref = useRef(null)
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const sx = useSpring(mx, { stiffness: 180, damping: 22 })
  const sy = useSpring(my, { stiffness: 180, damping: 22 })
  const rotateY = useTransform(sx, [0, 1], [-intensity, intensity])
  const rotateX = useTransform(sy, [0, 1], [intensity, -intensity])
  const gx = useTransform(sx, [0, 1], ['12%', '88%'])
  const gy = useTransform(sy, [0, 1], ['8%', '92%'])
  const glareBg = useTransform(
    [gx, gy],
    ([x, y]) => `radial-gradient(420px circle at ${x} ${y}, rgba(255,255,255,.09), transparent 62%)`,
  )

  return (
    <motion.div
      ref={ref}
      onPointerMove={(e) => {
        const r = ref.current?.getBoundingClientRect()
        if (!r) return
        mx.set((e.clientX - r.left) / r.width)
        my.set((e.clientY - r.top) / r.height)
      }}
      onPointerLeave={() => {
        mx.set(0.5)
        my.set(0.5)
      }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 900 }}
      whileHover={{ scale: 1.014 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className={cn('relative', className)}
      {...rest}
    >
      {children}
      {glare && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] opacity-0 transition-opacity duration-300 hover:opacity-100"
          style={{ background: glareBg }}
        />
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ Input -- */
export function Field({ label, hint, error, children, className, required }) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="mb-1.5 flex items-baseline gap-2 text-[12px] font-medium tracking-wide text-slate-300">
          {label}
          {required && <span className="text-magenta-400">*</span>}
          {hint && <span className="ml-auto text-[11px] font-normal text-slate-500">{hint}</span>}
        </span>
      )}
      {children}
      {error && <span className="mt-1.5 block text-[11.5px] text-danger-400">{error}</span>}
    </label>
  )
}

const inputBase =
  'w-full rounded-xl border border-white/10 bg-ink-900/70 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 ' +
  'transition-[border-color,box-shadow,background-color] duration-300 outline-none ' +
  'hover:border-white/20 focus:border-volt-500/70 focus:bg-ink-850 focus:shadow-[0_0_0_4px_rgba(124,92,255,.14)]'

export const Input = React.forwardRef(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(inputBase, className)} {...rest} />
})

export const Textarea = React.forwardRef(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(inputBase, 'min-h-28 resize-y leading-relaxed', className)} {...rest} />
})

export function Select({ className, children, ...rest }) {
  return (
    <div className="relative">
      <select
        className={cn(inputBase, 'appearance-none pr-9 cursor-pointer [&>option]:bg-ink-850', className)}
        {...rest}
      >
        {children}
      </select>
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-slate-400">
        <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-volt-500/35 hover:bg-white/[0.045]"
    >
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300',
          checked ? 'bg-[linear-gradient(100deg,#7c5cff,#22d3ee)]' : 'bg-white/12',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 520, damping: 32 }}
          className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow', checked ? 'left-4.5' : 'left-0.5')}
          style={{ left: checked ? 18 : 2 }}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-slate-200">{label}</span>
        {hint && <span className="block truncate text-[11px] text-slate-500">{hint}</span>}
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ Tabs ---- */
export function Tabs({ tabs, value, onChange, className, size = 'md' }) {
  return (
    <div className={cn('inline-flex rounded-xl border border-white/8 bg-ink-900/60 p-1 backdrop-blur', className)}>
      {tabs.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              'relative whitespace-nowrap rounded-lg font-medium transition-colors duration-300',
              size === 'sm' ? 'px-3 py-1.5 text-[12px]' : 'px-4 py-2 text-[13px]',
              active ? 'text-white' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {active && (
              <motion.span
                layoutId={`tab-${tabs.map((x) => x.id).join('')}`}
                className="absolute inset-0 rounded-lg bg-[linear-gradient(120deg,rgba(124,92,255,.32),rgba(34,211,238,.22))] ring-1 ring-volt-500/35"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {t.icon}
              {t.label}
              {t.count != null && (
                <span className={cn('tnum rounded-full px-1.5 text-[10px]', active ? 'bg-white/18' : 'bg-white/8')}>
                  {t.count}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ----------------------------------------------------------------- Modal ---- */
export function Modal({ open, onClose, title, subtitle, children, footer, width = 'max-w-2xl' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <motion.div
      initial={false}
      animate={open ? 'open' : 'closed'}
      className={cn('fixed inset-0 z-[90] flex items-center justify-center p-4', open ? 'pointer-events-auto' : 'pointer-events-none')}
    >
      <motion.div
        variants={{ open: { opacity: 1 }, closed: { opacity: 0 } }}
        transition={{ duration: 0.28 }}
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/75 backdrop-blur-md"
      />
      <motion.div
        variants={{
          open: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
          closed: { opacity: 0, y: 24, scale: 0.97, filter: 'blur(8px)' },
        }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        className={cn('relative z-10 w-full overflow-hidden rounded-xl3 glass edge noise p-0', width)}
      >
        {(title || subtitle) && (
          <div className="border-b border-white/8 px-6 py-5">
            {subtitle && <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-volt-300">{subtitle}</div>}
            <h3 className="text-xl">{title}</h3>
          </div>
        )}
        <div className="max-h-[62vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 border-t border-white/8 bg-ink-950/40 px-6 py-4">{footer}</div>}
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------- Progress ---- */
export function Progress({ value, max = 100, className, tone = 'volt' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const grad =
    tone === 'aqua'
      ? 'linear-gradient(90deg,#7ce8f7,#22d3ee)'
      : tone === 'verify'
        ? 'linear-gradient(90deg,#4ade80,#22d3ee)'
        : 'linear-gradient(90deg,#7c5cff,#22d3ee)'
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/8', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="h-full rounded-full"
        style={{ background: grad }}
      />
    </div>
  )
}

/* ------------------------------------------------------------- Sparkline --- */
export function Sparkline({ series, width = 132, height = 40, stroke = '#38d9f0', fill = true, className }) {
  const min = Math.min(...series)
  const max = Math.max(...series)
  const span = max - min || 1
  const pts = series
    .map((v, i) => `${(i / (series.length - 1)) * (width - 4) + 2},${height - 3 - ((v - min) / span) * (height - 8)}`)
    .join(' ')
  const id = `sp${Math.round(min)}${series.length}${stroke.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('h-10 w-full', className)} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="0.42" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <polygon points={`2,${height} ${pts} ${width - 2},${height}`} fill={`url(#${id})`} />}
      <motion.polyline
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ---------------------------------------------------------------- Avatar --- */
export function Avatar({ src, name = '', size = 36, ring = false, className }) {
  const label = name.split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        ring && 'ring-2 ring-volt-500/40 ring-offset-2 ring-offset-ink-900',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span
          className="grid h-full w-full place-items-center font-semibold text-ink-950"
          style={{ background: 'linear-gradient(120deg,#9a86ff,#38d9f0)', fontSize: size * 0.38 }}
        >
          {label || 'R'}
        </span>
      )}
    </span>
  )
}

/* ---------------------------------------------------------------- Skeleton - */
export function Skeleton({ className }) {
  return <div className={cn('shimmer overflow-hidden rounded-xl bg-white/[0.045]', className)} />
}

/* -------------------------------------------------------------- SectionHead */
export function SectionHead({ kicker, title, sub, align = 'left', action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {kicker && (
          <Reveal>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-volt-500/25 bg-volt-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-volt-300">
              <span className="h-1 w-1 rounded-full bg-aqua-400" />
              {kicker}
            </div>
          </Reveal>
        )}
        <Reveal delay={0.06}>
          <h2 className="text-balance text-3xl leading-[1.06] sm:text-4xl lg:text-[2.9rem]">{title}</h2>
        </Reveal>
        {sub && (
          <Reveal delay={0.12}>
            <p className="mt-4 text-pretty text-[15px] leading-relaxed text-slate-400">{sub}</p>
          </Reveal>
        )}
      </div>
      {action && <Reveal delay={0.14}>{action}</Reveal>}
    </div>
  )
}

/* ------------------------------------------------------------------ Stat --- */
export function Stat({ label, value, delta, tone = 'aqua', spark, className }) {
  return (
    <div className={cn('rounded-xl2 border border-white/8 bg-white/[0.02] p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</span>
        {delta != null && (
          <span
            className={cn(
              'tnum rounded-full px-2 py-0.5 text-[11px] font-semibold',
              delta >= 0 ? 'bg-verify-500/14 text-verify-400' : 'bg-danger-500/14 text-danger-400',
            )}
          >
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
      {spark && <Sparkline series={spark} stroke={tone === 'volt' ? '#9a86ff' : tone === 'verify' ? '#4ade80' : '#38d9f0'} />}
    </div>
  )
}

export const ease = [0.16, 1, 0.3, 1]
