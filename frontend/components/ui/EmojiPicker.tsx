'use client'

import { useEffect, useRef, useState } from 'react'

const EMOJI_GROUPS: { label: string; items: string[] }[] = [
  {
    label: 'Frequentes',
    items: ['😀', '😂', '🥰', '😍', '😘', '🤗', '🤔', '😢', '😭', '😡', '👍', '👎', '🙏', '🙌', '👏', '✨'],
  },
  {
    label: 'Místico',
    items: ['🔮', '🌙', '⭐', '🌟', '💫', '✨', '🪐', '☀️', '🌈', '🃏', '🎴', '♠️', '♥️', '♦️', '♣️', '🕯️'],
  },
  {
    label: 'Emoções',
    items: ['😊', '😇', '🥳', '😎', '🤩', '😴', '😌', '🙂', '😞', '😔', '😟', '😩', '🤯', '😱', '🥺', '😤'],
  },
  {
    label: 'Coração',
    items: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💗', '💓', '💞', '💕', '💘', '💝', '💟'],
  },
  {
    label: 'Gestos',
    items: ['👋', '🤝', '👌', '✌️', '🤞', '🤟', '🤘', '👈', '👉', '👆', '👇', '✊', '🙋', '💪', '🫶', '🫂'],
  },
  {
    label: 'Símbolos',
    items: ['✅', '❌', '⚠️', '❓', '❗', '💯', '🔥', '⚡', '💎', '🎁', '🎉', '🎊', '🏆', '🥇', '📌', '⏰'],
  },
]

export function EmojiPicker({
  open,
  onSelect,
  onClose,
  anchorClassName = '',
}: {
  open: boolean
  onSelect: (emoji: string) => void
  onClose: () => void
  anchorClassName?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [activeGroup, setActiveGroup] = useState(0)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={`absolute z-30 bottom-full mb-2 left-0 w-80 max-w-[90vw] bg-ink-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden ${anchorClassName}`}
    >
      <div className="flex border-b border-white/10 overflow-x-auto">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.label}
            type="button"
            onClick={() => setActiveGroup(i)}
            className={[
              'px-3 py-2 text-xs whitespace-nowrap transition',
              activeGroup === i
                ? 'text-white border-b-2 border-mystic-400'
                : 'text-ink-300 hover:text-white',
            ].join(' ')}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="p-3 max-h-56 overflow-y-auto grid grid-cols-8 gap-1">
        {EMOJI_GROUPS[activeGroup].items.map((emoji, i) => (
          <button
            key={`${activeGroup}-${i}`}
            type="button"
            onClick={() => {
              onSelect(emoji)
            }}
            className="text-xl p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
