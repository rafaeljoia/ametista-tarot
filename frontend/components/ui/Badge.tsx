import { ReactNode } from 'react'

type Variant = 'mystic' | 'gold' | 'success' | 'danger' | 'neutral'

const variants: Record<Variant, string> = {
  mystic:  'bg-mystic-500/10 text-mystic-200 border-mystic-400/20',
  gold:    'bg-gold-400/10 text-gold-200 border-gold-400/20',
  success: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20',
  danger:  'bg-red-500/10 text-red-300 border-red-400/20',
  neutral: 'bg-white/[0.04] text-ink-200 border-white/10',
}

export function Badge({
  children,
  variant = 'neutral',
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
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-medium',
        variants[variant],
        className,
      ].join(' ')}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-50" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {children}
    </span>
  )
}
