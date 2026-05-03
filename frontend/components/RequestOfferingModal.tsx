'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Alert } from './ui/Alert'

const API = process.env.NEXT_PUBLIC_API_URL || '/api'

interface Props {
  open: boolean
  onClose: () => void
  consultantId: string
  consultantName: string
  consultationId?: string
  /** Texto livre opcional pra exibir no topo do modal (vindo do admin). */
  introText?: string
  onSuccess?: () => void
}

interface OfferingSettings {
  enabled: boolean
  price: number
  deadlineHours: number
}

export function RequestOfferingModal({
  open,
  onClose,
  consultantId,
  consultantName,
  consultationId,
  introText,
  onSuccess,
}: Props) {
  const [wantBath, setWantBath] = useState(true)
  const [wantPrayer, setWantPrayer] = useState(false)
  const [message, setMessage] = useState('')
  const [settings, setSettings] = useState<OfferingSettings | null>(null)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setWantBath(true)
    setWantPrayer(false)
    setMessage('')
    setStatus('idle')
    setError('')
    axios
      .get(`${API}/offering-settings`)
      .then((r) => setSettings(r.data))
      .catch(() => setSettings({ enabled: true, price: 0, deadlineHours: 24 }))
  }, [open])

  function computeKind(): 'bath' | 'prayer' | 'bath_prayer' | null {
    if (wantBath && wantPrayer) return 'bath_prayer'
    if (wantBath) return 'bath'
    if (wantPrayer) return 'prayer'
    return null
  }

  async function submit() {
    const kind = computeKind()
    if (!kind) {
      setError('Escolha pelo menos uma opção: banho ou oração.')
      setStatus('error')
      return
    }
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

  const kind = computeKind()
  const price = Number(settings?.price ?? 0)

  return (
    <Modal open={open} onClose={onClose} title="Pedir banho e/ou oração" size="md">
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
          {introText && (
            <p className="text-ink-100 leading-relaxed mb-3">{introText}</p>
          )}

          <p className="text-ink-100 text-sm">
            Solicite uma oferenda especial preparada por <strong>{consultantName}</strong>.
            Marque o que deseja receber — pode ser apenas o banho, apenas a oração, ou os
            dois juntos. <strong>Você é cobrado uma única vez</strong> independentemente da
            escolha. O texto chega no seu e-mail e na caixa de entrada da plataforma assim
            que ela enviar.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <label
              className={`flex items-start gap-3 cursor-pointer rounded-xl border p-3 transition-colors ${
                wantBath
                  ? 'border-mystic-400 bg-mystic-500/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <input
                type="checkbox"
                checked={wantBath}
                onChange={(e) => setWantBath(e.target.checked)}
                className="mt-1 w-4 h-4 accent-mystic-500"
              />
              <div>
                <div className="text-white font-medium">Banho</div>
                <div className="text-xs text-ink-300 mt-1 leading-snug">
                  Banho de descarrego/proteção preparado pra você, com instruções de uso.
                </div>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 cursor-pointer rounded-xl border p-3 transition-colors ${
                wantPrayer
                  ? 'border-mystic-400 bg-mystic-500/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <input
                type="checkbox"
                checked={wantPrayer}
                onChange={(e) => setWantPrayer(e.target.checked)}
                className="mt-1 w-4 h-4 accent-mystic-500"
              />
              <div>
                <div className="text-white font-medium">Oração</div>
                <div className="text-xs text-ink-300 mt-1 leading-snug">
                  Oração personalizada feita pelo(a) consultor(a) para sua intenção.
                </div>
              </div>
            </label>
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
              {settings && price > 0 ? (
                <>
                  R$ {price.toFixed(2).replace('.', ',')} debitados do saldo (cobrança
                  única) · Prazo de entrega: {settings.deadlineHours}h
                </>
              ) : settings ? (
                <span className="text-amber-300">
                  Preço da oferenda ainda não configurado pelo administrador.
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} disabled={status === 'sending'}>
                Cancelar
              </Button>
              <Button
                onClick={submit}
                loading={status === 'sending'}
                disabled={!kind || !settings?.enabled || price <= 0}
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
