'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { StarRating } from './StarRating'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface Props {
  consultationId: string
  consultantName?: string
  onSubmitted?: () => void
}

interface ExistingReview {
  id: string
  rating: number
  comment: string | null
  createdAt: string
}

export function ReviewForm({ consultationId, consultantName, onSubmitted }: Props) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existing, setExisting] = useState<ExistingReview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    axios
      .get(`${API}/consultations/${consultationId}/review`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => {
        if (r.data) {
          setExisting(r.data)
          setRating(r.data.rating)
          setComment(r.data.comment || '')
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [consultationId])

  async function submit() {
    setError(null)
    if (rating < 1) {
      setError('Selecione de 1 a 5 estrelas')
      return
    }
    setSubmitting(true)
    const token = localStorage.getItem('token')
    try {
      const r = await axios.post(
        `${API}/consultations/${consultationId}/review`,
        { rating, comment: comment.trim() || undefined },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setExisting(r.data)
      onSubmitted?.()
    } catch (e: any) {
      setError(e.response?.data?.message || 'Não foi possível enviar a avaliação.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  if (existing) {
    return (
      <Card className="p-6 text-center">
        <p className="text-ink-200 text-sm">Sua avaliação enviada</p>
        <div className="my-3 flex justify-center">
          <StarRating value={existing.rating} readOnly size="lg" />
        </div>
        {existing.comment && (
          <p className="text-ink-100 italic mt-2">"{existing.comment}"</p>
        )}
        <p className="text-ink-300 text-xs mt-3">Obrigado pelo seu feedback!</p>
      </Card>
    )
  }

  return (
    <Card variant="elevated" className="p-6 text-center">
      <h3 className="font-display text-xl text-white">
        Como foi sua consulta{consultantName ? ` com ${consultantName}` : ''}?
      </h3>
      <p className="text-ink-200/80 text-sm mt-1">
        Sua avaliação ajuda outros clientes a escolher.
      </p>

      <div className="my-5 flex justify-center">
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 1000))}
        placeholder="Deixe um comentário (opcional)…"
        rows={3}
        className="w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-ink-300/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-mystic-400 resize-none"
      />
      <div className="text-right text-xs text-ink-300/60 mt-1">
        {comment.length}/1000
      </div>

      {error && <p className="text-red-300 text-sm mt-3">{error}</p>}

      <Button
        onClick={submit}
        disabled={submitting || rating < 1}
        className="w-full mt-4"
      >
        {submitting ? 'Enviando…' : 'Enviar avaliação'}
      </Button>
    </Card>
  )
}
