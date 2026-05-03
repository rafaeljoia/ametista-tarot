'use client'

import { ReactNode, useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  hideClose?: boolean
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
}

export function Modal({ open, onClose, title, children, size = 'md', hideClose }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={[
          'w-full bg-ink-800 border border-white/[0.08] rounded-xl shadow-soft p-6 relative',
          sizes[size],
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 className="font-display text-lg font-semibold text-white mb-4 pr-8">{title}</h3>
        )}
        {!hideClose && (
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-md hover:bg-white/[0.06] text-ink-200 flex items-center justify-center transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
