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
  const base = 'rounded-xl border transition-colors duration-150'
  const variants = {
    default:  'bg-ink-800/60 border-white/[0.06]',
    elevated: 'bg-ink-800/80 border-white/[0.08] shadow-soft',
    gold:     'bg-ink-800/60 border-gold-400/20',
  }
  const hover = hoverable ? 'hover:border-white/15 cursor-pointer' : ''

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
