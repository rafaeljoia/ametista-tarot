'use client'

import Link from 'next/link'
import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'

type Variant = 'primary' | 'gold' | 'ghost' | 'outline' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap'

const variants: Record<Variant, string> = {
  primary:
    'bg-mystic-600 hover:bg-mystic-500 text-white ring-1 ring-inset ring-white/10 focus-visible:ring-mystic-400',
  gold:
    'bg-gold-400 hover:bg-gold-300 text-ink-900 ring-1 ring-inset ring-black/10 focus-visible:ring-gold-400',
  ghost:
    'bg-transparent hover:bg-white/[0.06] text-ink-100 focus-visible:ring-mystic-400',
  outline:
    'bg-transparent border border-white/15 hover:border-white/25 hover:bg-white/[0.03] text-ink-100 focus-visible:ring-mystic-400',
  danger:
    'bg-red-600 hover:bg-red-500 text-white focus-visible:ring-red-400',
  success:
    'bg-emerald-600 hover:bg-emerald-500 text-white focus-visible:ring-emerald-400',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-[15px]',
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
