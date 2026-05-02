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
  const dot = {
    sm: 'w-7 h-7 text-base',
    md: 'w-9 h-9 text-lg',
    lg: 'w-14 h-14 text-2xl',
  }[size]

  const text = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  }[size]

  return (
    <Link href={href} className="inline-flex items-center gap-2.5 group">
      <div
        className={[
          'rounded-xl flex items-center justify-center',
          'bg-gradient-to-br from-mystic-400 via-mystic-500 to-mystic-700',
          'shadow-glow group-hover:scale-105 transition-transform',
          dot,
        ].join(' ')}
      >
        <span>✦</span>
      </div>
      {showText && (
        <span className={`font-display tracking-wide text-white ${text}`}>
          Ametista <span className="text-gradient-gold">Tarot</span>
        </span>
      )}
    </Link>
  )
}
