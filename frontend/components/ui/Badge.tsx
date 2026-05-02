import { ReactNode } from 'react'

type Variant = 'mystic' | 'gold' | 'success' | 'danger' | 'neutral'

const variants: Record<Variant, string> = {
  mystic: 'bg-mystic-500/15 text-mystic-200 border-mystic-400/30',
  gold:   'bg-gold-400/10 text-gold-200 border-gold-400/30',
  success:'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  danger: 'bg-red-500/15 text-red-300 border-red-400/30',
  neutral:'bg-white/5 text-ink-200 border-white/10',
}

export function Badge({
  children,
  variant = 'mystic',
  pulse = false,
  className = '',
}: {
  children: ReactNode
  variant?: Variant
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium',
        variants[variant],
        className,
      ].join(' ')}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {children}
    </span>
  )
}
