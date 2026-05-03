'use client'

import { useEffect, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { adminClient } from '../../../lib/admin-api'

interface Pricing {
  chat: number
  voice: number
  video: number
}

export default function AdminPricingPage() {
  const [data, setData] = useState<Pricing | null>(null)
  const [chat, setChat] = useState('')
  const [voice, setVoice] = useState('')
  const [video, setVideo] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  function load() {
    setLoading(true)
    adminClient()
      .get('/admin/pricing')
      .then((r) => {
        const p: Pricing = {
          chat: Number(r.data.chat),
          voice: Number(r.data.voice),
          video: Number(r.data.video),
        }
        setData(p)
        setChat(p.chat.toFixed(2))
        setVoice(p.voice.toFixed(2))
        setVideo(p.video.toFixed(2))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)
    try {
      const payload = {
        chat: parseFloat(chat.replace(',', '.')),
        voice: parseFloat(voice.replace(',', '.')),
        video: parseFloat(video.replace(',', '.')),
      }
      if (
        !Number.isFinite(payload.chat) ||
        !Number.isFinite(payload.voice) ||
        !Number.isFinite(payload.video) ||
        payload.chat < 0 ||
        payload.voice < 0 ||
        payload.video < 0
      ) {
        setFeedback({ kind: 'err', msg: 'Informe valores numéricos válidos (≥ 0).' })
        setSaving(false)
        return
      }
      await adminClient().patch('/admin/pricing', payload)
      setFeedback({ kind: 'ok', msg: 'Preços atualizados com sucesso.' })
      load()
    } catch (e: any) {
      setFeedback({
        kind: 'err',
        msg: e?.response?.data?.message || 'Erro ao salvar preços.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl text-white">Preços por minuto</h1>
        <p className="text-sm text-ink-300 mt-1">
          Valores cobrados do cliente por minuto de atendimento. A comissão
          repassada ao consultor é configurada por consultor (não aqui).
        </p>
      </header>

      <Card className="p-6">
        {loading ? (
          <p className="text-ink-200">Carregando…</p>
        ) : (
          <form onSubmit={save} className="space-y-5">
            <PriceField
              label="Chat (texto)"
              hint="Tipo padrão atual da plataforma."
              value={chat}
              onChange={setChat}
            />
            <PriceField
              label="Voz (áudio)"
              hint="Será habilitado quando a Fase 3 do WebRTC for liberada."
              value={voice}
              onChange={setVoice}
            />
            <PriceField
              label="Vídeo"
              hint="Será habilitado quando a Fase 5 do WebRTC for liberada."
              value={video}
              onChange={setVideo}
            />

            {feedback && (
              <p
                className={
                  feedback.kind === 'ok'
                    ? 'text-emerald-300 text-sm'
                    : 'text-red-300 text-sm'
                }
              >
                {feedback.msg}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar preços'}
              </Button>
              {data && (
                <p className="text-xs text-ink-300">
                  Atual: chat R$ {data.chat.toFixed(2)} · voz R$ {data.voice.toFixed(2)} · vídeo R$ {data.video.toFixed(2)}
                </p>
              )}
            </div>

            <p className="text-xs text-ink-400 pt-3 border-t border-white/[0.06]">
              Mudanças só afetam atendimentos <strong>iniciadas após o salvamento</strong>.
              Atendimentos em andamento continuam com o preço congelado no início.
            </p>
          </form>
        )}
      </Card>
    </div>
  )
}

function PriceField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm text-white mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <span className="text-ink-200 text-sm">R$</span>
        <Input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-32"
        />
        <span className="text-ink-300 text-sm">/ min</span>
      </div>
      {hint && <p className="text-xs text-ink-400 mt-1">{hint}</p>}
    </div>
  )
}
