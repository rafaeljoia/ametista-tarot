import Link from 'next/link'

export function Logo({
  size = 'md',
  href = '/',
  showText = true,
}: {
  size?: 'sm' | 'md' | 'lg'
  href?: string
  showText?: boolean
}) {
  const mark = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  }[size]

  const text = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  }[size]

  return (
    <Link href={href} className="inline-flex items-center gap-2.5 group">
      {/* Geometric monogram — quiet, premium, no emoji. */}
      <span
        className={[
          'relative inline-flex items-center justify-center rounded-xl',
          'bg-gradient-to-br from-mystic-500 to-mystic-700',
          'ring-1 ring-white/10',
          mark,
        ].join(' ')}
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="w-1/2 h-1/2 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2 L20 8 L17 21 L7 21 L4 8 Z" />
          <path d="M4 8 L20 8" />
          <path d="M9 8 L12 21 L15 8" />
        </svg>
      </span>
      {showText && (
        <span className={`font-display font-medium tracking-tight text-white ${text}`}>
          Ametista <span className="text-ink-200">Tarot</span>
        </span>
      )}
    </Link>
  )
}
