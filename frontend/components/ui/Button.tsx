'use client'

import Link from 'next/link'
import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'

type Variant = 'primary' | 'gold' | 'ghost' | 'outline' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap'

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-mystic-500 to-mystic-700 hover:from-mystic-400 hover:to-mystic-600 text-white shadow-glow focus-visible:ring-mystic-400',
  gold:
    'bg-gold-gradient text-ink-900 hover:brightness-110 shadow-gold focus-visible:ring-gold-400',
  ghost:
    'bg-white/5 hover:bg-white/10 text-mystic-100 focus-visible:ring-mystic-400',
  outline:
    'bg-transparent border border-mystic-400/40 hover:bg-mystic-500/10 text-mystic-100 focus-visible:ring-mystic-400',
  danger:
    'bg-red-600/90 hover:bg-red-600 text-white focus-visible:ring-red-400',
  success:
    'bg-emerald-600/90 hover:bg-emerald-600 text-white focus-visible:ring-emerald-400',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
}

interface CommonProps {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
  loading?: boolean
  fullWidth?: boolean
}

interface ButtonProps
  extends CommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', children, loading, fullWidth, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={[base, variants[variant], sizes[size], fullWidth ? 'w-full' : '', className].join(' ')}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  )
})

interface LinkButtonProps extends CommonProps {
  href: string
  target?: string
}

export function LinkButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  fullWidth,
  href,
  target,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      target={target}
      className={[base, variants[variant], sizes[size], fullWidth ? 'w-full' : '', className].join(' ')}
    >
      {children}
    </Link>
  )
}
