'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Alert } from './ui/Alert'

const API = process.env.NEXT_PUBLIC_API_URL || '/api'

type Kind = 'bath' | 'prayer'

interface Props {
  open: boolean
  onClose: () => void
  consultantId: string
  consultantName: string
  consultationId?: string
  onSuccess?: () => void
}

interface OfferingSettings {
  enabled: boolean
  price: number
  deadlineHours: number
}

const KIND_LABEL: Record<Kind, string> = {
  bath: 'Banho',
  prayer: 'Oração',
}

const KIND_DESC: Record<Kind, string> = {
  bath: 'Receba um banho de descarrego/proteção preparado especialmente para você, com instruções de uso.',
  prayer: 'Receba uma oração personalizada feita pelo(a) consultor(a) para sua intenção.',
}

export function RequestOfferingModal({
  open,
  onClose,
  consultantId,
  consultantName,
  consultationId,
  onSuccess,
}: Props) {
  const [kind, setKind] = useState<Kind>('bath')
  const [message, setMessage] = useState('')
  const [settings, setSettings] = useState<OfferingSettings | null>(null)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setKind('bath')
    setMessage('')
    setStatus('idle')
    setError('')
    axios
      .get(`${API}/offering-settings`)
      .then((r) => setSettings(r.data))
      .catch(() => setSettings({ enabled: true, price: 0, deadlineHours: 24 }))
  }, [open])

  async function submit() {
    setStatus('sending')
    setError('')
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Faça login para solicitar.')
        setStatus('error')
        return
      }
      await axios.post(
        `${API}/service-orders/request`,
        {
          consultantId,
          kind,
          consultationId: consultationId || undefined,
          message: message.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setStatus('success')
      onSuccess?.()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível processar o pedido.')
      setStatus('error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Pedir banho ou oração" size="md">
      {status === 'success' ? (
        <>
          <Alert variant="success">
            Pedido enviado! {consultantName} tem até {settings?.deadlineHours ?? 24}h para
            preparar e enviar. Você receberá por e-mail e na sua caixa de entrada da plataforma.
          </Alert>
          <div className="mt-4 flex justify-end">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </>
      ) : (
        <>
          {settings && !settings.enabled && (
            <Alert variant="warning">
              Esta plataforma está temporariamente sem oferendas disponíveis.
            </Alert>
          )}

          <p className="text-ink-100 text-sm">
            Solicite uma oferenda especial preparada por <strong>{consultantName}</strong>.
            O texto chega no seu e-mail e na caixa de entrada da plataforma assim que ela enviar.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {(['bath', 'prayer'] as Kind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`text-left rounded-xl border p-3 transition-colors ${
                  kind === k
                    ? 'border-mystic-400 bg-mystic-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-white font-medium">{KIND_LABEL[k]}</div>
                <div className="text-xs text-ink-300 mt-1 leading-snug">{KIND_DESC[k]}</div>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-sm text-ink-200 mb-1">
              Sua intenção (opcional)
            </label>
            <textarea
              rows={3}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex.: para proteção espiritual, abertura de caminhos, harmonia familiar…"
              className="w-full bg-ink-900/60 border border-white/10 rounded-md p-3 text-sm text-white placeholder:text-ink-300/60"
            />
          </div>

          {error && <Alert variant="error" className="mt-3">{error}</Alert>}

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-ink-300">
              {settings && (
                <>
                  R$ {Number(settings.price).toFixed(2).replace('.', ',')} debitados do saldo ·
                  Prazo de entrega: {settings.deadlineHours}h
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} disabled={status === 'sending'}>
                Cancelar
              </Button>
              <Button
                onClick={submit}
                loading={status === 'sending'}
                disabled={!settings?.enabled}
              >
                Confirmar pedido
              </Button>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
