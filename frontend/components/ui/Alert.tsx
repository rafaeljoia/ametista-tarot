import { ReactNode } from 'react'

type Variant = 'info' | 'success' | 'warning' | 'error'

const variants: Record<Variant, string> = {
  info:    'bg-mystic-500/[0.07] border-mystic-400/20 text-mystic-100',
  success: 'bg-emerald-500/[0.07] border-emerald-400/20 text-emerald-100',
  warning: 'bg-gold-400/[0.07] border-gold-400/25 text-gold-100',
  error:   'bg-red-500/[0.07] border-red-400/25 text-red-100',
}

const Icon: Record<Variant, () => JSX.Element> = {
  info: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
    </svg>
  ),
  success: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  warning: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  ),
  error: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
    </svg>
  ),
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
  const I = Icon[variant]
  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-3 px-4 py-3 rounded-lg border text-sm',
        variants[variant],
        className,
      ].join(' ')}
    >
      <span className="mt-0.5 shrink-0"><I /></span>
      <div className="flex-1">{children}</div>
    </div>
  )
}
