'use client'

import { useEffect, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { ExportButtons } from '../../../components/ui/ExportButtons'
import { adminClient } from '../../../lib/admin-api'

interface Consultation {
  id: string
  clientId: string
  clientName: string | null
  consultantId: string
  consultantName: string | null
  status: string
  minutesUsed: number
  creditsUsed: number
  startedAt: string | null
  endedAt: string | null
  createdAt: string
}

interface Message {
  id: string
  senderId: string
  recipientId: string
  content: string
  type: 'text' | 'image' | 'audio'
  mediaUrl: string | null
  createdAt: string
}

const STATUS_VARIANT: Record<string, 'success' | 'gold' | 'neutral' | 'mystic'> = {
  completed: 'success',
  active: 'gold',
  scheduled: 'mystic',
  cancelled: 'neutral',
}

export default function AdminConsultasPage() {
  const [items, setItems] = useState<Consultation[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<Consultation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMsg, setLoadingMsg] = useState(false)
  const PAGE = 50

  function load() {
    setLoading(true)
    adminClient()
      .get('/admin/consultations', {
        params: {
          status: status || undefined,
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
  }, [status, page])

  async function viewMessages(c: Consultation) {
    setViewing(c)
    setLoadingMsg(true)
    setMessages([])
    try {
      const r = await adminClient().get(`/admin/consultations/${c.id}/messages`)
      setMessages(r.data.messages)
    } finally {
      setLoadingMsg(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="font-display text-3xl text-white">Atendimentos</h1>
          <p className="text-ink-200/80">{total} no total · somente leitura</p>
        </div>
        <ExportButtons
          data={items}
          filename={`atendimentos-${new Date().toISOString().slice(0, 10)}`}
          title="Atendimentos"
          columns={[
            { header: 'Data', accessor: (c: any) => c.startedAt ? new Date(c.startedAt).toLocaleString('pt-BR') : '—', width: 18 },
            { header: 'Cliente', accessor: (c: any) => c.clientName || c.userName || '—', width: 24 },
            { header: 'Consultor', accessor: (c: any) => c.consultantName || '—', width: 24 },
            { header: 'Tipo', accessor: (c: any) => c.kind || 'chat' },
            { header: 'Status', accessor: (c: any) => c.status },
            { header: 'Minutos', accessor: (c: any) => c.durationMinutes || c.minutes || 0 },
            { header: 'Cobrado (R$)', accessor: (c: any) => Number(c.totalCharged || c.charged || 0).toFixed(2) },
          ]}
        />
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
          <option value="completed">Concluídas</option>
          <option value="active">Em andamento</option>
          <option value="scheduled">Agendadas</option>
          <option value="cancelled">Canceladas</option>
        </select>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-ink-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Consultor</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Min</th>
                <th className="px-4 py-3 text-right">Cobrado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-ink-300">
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-ink-300">
                    Nenhuma atendimento.
                  </td>
                </tr>
              )}
              {items.map((c) => (
                <tr key={c.id} className="text-white">
                  <td className="px-4 py-3 text-ink-200 text-xs">
                    {new Date(c.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">{c.clientName || '—'}</td>
                  <td className="px-4 py-3">{c.consultantName || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={STATUS_VARIANT[c.status] || 'neutral'}>
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {Number(c.minutesUsed).toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right text-gold-300">
                    R$ {Number(c.creditsUsed).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-mystic-200 hover:text-white text-xs"
                      onClick={() => viewMessages(c)}
                    >
                      Ver mensagens
                    </button>
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

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={
          viewing
            ? `Mensagens · ${viewing.clientName} ↔ ${viewing.consultantName}`
            : ''
        }
      >
        {viewing && (
          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
            {loadingMsg && (
              <p className="text-ink-300 text-sm">Carregando mensagens…</p>
            )}
            {!loadingMsg && messages.length === 0 && (
              <p className="text-ink-300 text-sm">Nenhuma mensagem.</p>
            )}
            {messages.map((m) => {
              const fromConsultant = m.senderId === viewing.consultantId
              return (
                <div
                  key={m.id}
                  className={[
                    'rounded-xl px-3 py-2 text-sm',
                    fromConsultant
                      ? 'bg-mystic-500/10 border border-mystic-500/20 text-white'
                      : 'bg-white/5 border border-white/10 text-ink-100',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-3 text-xs text-ink-300 mb-1">
                    <span className="font-semibold">
                      {fromConsultant ? viewing.consultantName : viewing.clientName}
                    </span>
                    <span>{new Date(m.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                  {m.type === 'image' && m.mediaUrl ? (
                    <img
                      src={m.mediaUrl}
                      alt="anexo"
                      className="max-h-48 rounded-lg"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Modal>
    </div>
  )
}
