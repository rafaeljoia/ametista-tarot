'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Navbar } from '../../../components/Navbar'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Alert } from '../../../components/ui/Alert'

const API = process.env.NEXT_PUBLIC_API_URL || '/api'

interface Order {
  id: string
  clientName: string
  clientEmail: string
  priceCredits: string | number
  status: 'pending' | 'sent' | 'cancelled'
  notes: string | null
  createdAt: string
  sentAt: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  cancelled: 'Cancelado',
}

export default function ConsultorPedidosPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const token = localStorage.getItem('consultant-token')
      if (!token) { router.replace('/consultant-login'); return }
      const { data } = await axios.get(`${API}/consultant/service-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setOrders(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function markSent(o: Order) {
    if (!confirm(`Marcar pedido de ${o.clientName} como enviado?`)) return
    try {
      const token = localStorage.getItem('consultant-token')
      await axios.patch(`${API}/consultant/service-orders/${o.id}/sent`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar pedido')
    }
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar variant="consultant" />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-display text-white">Pedidos de banhos / orações</h1>
          <p className="text-ink-300 text-sm mt-1">
            Quando um cliente solicita indicações ao final de um atendimento, o pedido aparece aqui. Após preparar e enviar o conteúdo por e-mail, marque como enviado.
          </p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Card>
          <div className="p-4">
            {loading ? (
              <p className="text-ink-300 py-6 text-center">Carregando…</p>
            ) : orders.length === 0 ? (
              <p className="text-ink-300 py-6 text-center text-sm">
                Nenhum pedido recebido ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="p-4 rounded-lg bg-ink-900/40 border border-white/[0.04]">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-white font-medium">{o.clientName}</div>
                        <a href={`mailto:${o.clientEmail}`} className="text-sm text-mystic-300 hover:text-white">{o.clientEmail}</a>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-mystic-300">R$ {Number(o.priceCredits).toFixed(2)}</span>
                        <Badge variant={o.status === 'sent' ? 'gold' : 'default'}>
                          {STATUS_LABEL[o.status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-ink-300 mt-2">
                      Solicitado em {new Date(o.createdAt).toLocaleString('pt-BR')}
                      {o.sentAt && ` · enviado em ${new Date(o.sentAt).toLocaleString('pt-BR')}`}
                    </div>
                    {o.status === 'pending' && (
                      <div className="mt-3">
                        <Button size="sm" onClick={() => markSent(o)}>Marcar como enviado</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  )
}
