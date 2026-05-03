'use client'

import { useEffect, useState } from 'react'
import { adminClient } from '../../../lib/admin-api'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Modal'
import { Alert } from '../../../components/ui/Alert'

interface Consultation {
  id: string
  status: string
  kind: string
  minutesUsed: number
  creditsUsed: number
  startedAt?: string
  endedAt?: string
  client?: { id: string; name: string; email: string } | null
  consultant?: { id: string; name: string } | null
}

interface Message {
  id: string
  content: string
  type: string
  mediaUrl?: string | null
  senderId: string
  senderType: 'user' | 'consultant'
  createdAt: string
}

const KIND_LABEL: Record<string, string> = { chat: 'Chat', voice: 'Voz', video: 'Vídeo' }
const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendado',
  active: 'Em andamento',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
}

export default function AdminConversasPage() {
  const [items, setItems] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [open, setOpen] = useState<Consultation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgLoading, setMsgLoading] = useState(false)

  async function load() {
    setLoading(true); setError('')
    try {
      const { data } = await adminClient().get('/admin/consultations', {
        params: { search: search || undefined, status: statusFilter || undefined, limit: 100 },
      })
      setItems(Array.isArray(data) ? data : data?.items || [])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar atendimentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function openConversation(c: Consultation) {
    setOpen(c)
    setMsgLoading(true)
    setMessages([])
    try {
      const { data } = await adminClient().get<Message[]>(`/admin/consultations/${c.id}/messages`)
      setMessages(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar mensagens')
    } finally {
      setMsgLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-white">Conversas / Logs de atendimento</h1>
        <p className="text-ink-300 text-sm mt-1">
          Histórico completo de atendimentos com acesso ao registro de mensagens entre cliente e consultor.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <div className="p-4 flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do cliente ou consultor"
            className="flex-1 min-w-[240px] bg-ink-900/60 border border-white/10 rounded-md px-3 py-2 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') load() }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-ink-900/60 border border-white/10 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Todos status</option>
            <option value="completed">Finalizados</option>
            <option value="active">Em andamento</option>
            <option value="cancelled">Cancelados</option>
          </select>
          <Button onClick={load} size="sm">Filtrar</Button>
        </div>
      </Card>

      <Card>
        <div className="p-4 overflow-x-auto">
          {loading ? (
            <p className="text-sm text-ink-300 py-6 text-center">Carregando…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-ink-300 uppercase">
                <tr>
                  <th className="text-left py-2 px-2">Cliente</th>
                  <th className="text-left py-2 px-2">Consultor</th>
                  <th className="text-left py-2 px-2">Tipo</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Min</th>
                  <th className="text-left py-2 px-2">Créd.</th>
                  <th className="text-left py-2 px-2">Quando</th>
                  <th className="text-left py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-t border-white/[0.04] hover:bg-white/[0.03]">
                    <td className="py-2 px-2 text-white">{c.client?.name || '—'}</td>
                    <td className="py-2 px-2 text-white">{c.consultant?.name || '—'}</td>
                    <td className="py-2 px-2">
                      <Badge variant="default">{KIND_LABEL[c.kind] || c.kind}</Badge>
                    </td>
                    <td className="py-2 px-2 text-ink-300">{STATUS_LABEL[c.status] || c.status}</td>
                    <td className="py-2 px-2">{Number(c.minutesUsed || 0).toFixed(1)}</td>
                    <td className="py-2 px-2 text-mystic-300">{Number(c.creditsUsed || 0).toFixed(2)}</td>
                    <td className="py-2 px-2 text-ink-300 text-xs">
                      {c.endedAt ? new Date(c.endedAt).toLocaleString('pt-BR') :
                       c.startedAt ? new Date(c.startedAt).toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="py-2 px-2">
                      <button onClick={() => openConversation(c)} className="text-sm text-mystic-300 hover:text-white">Ver conversa</button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-ink-300">Nenhum atendimento encontrado.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {open && (
        <Modal open onClose={() => setOpen(null)} title={`Conversa — ${open.client?.name} × ${open.consultant?.name}`} size="lg">
          <div className="text-xs text-ink-300 mb-3">
            {KIND_LABEL[open.kind]} · {STATUS_LABEL[open.status]} ·
            {open.endedAt ? ` finalizado em ${new Date(open.endedAt).toLocaleString('pt-BR')}` : ''}
          </div>
          {msgLoading ? (
            <p className="text-sm text-ink-300 py-6 text-center">Carregando mensagens…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-ink-300 py-6 text-center">
              Nenhuma mensagem registrada (atendimento por voz/vídeo não gera log de texto).
            </p>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
              {messages.map((m) => {
                const fromConsultant = m.senderType === 'consultant'
                return (
                  <div key={m.id} className={`flex ${fromConsultant ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      fromConsultant ? 'bg-ink-900/60 border border-white/[0.06] text-ink-100' : 'bg-mystic-500/20 text-white'
                    }`}>
                      <div className="text-[10px] uppercase tracking-wider text-ink-300 mb-0.5">
                        {fromConsultant ? open.consultant?.name : open.client?.name} · {new Date(m.createdAt).toLocaleString('pt-BR')}
                      </div>
                      {m.type === 'image' && m.mediaUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.mediaUrl} alt="" className="max-w-[280px] rounded-md" />
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
