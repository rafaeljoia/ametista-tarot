'use client'

import { useEffect, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { adminClient } from '../../../lib/admin-api'

interface Transaction {
  id: string
  userId: string
  userName: string | null
  userEmail: string | null
  packageId: string
  gross: number
  net: number
  creditsAmount: number
  method: 'pix' | 'card'
  status: string
  gatewayId: string | null
  creditedAt: string | null
  createdAt: string
}

const STATUS_VARIANT: Record<string, 'success' | 'gold' | 'neutral' | 'mystic'> = {
  approved: 'success',
  pending: 'gold',
  rejected: 'neutral',
  refunded: 'mystic',
  cancelled: 'neutral',
}

export default function AdminTransacoesPage() {
  const [items, setItems] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const PAGE = 50

  function load() {
    setLoading(true)
    adminClient()
      .get('/admin/transactions', {
        params: {
          status: status || undefined,
          method: method || undefined,
          limit: PAGE,
          offset: page * PAGE,
        },
      })
      .then((r) => {
        setItems(r.data.items)
        setTotal(r.data.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, method, page])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl text-white">Transações</h1>
        <p className="text-ink-200/80">{total} no total</p>
      </div>

      <Card className="p-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => {
            setPage(0)
            setStatus(e.target.value)
          }}
          className="bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm"
        >
          <option value="">Todos status</option>
          <option value="approved">Aprovadas</option>
          <option value="pending">Pendentes</option>
          <option value="rejected">Rejeitadas</option>
          <option value="refunded">Reembolsadas</option>
          <option value="cancelled">Canceladas</option>
        </select>
        <select
          value={method}
          onChange={(e) => {
            setPage(0)
            setMethod(e.target.value)
          }}
          className="bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm"
        >
          <option value="">Todos métodos</option>
          <option value="pix">PIX</option>
          <option value="card">Cartão</option>
        </select>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-ink-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Usuário</th>
                <th className="px-4 py-3 text-left">Pacote</th>
                <th className="px-4 py-3 text-left">Método</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Bruto</th>
                <th className="px-4 py-3 text-right">Líquido</th>
                <th className="px-4 py-3 text-right">Créditos</th>
                <th className="px-4 py-3 text-left">Gateway ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-ink-300">
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-ink-300">
                    Nenhuma transação.
                  </td>
                </tr>
              )}
              {items.map((t) => (
                <tr key={t.id} className="text-white">
                  <td className="px-4 py-3 text-ink-200 text-xs">
                    {new Date(t.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div>{t.userName || '—'}</div>
                    <div className="text-ink-300 text-xs">{t.userEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-200">{t.packageId}</td>
                  <td className="px-4 py-3 uppercase text-xs">{t.method}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={STATUS_VARIANT[t.status] || 'neutral'}>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">R$ {Number(t.gross).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">R$ {Number(t.net).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gold-300">
                    {t.creditsAmount}
                  </td>
                  <td className="px-4 py-3 text-ink-300 text-xs font-mono">
                    {t.gatewayId || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

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
