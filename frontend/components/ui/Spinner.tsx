interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

const sizes = { sm: 'w-5 h-5 border-2', md: 'w-8 h-8 border-[3px]', lg: 'w-12 h-12 border-4' }

export function Spinner({ size = 'md', label, className = '' }: SpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={[
          'rounded-full border-mystic-300/30 border-t-mystic-400 animate-spin',
          sizes[size],
        ].join(' ')}
      />
      {label && <p className="text-sm text-ink-200/80">{label}</p>}
    </div>
  )
}

export function PageLoader({ label = 'Carregando…' }: { label?: string }) {
  return (
    <main className="min-h-screen bg-mystic-gradient flex items-center justify-center">
      <Spinner size="lg" label={label} />
    </main>
  )
}
