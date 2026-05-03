'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Navbar } from '../../../components/Navbar'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Alert } from '../../../components/ui/Alert'
import { Modal } from '../../../components/ui/Modal'

const API = process.env.NEXT_PUBLIC_API_URL || '/api'

interface Order {
  id: string
  clientName: string
  clientEmail: string
  kind: string
  priceCredits: string | number
  status: 'pending' | 'delivered' | 'sent' | 'expired' | 'cancelled'
  notes: string | null
  requestMessage: string | null
  deliveryText: string | null
  deadlineAt: string | null
  deliveredAt: string | null
  createdAt: string
  sentAt: string | null
}

const KIND_LABEL: Record<string, string> = {
  bath: 'Banho',
  prayer: 'Oração',
  blessing: 'Banhos / orações (post-call)',
}

const STATUS: Record<string, { label: string; variant: 'gold' | 'success' | 'neutral' | 'danger' | 'mystic' }> = {
  pending: { label: 'Aguardando entrega', variant: 'gold' },
  delivered: { label: 'Entregue', variant: 'success' },
  sent: { label: 'Marcado enviado (legado)', variant: 'success' },
  expired: { label: 'Expirado (reembolsado)', variant: 'neutral' },
  cancelled: { label: 'Cancelado', variant: 'neutral' },
}

export default function ConsultorPedidosPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [delivering, setDelivering] = useState<Order | null>(null)
  const [deliveryText, setDeliveryText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

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

  function openDelivery(o: Order) {
    setDelivering(o)
    setDeliveryText('')
    setSubmitError('')
  }

  async function submitDelivery() {
    if (!delivering) return
    if (deliveryText.trim().length < 10) {
      setSubmitError('A mensagem precisa ter ao menos 10 caracteres.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const token = localStorage.getItem('consultant-token')
      await axios.post(
        `${API}/consultant/service-orders/${delivering.id}/deliver`,
        { deliveryText: deliveryText.trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setDelivering(null)
      await load()
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Erro ao enviar.')
    } finally {
      setSubmitting(false)
    }
  }

  async function markSentLegacy(o: Order) {
    if (!confirm(`Marcar pedido de ${o.clientName} como enviado (sem texto)?`)) return
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

  function timeLeft(deadlineAt: string | null): string {
    if (!deadlineAt) return ''
    const ms = new Date(deadlineAt).getTime() - Date.now()
    if (ms <= 0) return 'prazo encerrado'
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    return `restam ${h}h ${m}m`
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar variant="consultant" />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-display text-white">Pedidos de banhos / orações</h1>
          <p className="text-ink-300 text-sm mt-1">
            Quando um cliente solicita uma oferenda, ela aparece aqui. Escreva a entrega e clique em Enviar — o cliente recebe por e-mail e na caixa de entrada da plataforma.
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
                {orders.map((o) => {
                  const st = STATUS[o.status] || STATUS.pending
                  return (
                    <div key={o.id} className="p-4 rounded-lg bg-ink-900/40 border border-white/[0.04]">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="text-white font-medium">
                            {KIND_LABEL[o.kind] || o.kind} · {o.clientName}
                          </div>
                          <a href={`mailto:${o.clientEmail}`} className="text-sm text-mystic-300 hover:text-white">{o.clientEmail}</a>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-mystic-300">R$ {Number(o.priceCredits).toFixed(2)}</span>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </div>
                      </div>
                      <div className="text-xs text-ink-300 mt-2">
                        Solicitado em {new Date(o.createdAt).toLocaleString('pt-BR')}
                        {o.status === 'pending' && o.deadlineAt && (
                          <> · {timeLeft(o.deadlineAt)}</>
                        )}
                        {o.deliveredAt && (
                          <> · entregue em {new Date(o.deliveredAt).toLocaleString('pt-BR')}</>
                        )}
                      </div>
                      {o.requestMessage && (
                        <div className="mt-2 text-xs text-ink-300 italic border-l-2 border-mystic-400/40 pl-3">
                          Intenção do cliente: {o.requestMessage}
                        </div>
                      )}
                      {o.deliveryText && (
                        <div className="mt-3 bg-ink-800/60 border border-white/[0.06] rounded-md p-3">
                          <div className="text-xs text-mystic-300 mb-1 uppercase tracking-wider">Sua entrega</div>
                          <div className="text-ink-100 text-sm whitespace-pre-line leading-relaxed">{o.deliveryText}</div>
                        </div>
                      )}
                      {o.status === 'pending' && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => openDelivery(o)}>
                            Escrever e enviar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => markSentLegacy(o)}>
                            Marcar como enviado (sem texto)
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </main>

      <Modal
        open={!!delivering}
        onClose={() => !submitting && setDelivering(null)}
        title={delivering ? `Entregar ${KIND_LABEL[delivering.kind] || delivering.kind} — ${delivering.clientName}` : ''}
        size="lg"
      >
        {delivering && (
          <>
            {delivering.requestMessage && (
              <div className="mb-3 text-sm text-ink-200 bg-ink-900/40 border border-white/[0.04] rounded p-3">
                <div className="text-xs text-mystic-300 mb-1 uppercase tracking-wider">Intenção do cliente</div>
                {delivering.requestMessage}
              </div>
            )}
            <label className="block text-sm text-ink-200 mb-1">
              Texto da {KIND_LABEL[delivering.kind] || 'oferenda'}
            </label>
            <textarea
              rows={10}
              maxLength={8000}
              value={deliveryText}
              onChange={(e) => setDeliveryText(e.target.value)}
              placeholder="Descreva o banho/oração com instruções claras: ervas, modo de preparo, momento ideal, intenção etc."
              className="w-full bg-ink-900/60 border border-white/10 rounded-md p-3 text-sm text-white placeholder:text-ink-300/60 leading-relaxed"
            />
            <div className="text-xs text-ink-300 mt-1 flex justify-between">
              <span>Mínimo 10, máximo 8000 caracteres.</span>
              <span>{deliveryText.length}/8000</span>
            </div>
            {submitError && <Alert variant="error" className="mt-3">{submitError}</Alert>}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDelivering(null)} disabled={submitting}>
                Cancelar
              </Button>
              <Button onClick={submitDelivery} loading={submitting}>
                Enviar para o cliente
              </Button>
            </div>
            <p className="text-xs text-ink-300 mt-3">
              O cliente recebe por e-mail e na caixa de entrada da plataforma.
            </p>
          </>
        )}
      </Modal>
    </div>
  )
}
