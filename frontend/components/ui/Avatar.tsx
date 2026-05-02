interface AvatarProps {
  name?: string
  src?: string
  emoji?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  online?: boolean
  className?: string
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
  '2xl': 'w-28 h-28 text-3xl',
}

const dotSize = {
  xs: 'w-1.5 h-1.5 ring-1',
  sm: 'w-2 h-2 ring-1',
  md: 'w-2.5 h-2.5 ring-2',
  lg: 'w-3 h-3 ring-2',
  xl: 'w-3.5 h-3.5 ring-2',
  '2xl': 'w-4 h-4 ring-4',
}

function initials(name?: string) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

export function Avatar({
  name,
  src,
  emoji,
  size = 'md',
  online,
  className = '',
}: AvatarProps) {
  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={[
          'rounded-full flex items-center justify-center font-semibold overflow-hidden',
          'bg-gradient-to-br from-mystic-500 to-mystic-800 text-white border border-mystic-300/30 shadow-glow',
          sizes[size],
        ].join(' ')}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name || ''} className="w-full h-full object-cover" />
        ) : emoji ? (
          <span className="leading-none">{emoji}</span>
        ) : (
          <span className="font-display tracking-wide">{initials(name)}</span>
        )}
      </div>
      {online !== undefined && (
        <span
          className={[
            'absolute bottom-0 right-0 rounded-full ring-ink-900',
            online ? 'bg-emerald-400' : 'bg-ink-400',
            dotSize[size],
          ].join(' ')}
        />
      )}
    </div>
  )
}
