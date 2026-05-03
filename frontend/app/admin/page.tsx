'use client'

import { useEffect, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { adminClient } from '../../lib/admin-api'

interface Stats {
  period: string
  revenueGross: number
  revenueNet: number
  transactions: number
  consultations: number
  consultantEarningsTotal: number
  platformCutTotal: number
}

interface ReviewStats {
  averageRating: number
  totalReviews: number
  hiddenReviews: number
}

const PERIODS = [
  { key: 'day', label: 'Hoje' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'all', label: 'Total' },
] as const

export default function AdminDashboard() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'all'>('month')
  const [stats, setStats] = useState<Stats | null>(null)
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      adminClient().get(`/admin/stats?period=${period}`),
      adminClient().get('/admin/reviews/stats/overall'),
    ])
      .then(([s, r]) => {
        setStats(s.data)
        setReviewStats(r.data)
      })
      .finally(() => setLoading(false))
  }, [period])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-white">Visão geral</h1>
          <p className="text-ink-200/80">Indicadores principais da plataforma.</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={[
                'px-3 py-1.5 rounded-full text-sm border',
                period === p.key
                  ? 'bg-mystic-500/30 text-white border-mystic-500/40'
                  : 'bg-white/5 text-ink-200 border-white/10 hover:text-white',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !stats ? (
        <div className="text-ink-200">Carregando…</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI
              label="Receita bruta"
              value={`R$ ${stats.revenueGross.toFixed(2)}`}
              accent="gold"
            />
            <KPI label="Receita líquida" value={`R$ ${stats.revenueNet.toFixed(2)}`} />
            <KPI label="Transações aprovadas" value={stats.transactions} />
            <KPI label="Atendimentos concluídas" value={stats.consultations} />
            <KPI
              label="Comissões a consultores"
              value={`R$ ${stats.consultantEarningsTotal.toFixed(2)}`}
            />
            <KPI
              label="Receita da plataforma"
              value={`R$ ${stats.platformCutTotal.toFixed(2)}`}
              accent="gold"
            />
            <KPI
              label="Avaliação média"
              value={`★ ${reviewStats?.averageRating.toFixed(2) ?? '—'}`}
              accent="gold"
            />
            <KPI
              label="Avaliações"
              value={
                <>
                  {reviewStats?.totalReviews ?? 0}
                  {reviewStats?.hiddenReviews ? (
                    <span className="text-xs text-red-300 ml-2">
                      ({reviewStats.hiddenReviews} ocultas)
                    </span>
                  ) : null}
                </>
              }
            />
          </div>

          <Card className="p-6">
            <h2 className="text-white font-semibold mb-2">Notas</h2>
            <p className="text-ink-200 text-sm">
              Receita líquida desconta as taxas do Mercado Pago. Comissões refletem o
              valor a pagar aos consultores antes de eventuais saques registrados em
              <Badge variant="mystic" className="mx-1">Financeiro</Badge>.
            </p>
          </Card>
        </>
      )}
    </div>
  )
}

function KPI({
  label,
  value,
  accent,
}: {
  label: string
  value: React.ReactNode
  accent?: 'gold'
}) {
  return (
    <Card className="p-5">
      <p className="text-ink-300 text-xs uppercase tracking-wider">{label}</p>
      <p
        className={`font-display text-2xl mt-1 ${
          accent === 'gold' ? 'text-gradient-gold' : 'text-white'
        }`}
      >
        {value}
      </p>
    </Card>
  )
}
