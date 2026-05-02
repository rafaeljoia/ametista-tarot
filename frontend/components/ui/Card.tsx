import { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: 'default' | 'elevated' | 'gold'
  hoverable?: boolean
}

export function Card({
  children,
  variant = 'default',
  hoverable = false,
  className = '',
  ...rest
}: CardProps) {
  const base = 'rounded-2xl border backdrop-blur-xl transition-all duration-300'
  const variants = {
    default: 'bg-white/[0.04] border-white/10 shadow-soft',
    elevated: 'bg-gradient-to-br from-white/[0.07] to-white/[0.02] border-white/15 shadow-soft',
    gold: 'bg-white/[0.04] border-gold-400/30 shadow-gold',
  }
  const hover = hoverable
    ? 'hover:border-mystic-400/50 hover:shadow-glow hover:-translate-y-0.5 cursor-pointer'
    : ''

  return (
    <div className={[base, variants[variant], hover, className].join(' ')} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 pt-6 pb-3 ${className}`}>{children}</div>
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 pb-6 pt-3 ${className}`}>{children}</div>
}
