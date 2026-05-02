import { ReactNode } from 'react'

type Variant = 'info' | 'success' | 'warning' | 'error'

const variants: Record<Variant, string> = {
  info:    'bg-mystic-500/10 border-mystic-400/30 text-mystic-100',
  success: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100',
  warning: 'bg-gold-400/10 border-gold-400/40 text-gold-100',
  error:   'bg-red-500/10 border-red-400/40 text-red-100',
}

const icons: Record<Variant, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '⚠️',
}

export function Alert({
  variant = 'info',
  children,
  className = '',
}: {
  variant?: Variant
  children: ReactNode
  className?: string
}) {
  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-3 px-4 py-3 rounded-xl border text-sm',
        variants[variant],
        className,
      ].join(' ')}
    >
      <span className="leading-tight">{icons[variant]}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}
