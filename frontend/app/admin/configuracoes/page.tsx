'use client'

import { useEffect, useState } from 'react'
import { adminClient } from '../../../lib/admin-api'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Alert } from '../../../components/ui/Alert'
import axios from 'axios'

const API = process.env.NEXT_PUBLIC_API_URL || '/api'

interface Offer {
  enabled: boolean
  price: number
  text: string
}

interface Order {
  id: string
  clientName: string
  clientEmail: string
  consultantName: string
  priceCredits: string | number
  status: string
  createdAt: string
  sentAt: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  cancelled: 'Cancelado',
}

export default function AdminConfigPage() {
  const [offer, setOffer] = useState<Offer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [deadlineHours, setDeadlineHours] = useState<number>(24)
  const [savingDeadline, setSavingDeadline] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    try {
      const [{ data: o }, { data: list }, { data: os }] = await Promise.all([
        axios.get(`${API}/post-call-offer`),
        adminClient().get('/admin/service-orders').catch(() => ({ data: { items: [] } })),
        axios.get(`${API}/offering-settings`).catch(() => ({ data: { deadlineHours: 24 } })),
      ])
      setOffer(o)
      setOrders(list?.items || [])
      setDeadlineHours(Number(os?.deadlineHours) || 24)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar configurações')
    }
  }

  async function saveDeadline() {
    setSavingDeadline(true)
    setError(''); setSuccess('')
    try {
      const { data } = await adminClient().patch('/admin/offering-deadline', { hours: Number(deadlineHours) })
      setDeadlineHours(Number(data?.deadlineHours) || 24)
      setSuccess('Prazo das orientações atualizado')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar prazo')
    } finally {
      setSavingDeadline(false)
    }
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!offer) return
    setLoading(true); setError(''); setSuccess('')
    try {
      const { data } = await adminClient().patch('/admin/post-call-offer', {
        enabled: offer.enabled,
        price: Number(offer.price),
        text: offer.text,
      })
      setOffer(data)
      setSuccess('Configurações salvas com sucesso')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-white">Configurações da plataforma</h1>
        <p className="text-ink-300 text-sm mt-1">
          Recursos extras configuráveis: oferta pós-atendimento, mensagens, etc.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card>
        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-white font-medium">Oferta pós-atendimento — Banhos / Orações</h2>
            <p className="text-xs text-ink-300 mt-1">
              Ao final de cada atendimento, o cliente recebe um modal perguntando se deseja receber por e-mail
              indicações de banhos/orações preparadas pela atendente. O valor é debitado direto do saldo de créditos.
            </p>
          </div>

          {offer && (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={offer.enabled}
                  onChange={(e) => setOffer({ ...offer, enabled: e.target.checked })}
                  className="w-4 h-4 accent-mystic-500"
                />
                <span className="text-white text-sm">Habilitar oferta pós-atendimento</span>
              </label>

              <Input
                label="Valor (em R$ / créditos)"
                type="number"
                step="0.01"
                min="0"
                value={offer.price}
                onChange={(e) => setOffer({ ...offer, price: Number(e.target.value) })}
              />

              <div>
                <label className="block text-sm text-ink-200 mb-1">Texto exibido ao cliente</label>
                <textarea
                  value={offer.text}
                  onChange={(e) => setOffer({ ...offer, text: e.target.value })}
                  rows={4}
                  className="w-full bg-ink-900/60 border border-white/10 rounded-md p-3 text-sm"
                />
                <p className="text-xs text-ink-300 mt-1">
                  Você pode usar <code className="text-mystic-300">{'{{price}}'}</code> e <code className="text-mystic-300">{'{{consultant}}'}</code> que serão substituídos automaticamente.
                </p>
              </div>

              <Button onClick={save} loading={loading}>Salvar configurações</Button>
            </>
          )}
        </div>
      </Card>

      <Card>
        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-white font-medium">Prazo de entrega das orientações</h2>
            <p className="text-xs text-ink-300 mt-1">
              Quanto tempo o(a) consultor(a) tem para entregar uma orientação solicitada antes do pedido expirar e o cliente ser reembolsado automaticamente.
            </p>
          </div>
          <div className="flex items-end gap-3 max-w-sm">
            <Input
              label="Prazo (horas)"
              type="number"
              min="1"
              max="720"
              step="1"
              value={deadlineHours}
              onChange={(e) => setDeadlineHours(Number(e.target.value))}
            />
            <Button onClick={saveDeadline} loading={savingDeadline}>Salvar prazo</Button>
          </div>
          <p className="text-xs text-ink-300">Mínimo 1h, máximo 720h (30 dias). Padrão: 24h.</p>
        </div>
      </Card>

      <Card>
        <div className="p-5">
          <h2 className="text-white font-medium mb-3">Pedidos de banhos/orações recentes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-ink-300 uppercase">
                <tr>
                  <th className="text-left py-2 px-2">Cliente</th>
                  <th className="text-left py-2 px-2">E-mail</th>
                  <th className="text-left py-2 px-2">Consultor</th>
                  <th className="text-left py-2 px-2">Valor</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Criado</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-white/[0.04]">
                    <td className="py-2 px-2 text-white">{o.clientName}</td>
                    <td className="py-2 px-2 text-ink-200">{o.clientEmail}</td>
                    <td className="py-2 px-2">{o.consultantName}</td>
                    <td className="py-2 px-2 text-mystic-300">R$ {Number(o.priceCredits).toFixed(2)}</td>
                    <td className="py-2 px-2">{STATUS_LABEL[o.status] || o.status}</td>
                    <td className="py-2 px-2 text-ink-300 text-xs">{new Date(o.createdAt).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-6 text-ink-300">Nenhum pedido registrado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  )
}
