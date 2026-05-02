'use client'

import { forwardRef, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  icon?: ReactNode
  endAdornment?: ReactNode
}

const fieldBase =
  'w-full px-4 py-2.5 bg-ink-900/60 border rounded-xl text-white placeholder-ink-300/60 focus:outline-none transition-all duration-200'

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, icon, endAdornment, className = '', id, ...rest },
  ref,
) {
  const inputId = id || rest.name || undefined
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-mystic-100/90">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-mystic-300/70 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          className={[
            fieldBase,
            icon ? 'pl-10' : '',
            endAdornment ? 'pr-10' : '',
            error
              ? 'border-red-400/60 focus:border-red-400 focus:ring-2 focus:ring-red-400/30'
              : 'border-white/10 focus:border-mystic-400 focus:ring-2 focus:ring-mystic-400/30',
            className,
          ].join(' ')}
          {...rest}
        />
        {endAdornment && (
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-mystic-300/70">
            {endAdornment}
          </span>
        )}
      </div>
      {(error || hint) && (
        <p className={`text-xs ${error ? 'text-red-300' : 'text-ink-300/70'}`}>
          {error || hint}
        </p>
      )}
    </div>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className = '', id, ...rest },
  ref,
) {
  const inputId = id || rest.name || undefined
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-mystic-100/90">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        ref={ref}
        className={[
          fieldBase,
          'resize-y min-h-[100px]',
          error
            ? 'border-red-400/60 focus:border-red-400 focus:ring-2 focus:ring-red-400/30'
            : 'border-white/10 focus:border-mystic-400 focus:ring-2 focus:ring-mystic-400/30',
          className,
        ].join(' ')}
        {...rest}
      />
      {(error || hint) && (
        <p className={`text-xs ${error ? 'text-red-300' : 'text-ink-300/70'}`}>
          {error || hint}
        </p>
      )}
    </div>
  )
})
