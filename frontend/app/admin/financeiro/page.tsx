'use client'

import { useEffect, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { adminClient } from '../../../lib/admin-api'

interface Commission {
  consultantId: string
  consultantName: string
  consultantEmail: string
  consultations: number
  totalEarned: number
  totalPaid: number
  pending: number
}

interface Payout {
  id: string
  consultantId: string
  consultantName: string
  amount: number
  reference: string | null
  notes: string | null
  paidAt: string
}

export default function AdminFinanceiroPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<Commission | null>(null)
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function load() {
    setLoading(true)
    Promise.all([
      adminClient().get('/admin/finance/commissions'),
      adminClient().get('/admin/finance/payouts'),
    ])
      .then(([c, p]) => {
        setCommissions(c.data)
        setPayouts(p.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  function openPay(c: Commission) {
    setPaying(c)
    setAmount(c.pending.toFixed(2))
    setReference('')
    setNotes('')
  }

  async function submitPayout() {
    if (!paying) return
    setSubmitting(true)
    try {
      await adminClient().post('/admin/finance/payouts', {
        consultantId: paying.consultantId,
        amount: parseFloat(amount),
        reference: reference || undefined,
        notes: notes || undefined,
      })
      setPaying(null)
      load()
    } catch (e: any) {
      alert(e.response?.data?.message || 'Erro ao registrar pagamento')
    } finally {
      setSubmitting(false)
    }
  }

  const totalPending = commissions.reduce((s, c) => s + c.pending, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-white">Financeiro</h1>
        <p className="text-ink-200/80">
          Comissões a pagar:{' '}
          <span className="text-gold-300 font-semibold">
            R$ {totalPending.toFixed(2)}
          </span>
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold">Comissões por consultor</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-ink-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Consultor</th>
                <th className="px-4 py-3 text-right">Atendimentos</th>
                <th className="px-4 py-3 text-right">Ganho total</th>
                <th className="px-4 py-3 text-right">Pago</th>
                <th className="px-4 py-3 text-right">Pendente</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-ink-300">
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading && commissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-ink-300">
                    Sem comissões registradas.
                  </td>
                </tr>
              )}
              {commissions.map((c) => (
                <tr key={c.consultantId} className="text-white">
                  <td className="px-4 py-3">
                    <div>{c.consultantName}</div>
                    <div className="text-ink-300 text-xs">{c.consultantEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-right">{c.consultations}</td>
                  <td className="px-4 py-3 text-right">
                    R$ {c.totalEarned.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-200">
                    R$ {c.totalPaid.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gold-300 font-semibold">
                    R$ {c.pending.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={c.pending <= 0}
                      onClick={() => openPay(c)}
                      className="text-mystic-200 hover:text-white text-xs disabled:opacity-40"
                    >
                      Registrar pagamento
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold">Histórico de pagamentos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-ink-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Consultor</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-left">Referência</th>
                <th className="px-4 py-3 text-left">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-ink-300">
                    Nenhum pagamento registrado.
                  </td>
                </tr>
              )}
              {payouts.map((p) => (
                <tr key={p.id} className="text-white">
                  <td className="px-4 py-3 text-ink-200">
                    {new Date(p.paidAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">{p.consultantName}</td>
                  <td className="px-4 py-3 text-right text-gold-300">
                    R$ {Number(p.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-ink-200">{p.reference || '—'}</td>
                  <td className="px-4 py-3 text-ink-200">{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!paying}
        onClose={() => setPaying(null)}
        title={paying ? `Pagar ${paying.consultantName}` : ''}
      >
        {paying && (
          <div className="space-y-3">
            <div className="text-sm text-ink-200">
              Pendente:{' '}
              <span className="text-gold-300 font-semibold">
                R$ {paying.pending.toFixed(2)}
              </span>
            </div>
            <Input
              label="Valor pago (R$)"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              label="Referência (PIX ID, comprovante etc.)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <div>
              <label className="block text-xs text-ink-300 uppercase tracking-wider mb-1">
                Observações
              </label>
              <textarea
                className="w-full rounded-xl bg-white/5 border border-white/10 text-white px-3 py-2 text-sm"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setPaying(null)}>
                Cancelar
              </Button>
              <Button
                onClick={submitPayout}
                disabled={submitting || !parseFloat(amount)}
              >
                {submitting ? 'Salvando…' : 'Confirmar pagamento'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
