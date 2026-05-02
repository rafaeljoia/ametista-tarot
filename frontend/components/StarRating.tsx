'use client'

import { useState } from 'react'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  readOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: 'text-base',
  md: 'text-2xl',
  lg: 'text-4xl',
}

export function StarRating({
  value,
  onChange,
  readOnly,
  size = 'md',
  className = '',
}: StarRatingProps) {
  const [hover, setHover] = useState(0)
  const display = hover || value

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= display
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange?.(n)}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(0)}
            className={[
              SIZES[size],
              'transition-transform duration-100',
              readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110',
              filled ? 'text-gold-400' : 'text-ink-300/40',
            ].join(' ')}
            aria-label={`${n} estrelas`}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}
