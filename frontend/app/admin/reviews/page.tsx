'use client'

import { useEffect, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { adminClient } from '../../../lib/admin-api'

interface Review {
  id: string
  rating: number
  comment: string | null
  isHidden: boolean
  createdAt: string
  consultationId: string
  clientName: string
  consultant: { id: string; name: string }
}

export default function AdminReviewsPage() {
  const [items, setItems] = useState<Review[]>([])
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const PAGE = 50

  function load() {
    setLoading(true)
    const params: any = { limit: PAGE, offset: page * PAGE }
    if (filter === 'visible') params.hidden = 'false'
    if (filter === 'hidden') params.hidden = 'true'
    adminClient()
      .get('/admin/reviews', { params })
      .then((r) => {
        setItems(r.data.items)
        setTotal(r.data.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page])

  async function toggleHide(r: Review) {
    let reason: string | undefined
    if (!r.isHidden) {
      reason = window.prompt('Motivo de ocultar (opcional):') || undefined
    }
    await adminClient().patch(`/admin/reviews/${r.id}/hide`, {
      hidden: !r.isHidden,
      reason,
    })
    load()
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl text-white">Avaliações</h1>
        <p className="text-ink-200/80">
          {total} no total · oculte conteúdo abusivo ou impróprio
        </p>
      </div>

      <Card className="p-4 flex gap-2">
        {(['all', 'visible', 'hidden'] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              setPage(0)
              setFilter(f)
            }}
            className={[
              'px-3 py-1.5 rounded-full text-sm border',
              filter === f
                ? 'bg-mystic-500/30 text-white border-mystic-500/40'
                : 'bg-white/5 text-ink-200 border-white/10',
            ].join(' ')}
          >
            {f === 'all' ? 'Todas' : f === 'visible' ? 'Visíveis' : 'Ocultas'}
          </button>
        ))}
      </Card>

      <div className="space-y-3">
        {loading && <div className="text-ink-300">Carregando…</div>}
        {!loading && items.length === 0 && (
          <Card className="p-8 text-center text-ink-300">
            Nenhuma avaliação.
          </Card>
        )}
        {items.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gold-300 font-semibold">
                    {'★'.repeat(r.rating)}
                    <span className="text-ink-400/40">
                      {'★'.repeat(5 - r.rating)}
                    </span>
                  </span>
                  {r.isHidden && <Badge variant="neutral">Oculta</Badge>}
                </div>
                <p className="text-white text-sm">
                  {r.clientName} → {r.consultant.name}
                </p>
                <p className="text-ink-300 text-xs">
                  {new Date(r.createdAt).toLocaleString('pt-BR')} · atendimento{' '}
                  <span className="font-mono">{r.consultationId.slice(0, 8)}</span>
                </p>
                {r.comment && (
                  <p className="text-ink-100 mt-3 text-sm leading-relaxed bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    "{r.comment}"
                  </p>
                )}
              </div>
              <Button
                variant={r.isHidden ? 'primary' : 'ghost'}
                onClick={() => toggleHide(r)}
              >
                {r.isHidden ? 'Reexibir' : 'Ocultar'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-300">
          Página {page + 1} de {Math.max(1, Math.ceil(total / PAGE))}
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Anterior
          </Button>
          <Button
            variant="ghost"
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE >= total}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  )
}
