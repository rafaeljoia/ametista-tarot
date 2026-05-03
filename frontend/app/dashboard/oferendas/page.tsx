'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Navbar } from '../../../components/Navbar'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { Alert } from '../../../components/ui/Alert'
import { PageLoader } from '../../../components/ui/Spinner'

const API = process.env.NEXT_PUBLIC_API_URL || '/api'

interface Order {
  id: string
  consultantName: string
  kind: string
  priceCredits: string | number
  status: 'pending' | 'delivered' | 'sent' | 'expired' | 'cancelled'
  requestMessage: string | null
  deliveryText: string | null
  deadlineAt: string | null
  deliveredAt: string | null
  createdAt: string
}

const KIND_LABEL: Record<string, string> = {
  bath: 'Banho',
  prayer: 'Oração',
  bath_prayer: 'Banho e Oração',
  blessing: 'Banhos / orações',
}

const STATUS: Record<string, { label: string; variant: 'gold' | 'success' | 'neutral' | 'danger' | 'mystic' }> = {
  pending: { label: 'Aguardando entrega', variant: 'gold' },
  delivered: { label: 'Entregue', variant: 'success' },
  sent: { label: 'Entregue', variant: 'success' },
  expired: { label: 'Expirado (reembolsado)', variant: 'neutral' },
  cancelled: { label: 'Cancelado', variant: 'neutral' },
}

export default function MinhasOferendasPage() {
  const router = useRouter()
  const [items, setItems] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.replace('/login')
      return
    }
    axios
      .get(`${API}/me/service-orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setItems(r.data?.items || []))
      .catch((e) => setError(e.response?.data?.message || 'Erro ao carregar oferendas'))
      .finally(() => setLoading(false))
  }, [router])

  function timeLeft(deadlineAt: string | null): string {
    if (!deadlineAt) return ''
    const ms = new Date(deadlineAt).getTime() - Date.now()
    if (ms <= 0) return 'prazo encerrado'
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    return `restam ${h}h ${m}m`
  }

  if (loading) return <PageLoader label="Carregando oferendas…" />

  return (
    <div className="min-h-screen bg-ink-900">
      <Navbar variant="client" />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-display text-white">Minhas oferendas</h1>
          <p className="text-ink-300 text-sm mt-1">
            Banhos e orações solicitados aos consultores. As entregas chegam aqui e por e-mail.
          </p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {items.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-ink-300 text-sm">
              Você ainda não solicitou nenhum banho ou oração. Acesse o perfil de um consultor
              para fazer um pedido.
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((o) => {
              const st = STATUS[o.status] || STATUS.pending
              return (
                <Card key={o.id}>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-white font-medium">
                          {KIND_LABEL[o.kind] || o.kind} · {o.consultantName}
                        </div>
                        <div className="text-xs text-ink-300 mt-1">
                          Pedido em {new Date(o.createdAt).toLocaleString('pt-BR')}
                          {o.status === 'pending' && o.deadlineAt && (
                            <> · {timeLeft(o.deadlineAt)}</>
                          )}
                          {o.deliveredAt && (
                            <> · entregue em {new Date(o.deliveredAt).toLocaleString('pt-BR')}</>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-mystic-300 text-sm">
                          R$ {Number(o.priceCredits).toFixed(2)}
                        </span>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                    </div>

                    {o.requestMessage && (
                      <div className="text-xs text-ink-300 italic border-l-2 border-mystic-400/40 pl-3">
                        Sua intenção: {o.requestMessage}
                      </div>
                    )}

                    {o.deliveryText && (
                      <div className="bg-ink-800/60 border border-white/[0.06] rounded-lg p-4">
                        <div className="text-xs text-mystic-300 mb-2 uppercase tracking-wider">
                          Entrega de {o.consultantName}
                        </div>
                        <div className="text-ink-100 text-sm whitespace-pre-line leading-relaxed">
                          {o.deliveryText}
                        </div>
                      </div>
                    )}

                    {o.status === 'pending' && (
                      <p className="text-xs text-ink-300">
                        O(a) consultor(a) vai preparar e enviar até o prazo. Você será avisado(a) por e-mail e aqui.
                      </p>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
